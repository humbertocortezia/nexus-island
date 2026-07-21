#!/usr/bin/env node

/**
 * Nexus Island v0.2 — AI Agent Hook (Multi-session)
 * ======================================================
 *
 * Envia eventos de agentes de IA para o Nexus Island via WebSocket.
 * Agora suporta múltiplas sessões paralelas com sistema de aprovação.
 *
 * Uso:
 *   node scripts/ai-hook.js
 *   node scripts/ai-hook.js --agent cursor --project "meu-app"
 */

const WS_URL = "ws://127.0.0.1:19876";
const AGENT = process.env.NEXUS_AGENT || "opencode";
const PROJECT = process.env.NEXUS_PROJECT || "";

let ws = null;
let reconnectTimer = null;
let messageQueue = [];

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.error(`[nexus] Conectado em ${WS_URL}`);
    while (messageQueue.length > 0) {
      ws.send(JSON.stringify(messageQueue.shift()));
    }
  };

  ws.onclose = () => {
    console.error("[nexus] Desconectado. Reconectando em 3s...");
    ws = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = (err) => {
    console.error(`[nexus] Erro: ${err.message}`);
  };
}

function send(event) {
  const payload = {
    ...event,
    agent: event.agent || AGENT,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  } else {
    messageQueue.push(payload);
  }
}

function generateId(prefix = "session") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const nexus = {
  connect,

  /** Inicia uma nova sessão de agente */
  sessionStart(sessionId, summary, project) {
    send({
      type: "session_start",
      session_id: sessionId || generateId(),
      summary: summary || "Nova tarefa",
      project: project || PROJECT,
    });
  },

  /** Atualiza status de uma sessão */
  sessionUpdate(sessionId, status, progressText) {
    send({
      type: "session_update",
      session_id: sessionId,
      status: status || "running",
      progress_text: progressText || "",
    });
  },

  /** Agente quer executar uma ferramenta — pede aprovação */
  toolCall(sessionId, toolName, toolInput, description) {
    send({
      type: "tool_call",
      session_id: sessionId,
      tool_name: toolName,
      tool_input: typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput, null, 2),
      tool_description: description || "",
      approval_id: generateId("approval"),
    });
  },

  /** Envia mensagem do agente (markdown) */
  message(sessionId, content) {
    send({
      type: "agent_message",
      session_id: sessionId,
      content: content,
    });
  },

  /** Finaliza uma sessão */
  sessionEnd(sessionId, success, error) {
    send({
      type: "session_end",
      session_id: sessionId,
      result: {
        success: success !== false,
        error: error || undefined,
      },
    });
  },

  generateId,
};

// ─── CLI Demo ─────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.includes("ai-hook");

if (isMain) {
  connect();

  const sid = generateId("demo");
  console.error(`[nexus] Demo iniciada. Session: ${sid}`);
  console.error("[nexus] Pressione Ctrl+C para sair.");

  setTimeout(() => nexus.sessionStart(sid, "Analisando estrutura do projeto", "nexus-island"), 500);
  setTimeout(() => nexus.sessionUpdate(sid, "running", "Lendo diretórios..."), 1500);
  setTimeout(() => nexus.message(sid, "## Análise Inicial\n\nO projeto usa **Tauri 2 + React 19** com as seguintes características:\n\n1. **Backend Rust** com WebSocket server\n2. **Frontend React** com Framer Motion\n3. Sistema de aprovação human-in-the-loop\n\n```rust\npub struct AppState {\n    pub island: Mutex<IslandState>,\n    pub event_tx: broadcast::Sender<AgentEvent>,\n}\n```"), 2500);
  setTimeout(() => nexus.toolCall(sid, "Write", "src/main.rs\n+ fn new_feature() {\n+   println!(\"implemented\");\n+ }", "Adicionar nova feature ao módulo principal"), 4000);
  setTimeout(() => nexus.sessionUpdate(sid, "waiting_approval", "Aguardando aprovação para escrever arquivo..."), 4500);

  process.stdin.resume();
}

export default nexus;
