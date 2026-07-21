use futures_util::{SinkExt, StreamExt};
use log::{error, info};
use tauri::{AppHandle, Emitter, Manager};
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

use crate::{AgentEvent, AppState, Session, SessionStatus, ToolCall};

pub async fn start_server(
    port: u16,
    event_tx: broadcast::Sender<AgentEvent>,
    app_handle: AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).await?;
    info!("WebSocket server iniciado em ws://{}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, peer_addr)) => {
                info!("Nova conexão WebSocket de {}", peer_addr);
                let tx = event_tx.clone();
                let app = app_handle.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_connection(stream, tx, app).await {
                        error!("Erro na conexão WebSocket {}: {}", peer_addr, e);
                    }
                    info!("Conexão WebSocket encerrada: {}", peer_addr);
                });
            }
            Err(e) => {
                error!("Erro ao aceitar conexão: {}", e);
            }
        }
    }
}

async fn handle_connection(
    stream: tokio::net::TcpStream,
    event_tx: broadcast::Sender<AgentEvent>,
    app_handle: AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    let welcome = serde_json::json!({
        "status": "connected",
        "server": "CortezIA Island",
        "version": "0.2.0"
    });
    let _ = write.send(Message::Text(welcome.to_string().into())).await;

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                let text_str = text.to_string();
                match serde_json::from_str::<AgentEvent>(&text_str) {
                    Ok(event) => {
                        info!("Evento recebido: {:?}", event);

                        let _ = event_tx.send(event.clone());

                        if let Err(e) = app_handle.emit("agent-event", &event) {
                            error!("Falha ao emitir evento Tauri: {}", e);
                        }

                        if let Some(state) = app_handle.try_state::<AppState>() {
                            let mut island = state.island.lock().await;
                            update_island_state(&mut island, &event);
                        }

                        let ack = serde_json::json!({"status": "ok", "received": true});
                        let _ = write.send(Message::Text(ack.to_string().into())).await;
                    }
                    Err(_) => {
                        // Tenta desserializar como UserResponse (aprovação)
                        #[derive(serde::Deserialize)]
                        struct UserResponse {
                            #[serde(rename = "type")]
                            _type: String,
                            session_id: String,
                            approval_id: String,
                            action: String,
                        }

                        if let Ok(resp) = serde_json::from_str::<UserResponse>(&text_str) {
                            if resp._type == "approval_response" {
                                info!(
                                    "Resposta de aprovação: {} {} {}",
                                    resp.session_id, resp.approval_id, resp.action
                                );

                                if let Some(state) = app_handle.try_state::<AppState>() {
                                    let mut island = state.island.lock().await;
                                    if let Some(session) = island
                                        .sessions
                                        .iter_mut()
                                        .find(|s| s.id == resp.session_id)
                                    {
                                        if let Some(ref mut tc) = session.pending_approval {
                                            if tc.id == resp.approval_id {
                                                tc.status = match resp.action.as_str() {
                                                    "allow" => "approved".into(),
                                                    _ => "denied".into(),
                                                };
                                            }
                                        }
                                        session.status = SessionStatus::Completed;
                                    }
                                }

                                // Re-emite o estado atualizado para o frontend
                                let _ = app_handle.emit(
                                    "state-changed",
                                    serde_json::json!({"session_id": resp.session_id}),
                                );
                            }
                        }

                        let ack = serde_json::json!({"status": "ok"});
                        let _ = write.send(Message::Text(ack.to_string().into())).await;
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Ok(Message::Ping(data)) => {
                let _ = write.send(Message::Pong(data)).await;
            }
            Ok(_) => {}
            Err(e) => {
                error!("Erro WebSocket: {}", e);
                break;
            }
        }
    }

    Ok(())
}

fn update_island_state(island: &mut crate::IslandState, event: &AgentEvent) {
    match event.event_type.as_str() {
        "session_start" => {
            let session = Session {
                id: event.session_id.clone(),
                agent: event.agent.clone(),
                project: event.project.clone().unwrap_or_default(),
                summary: event.summary.clone().unwrap_or_else(|| "Nova tarefa".into()),
                status: SessionStatus::Running,
                progress_text: "Iniciando...".into(),
                last_message: String::new(),
                messages: Vec::new(),
                pending_approval: None,
                created_at: event.timestamp.clone(),
                updated_at: event.timestamp.clone(),
                has_unread: true,
            };
            island.sessions.push(session);
        }
        "session_update" => {
            if let Some(session) = island.sessions.iter_mut().find(|s| s.id == event.session_id) {
                if let Some(ref status) = event.status {
                    session.status = match status.as_str() {
                        "running" => SessionStatus::Running,
                        "waiting_approval" => SessionStatus::WaitingApproval,
                        "completed" => SessionStatus::Completed,
                        _ => SessionStatus::Idle,
                    };
                }
                if let Some(ref text) = event.progress_text {
                    session.progress_text = text.clone();
                }
                session.updated_at = event.timestamp.clone();
            }
        }
        "tool_call" => {
            if let Some(session) = island.sessions.iter_mut().find(|s| s.id == event.session_id) {
                session.status = SessionStatus::WaitingApproval;
                session.pending_approval = Some(ToolCall {
                    id: event.approval_id.clone().unwrap_or_default(),
                    name: event.tool_name.clone().unwrap_or_default(),
                    input: event.tool_input.clone().unwrap_or_default(),
                    description: event.tool_description.clone().unwrap_or_default(),
                    status: "pending".into(),
                });
                session.updated_at = event.timestamp.clone();
                session.has_unread = true;
            }
        }
        "agent_message" => {
            if let Some(session) = island.sessions.iter_mut().find(|s| s.id == event.session_id) {
                let content = event.content.clone().unwrap_or_default();
                session.last_message = content.chars().take(200).collect();
                session.messages.push(crate::Message {
                    id: uuid_v4(),
                    role: "agent".into(),
                    content,
                    timestamp: event.timestamp.clone(),
                    tool_calls: Vec::new(),
                });
                session.updated_at = event.timestamp.clone();

                // Mantém últimas 50 mensagens
                if session.messages.len() > 50 {
                    session.messages.remove(0);
                }
            }
        }
        "session_end" => {
            if let Some(session) = island.sessions.iter_mut().find(|s| s.id == event.session_id) {
                session.status = SessionStatus::Completed;
                session.updated_at = event.timestamp.clone();
                session.has_unread = true;

                if let Some(ref result) = event.result {
                    if let Some(ref error) = result.error {
                        session.progress_text = format!("Erro: {}", error);
                    } else {
                        session.progress_text = "Concluído".into();
                    }
                }
            }
        }
        _ => {}
    }

    // Mantém últimas 100 sessões no máximo
    if island.sessions.len() > 100 {
        island.sessions.remove(0);
    }
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("msg_{:x}", ts)
}
