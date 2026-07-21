#!/usr/bin/env node
/**
 * CortezIA Island — Cursor Integration v0.2
 *
 * Uso:
 *   node scripts/cursor-hook.mjs start "Refatorando auth" meu-projeto
 *   node scripts/cursor-hook.mjs message "sid" "## Resultado..."
 *   node scripts/cursor-hook.mjs tool "sid" "Write" '{"path":"src/main.rs"}' "Descrição"
 *   node scripts/cursor-hook.mjs end "sid" true
 */
import cortezia from "./ai-hook.js";

const cmd = process.argv[2] || "demo";
cortezia.connect();

const waitAndExit = () => setTimeout(() => process.exit(0), 500);

switch (cmd) {
  case "start": {
    const sid = process.argv[3] || cortezia.generateId("cursor");
    cortezia.sessionStart(sid, process.argv[4] || "Nova tarefa", process.argv[5]);
    waitAndExit();
    break;
  }
  case "update":
    cortezia.sessionUpdate(process.argv[3], process.argv[4] || "running", process.argv[5]);
    waitAndExit();
    break;
  case "message":
    cortezia.message(process.argv[3], process.argv.slice(4).join(" "));
    waitAndExit();
    break;
  case "tool":
    cortezia.toolCall(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
    waitAndExit();
    break;
  case "end":
    cortezia.sessionEnd(process.argv[3], process.argv[4] !== "false", process.argv[5]);
    waitAndExit();
    break;
  case "demo":
  default: {
    const sid = cortezia.generateId("cursor-demo");
    console.error(`[cortezia-cursor] Demo: ${sid}`);
    setTimeout(() => cortezia.sessionStart(sid, "Refatorando módulo de autenticação", "cortezia-island"), 300);
    setTimeout(() => cortezia.message(sid, "## Análise\n\nO módulo atual tem **3 problemas**:\n\n1. Tokens sem expiração\n2. Falta refresh token\n3. Middleware não cobre todas as rotas\n\n```typescript\n// auth.ts atual\napp.use('/api', authMiddleware);\n// Falta: /admin, /webhook\n```"), 1000);
    setTimeout(() => cortezia.toolCall(sid, "Write", "src/middleware/auth.ts", "Corrigir middleware de autenticação"), 2000);
    setTimeout(() => cortezia.sessionUpdate(sid, "waiting_approval", "Aguardando aprovação..."), 2500);
    process.stdin.resume();
  }
}
