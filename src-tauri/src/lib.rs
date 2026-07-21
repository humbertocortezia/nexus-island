use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    Emitter, Manager, State,
};
use tokio::sync::{broadcast, Mutex};

mod websocket;

const WS_PORT: u16 = 19876;

// ─── Tipos ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Idle,
    Running,
    WaitingApproval,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub input: String,
    pub description: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub tool_calls: Vec<ToolCall>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub agent: String,
    pub project: String,
    pub summary: String,
    pub status: SessionStatus,
    pub progress_text: String,
    pub last_message: String,
    pub messages: Vec<Message>,
    pub pending_approval: Option<ToolCall>,
    pub created_at: String,
    pub updated_at: String,
    pub has_unread: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub session_id: String,
    pub agent: String,
    pub timestamp: String,
    #[serde(default)]
    pub project: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub progress_text: Option<String>,
    #[serde(default)]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub tool_input: Option<String>,
    #[serde(default)]
    pub tool_description: Option<String>,
    #[serde(default)]
    pub approval_id: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub result: Option<TaskResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub success: bool,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum Theme {
    Dark,
    Gold,
    Black,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IslandState {
    pub sessions: Vec<Session>,
    pub theme: Theme,
}

// ─── AppState ─────────────────────────────────────────────────────────────────

pub struct AppState {
    pub island: Mutex<IslandState>,
    pub event_tx: broadcast::Sender<AgentEvent>,
    pub current_theme: Mutex<Theme>,
}

// ─── Comandos Tauri ───────────────────────────────────────────────────────────

#[tauri::command]
async fn get_state(state: State<'_, AppState>) -> Result<IslandState, String> {
    Ok(state.island.lock().await.clone())
}

#[tauri::command]
async fn set_theme(
    state: State<'_, AppState>,
    theme: Theme,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut current = state.current_theme.lock().await;
    *current = theme.clone();
    state.island.lock().await.theme = theme;
    let _ = app.emit("theme-changed", &*current);
    Ok(())
}

#[tauri::command]
async fn approve_action(
    state: State<'_, AppState>,
    session_id: String,
    approval_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut island = state.island.lock().await;
    if let Some(session) = island.sessions.iter_mut().find(|s| s.id == session_id) {
        if let Some(ref mut tc) = session.pending_approval {
            if tc.id == approval_id {
                tc.status = "approved".into();
            }
        }
        session.status = SessionStatus::Running;
        session.has_unread = false;
    }
    let _ = app.emit("state-changed", serde_json::json!({}));
    Ok(())
}

#[tauri::command]
async fn deny_action(
    state: State<'_, AppState>,
    session_id: String,
    approval_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut island = state.island.lock().await;
    if let Some(session) = island.sessions.iter_mut().find(|s| s.id == session_id) {
        if let Some(ref mut tc) = session.pending_approval {
            if tc.id == approval_id {
                tc.status = "denied".into();
            }
        }
        session.status = SessionStatus::Completed;
    }
    let _ = app.emit("state-changed", serde_json::json!({}));
    Ok(())
}

#[tauri::command]
async fn archive_session(
    state: State<'_, AppState>,
    session_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut island = state.island.lock().await;
    island.sessions.retain(|s| s.id != session_id);
    let _ = app.emit("state-changed", serde_json::json!({}));
    Ok(())
}

#[tauri::command]
async fn mark_read(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    let mut island = state.island.lock().await;
    if let Some(session) = island.sessions.iter_mut().find(|s| s.id == session_id) {
        session.has_unread = false;
    }
    Ok(())
}

#[tauri::command]
async fn get_ws_port() -> Result<u16, String> {
    Ok(WS_PORT)
}

#[tauri::command]
async fn toggle_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("island-panel") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
        }
    }
    Ok(())
}

// ─── System Tray ──────────────────────────────────────────────────────────────

fn build_tray_menu(
    app: &tauri::AppHandle,
) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let toggle = MenuItemBuilder::with_id("toggle", "Mostrar/Ocultar")
        .build(app)?;
    let theme_dark = MenuItemBuilder::with_id("theme-dark", "Tema Dark")
        .build(app)?;
    let theme_gold = MenuItemBuilder::with_id("theme-gold", "Tema Gold")
        .build(app)?;
    let theme_black = MenuItemBuilder::with_id("theme-black", "Tema Black")
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Sair")
        .build(app)?;

    MenuBuilder::new(app)
        .item(&toggle)
        .separator()
        .item(&theme_dark)
        .item(&theme_gold)
        .item(&theme_black)
        .separator()
        .item(&quit)
        .build()
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let ws_port = WS_PORT;

            let (event_tx, _) = broadcast::channel::<AgentEvent>(256);
            let app_state = AppState {
                island: Mutex::new(IslandState {
                    sessions: Vec::new(),
                    theme: Theme::Dark,
                }),
                event_tx: event_tx.clone(),
                current_theme: Mutex::new(Theme::Dark),
            };

            app.manage(app_state);

            // WebSocket server
            let app_handle = app.handle().clone();
            let tx = event_tx.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async move {
                    info!("WebSocket server iniciado em ws://127.0.0.1:{}", ws_port);
                    if let Err(e) = websocket::start_server(ws_port, tx, app_handle).await {
                        error!("Falha no servidor WebSocket: {}", e);
                    }
                });
            });

            // System tray
            let tray_menu = build_tray_menu(app.handle())?;
            let _ = app
                .tray_by_id("cortezia-tray")
                .map(|tray| {
                    let _ = tray.set_menu(Some(tray_menu));
                    tray
                })
                .or_else(|| {
                    warn!("Ícone da bandeja não configurado");
                    None
                });

            app.on_menu_event(|app, event| {
                match event.id().as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("island-panel") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                            }
                        }
                    }
                    "theme-dark" => {
                        let _ = app.emit("theme-changed", Theme::Dark);
                    }
                    "theme-gold" => {
                        let _ = app.emit("theme-changed", Theme::Gold);
                    }
                    "theme-black" => {
                        let _ = app.emit("theme-changed", Theme::Black);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                }
            });

            info!("CortezIA Island v0.2.0 iniciado");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_theme,
            approve_action,
            deny_action,
            archive_session,
            mark_read,
            get_ws_port,
            toggle_window,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao executar CortezIA Island");
}
