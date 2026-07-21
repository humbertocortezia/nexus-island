# CortezIA Island

**Mission Control para agentes de IA** — painel flutuante que orquestra múltiplas sessões paralelas de coding agents (OpenCode, Cursor, Claude Code) com sistema human-in-the-loop.

> Tauri 2 + Rust + React 19. Windows 11 & Linux.

---

## Funcionalidades (v0.2)

- **Painel multi-sessão**: lista vertical de agentes rodando em paralelo
- **Status por sessão**: 🟢 rodando / 🟠 aguardando aprovação / ⚪ idle/concluído
- **Human-in-the-loop**: botões **Allow** / **Deny** antes do agente executar ações sensíveis
- **Detalhe da tarefa**: raciocínio markdown, blocos de código com syntax highlighting (Prism), cards de tool call
- **Ações rápidas**: abrir, arquivar, revisar (bolinha azul = não lido)
- **3 temas**: Dark, Gold, Black com efeito glass + blur
- **System tray**: painel inicia escondido — clique direito no ícone → "Mostrar/Ocultar" para abrir/fechar, trocar tema, sair
- **WebSocket bidirecional**: recebe eventos e envia respostas de aprovação

---

## Instalação

```bash
# Setup automático
chmod +x setup.sh
./setup.sh

# Ou manual
pnpm install
cargo install tauri-cli --version "^2"
```

### Pré-requisitos

- Rust 1.80+
- Node.js 18+
- pnpm 8+
- Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev`

---

## Rodar

```bash
pnpm tauri dev        # Dev com hot reload
pnpm tauri build       # Build produção
```

## Testar

```bash
# Terminal 1
pnpm tauri dev

# Terminal 2 — demo de sessão com tool call e aprovação
node scripts/cursor-hook.mjs demo
```

---

## Integração

### Schema de eventos (JSON via WebSocket em `ws://127.0.0.1:19876`)

```json
// Iniciar sessão
{"type":"session_start","session_id":"s1","agent":"cursor","summary":"Refatorar auth","timestamp":"..."}

// Enviar mensagem markdown
{"type":"agent_message","session_id":"s1","content":"## Análise\nO módulo tem **3 problemas**..."}

// Pedir aprovação
{"type":"tool_call","session_id":"s1","tool_name":"Write","tool_input":"...","approval_id":"a1"}

// Finalizar
{"type":"session_end","session_id":"s1","result":{"success":true}}
```

### OpenCode

```bash
echo '{"action":"task_start","summary":"Analisando"}' | node scripts/opencode-hook.mjs
```

### Cursor

```bash
node scripts/cursor-hook.mjs start "Minha tarefa" meu-projeto
node scripts/cursor-hook.mjs message "sid" "## Resultado..."
node scripts/cursor-hook.mjs tool "sid" "Write" '{"path":"src/main.rs"}' "Descrição"
node scripts/cursor-hook.mjs end "sid" true
```

### Claude Code

```bash
CORTEZIA_AGENT=claude node scripts/ai-hook.js
```

---

## Estrutura

```
cortezia-island/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # 8 comandos, estado multi-sessão, tray
│   │   └── websocket.rs    # WS server + UserResponse handler
│   └── tauri.conf.json     # Janela 440x580, sempre no topo
├── src/                    # React frontend
│   ├── components/
│   │   ├── Panel.tsx       # Container glass
│   │   ├── SessionList.tsx # Lista de sessões
│   │   ├── SessionRow.tsx  # Linha com status + Allow/Deny
│   │   ├── SessionDetail.tsx # Detalhe markdown + código
│   │   └── ToolCall.tsx    # Card de tool call
│   └── hooks/
│       └── useWebSocket.ts # WS client + Tauri events
├── scripts/
│   ├── ai-hook.js          # Hook universal (módulo + CLI)
│   ├── opencode-hook.mjs   # Integração OpenCode
│   └── cursor-hook.mjs     # Integração Cursor
├── AGENTS.md               # Guia para modelos/agentes
└── setup.sh                # Instalação automatizada
```

---

## Licença

MIT — Humberto Cortez, 2025.
