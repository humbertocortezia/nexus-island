# AGENTS.md — CortezIA Island v0.2

> Guia para qualquer modelo/agente (OpenCode, Cursor, Claude Code) que for mexer neste projeto.

---

## Visão do Produto

**CortezIA Island** é um **orquestrador de agentes de IA para desktop** — um painel
flutuante estilo Raycast que mostra múltiplas sessões paralelas de coding agents
(Claude Code, Cursor Agent, OpenCode) em um só lugar.

### O que faz:
- Lista vertical de sessões ativas/pendentes/concluídas
- Cada sessão tem: indicador de status (🟢 rodando / 🟠 aguardando / ⚪ idle), título, última mensagem
- Sistema **human-in-the-loop**: botões Allow/Deny para aprovar ações sensíveis
- Detalhe da tarefa: raciocínio markdown, blocos de código com syntax highlighting, cards de tool call
- Ações rápidas: abrir chat, arquivar, revisar

### O que NÃO é:
- Não é uma pill animada estilo Dynamic Island do iPhone
- Não é um widget que expande no hover
- É um painel persistente **que inicia escondido**, toggleável via ícone na bandeja do sistema (clique direito → Mostrar/Ocultar)

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│  Agentes externos (N sessões paralelas)          │
│  OpenCode | Cursor | Claude Code                 │
│  Enviam JSON via WebSocket ws://127.0.0.1:19876  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│  Rust Backend (src-tauri/)                       │
│  ├── websocket.rs   WS server async              │
│  │   Recebe session_start/update/tool_call/      │
│  │   agent_message/session_end                   │
│  │   E responde approval_response (bidirecional) │
│  └── lib.rs         AppState + comandos          │
│                     8 comandos Tauri              │
└──────────────────┬──────────────────────────────┘
                   │ Tauri Events
┌──────────────────▼──────────────────────────────┐
│  React Frontend (src/)                           │
│  ├── Panel.tsx          Container glass          │
│  ├── SessionList.tsx    Lista de sessões         │
│  ├── SessionRow.tsx     Linha individual         │
│  │   status + resumo + Allow/Deny buttons        │
│  ├── SessionDetail.tsx  Visão expandida          │
│  │   react-markdown + Prism syntax highlighting  │
│  └── ToolCall.tsx       Card de tool call        │
└─────────────────────────────────────────────────┘
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Tauri 2 |
| Backend | Rust (tokio, tungstenite, serde) |
| Frontend | React 19 + TypeScript + Vite |
| Estilos | TailwindCSS + CSS custom properties |
| Markdown | react-markdown + react-syntax-highlighter (Prism) |
| Animações | Framer Motion |
| Comunicação | WebSocket bidirecional + Tauri events |

---

## Estrutura

```
cortezia-island/
├── AGENTS.md
├── README.md
├── setup.sh
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Janela 440x580, top-right, toggle via tray
│   ├── capabilities/default.json
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── lib.rs               # 8 comandos: approve/deny/archive/mark_read/toggle
│       └── websocket.rs         # WS server + UserResponse handler
├── src/
│   ├── main.tsx / App.tsx
│   ├── index.css                # 3 temas, markdown styles
│   ├── components/
│   │   ├── Panel.tsx            # Container principal
│   │   ├── SessionList.tsx      # Lista de sessões
│   │   ├── SessionRow.tsx       # Linha (status + ações)
│   │   ├── SessionDetail.tsx    # Detalhe expandido
│   │   └── ToolCall.tsx         # Card Allow/Deny
│   ├── hooks/
│   │   └── useWebSocket.ts      # WS + Tauri events
│   └── lib/
│       └── types.ts             # AgentEvent, Session, ToolCall, etc.
├── scripts/
│   ├── ai-hook.js               # Hook universal (CLI + módulo)
│   ├── opencode-hook.mjs        # Integração OpenCode
│   └── cursor-hook.mjs          # Integração Cursor (demo inclusa)
└── package.json / vite.config.ts / tailwind.config.js
```

---

## Schema de Eventos (WebSocket JSON)

### Tipos de eventos (agente → ilha)

```typescript
type AgentEvent = {
  type: "session_start" | "session_update" | "tool_call" 
      | "agent_message" | "session_end";
  session_id: string;
  agent: string;
  timestamp: string;
  // session_start
  project?: string;
  summary?: string;
  // session_update
  status?: "idle" | "running" | "waiting_approval" | "completed";
  progress_text?: string;
  // tool_call
  tool_name?: string;
  tool_input?: string;
  tool_description?: string;
  approval_id?: string;
  // agent_message
  content?: string;          // Markdown
  // session_end
  result?: { success: boolean; error?: string };
};
```

### Resposta de aprovação (ilha → agente)

```json
{
  "type": "approval_response",
  "session_id": "...",
  "approval_id": "...",
  "action": "allow" | "deny"
}
```

### Exemplo de fluxo completo

```bash
# 1. Agente inicia sessão
{"type":"session_start","session_id":"s1","agent":"cursor","summary":"Refatorar auth","project":"meu-app","timestamp":"..."}

# 2. Agente manda análise markdown
{"type":"agent_message","session_id":"s1","agent":"cursor","content":"## Análise\n\nO módulo tem **3 problemas**...\n\n```ts\n// code\n```","timestamp":"..."}

# 3. Agente pede aprovação pra escrever
{"type":"tool_call","session_id":"s1","agent":"cursor","tool_name":"Write","tool_input":"src/auth.ts\n+ ...","tool_description":"Adicionar refresh token","approval_id":"a1","timestamp":"..."}

# 4. Usuário clica Allow → ilha envia de volta
{"type":"approval_response","session_id":"s1","approval_id":"a1","action":"allow"}

# 5. Agente finaliza
{"type":"session_end","session_id":"s1","agent":"cursor","result":{"success":true},"timestamp":"..."}
```

---

## Comandos Tauri

| Comando | Descrição |
|---------|-----------|
| `get_state` | Retorna `IslandState` com todas as sessões |
| `set_theme` | Define tema (dark/gold/black) |
| `approve_action` | Aprova tool call (session_id + approval_id) |
| `deny_action` | Rejeita tool call |
| `archive_session` | Remove sessão da lista |
| `mark_read` | Marca sessão como lida (tira bolinha azul) |
| `get_ws_port` | Retorna 19876 |
| `toggle_window` | Mostra/oculta painel |

---

## Estados de Sessão

| Status | Ícone | Significado |
|--------|-------|-------------|
| `running` | 🟢 verde glow | Agente executando ativamente |
| `waiting_approval` | 🟠 laranja piscando | Precisa de Allow/Deny |
| `idle` | ⚪ cinza | Agente conectado mas parado |
| `completed` | ⚪ cinza | Tarefa finalizada |

---

## Posicionamento

- Canto **superior direito** do monitor primário (estilo menu bar flutuante)
- 16px da borda direita, 40px do topo
- Calculado via `primaryMonitor()` do `@tauri-apps/api/window` no mount do React

---

## Como Rodar

```bash
./setup.sh          # Instala dependências (Rust, pnpm, ícone)
pnpm tauri dev      # Dev com hot reload
pnpm tauri build    # Build produção
```

## Como Testar

```bash
# Terminal 1
pnpm tauri dev

# Terminal 2 — demo multi-sessão
node scripts/cursor-hook.mjs demo
```

---

## Regras para Alterações

1. **Nunca mude a porta 19876** sem atualizar hooks, README e AGENTS.md
2. **Mantenha `focus: false`** — o painel não deve roubar foco
3. **Eventos Tauri preferidos a polling** — use `listen("agent-event")` e `listen("state-changed")`
4. **Estado Rust sempre via `Mutex<IslandState>`**
5. **Temas via CSS custom properties** — 3 temas, `data-theme` no `<html>`
6. **Markdown seguro** — `react-markdown` sem plugins de HTML cru
7. **Tool calls são imutáveis após approve/deny** — não reabrir
8. **Máximo 100 sessões** — limpeza automática no Rust

---

## Problemas Conhecidos

- **WSLg**: posicionamento e blur inconsistentes. Testar em Linux nativo.
- **GTK warning**: `gtk_widget_get_scale_factor` — inofensivo, bug do WebKitGTK
- **Chunk size warning**: o syntax highlighter (Prism) é ~400KB gzip. Aceitável para desktop.
