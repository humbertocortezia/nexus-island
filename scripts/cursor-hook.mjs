#!/usr/bin/env node
/**
 * Nexus Island — Cursor Integration v0.2
 *
 * Uso:
 *   node scripts/cursor-hook.mjs start "Refatorando auth" meu-projeto
 *   node scripts/cursor-hook.mjs message "sid" "## Resultado..."
 *   node scripts/cursor-hook.mjs tool "sid" "Write" '{"path":"src/main.rs"}' "Descrição"
 *   node scripts/cursor-hook.mjs end "sid" true
 */
import nexus from "./ai-hook.js";

const cmd = process.argv[2] || "demo";
nexus.connect();

const waitAndExit = () => setTimeout(() => process.exit(0), 500);

switch (cmd) {
  case "start": {
    const sid = process.argv[3] || nexus.generateId("cursor");
    nexus.sessionStart(sid, process.argv[4] || "Nova tarefa", process.argv[5]);
    waitAndExit();
    break;
  }
  case "update":
    nexus.sessionUpdate(process.argv[3], process.argv[4] || "running", process.argv[5]);
    waitAndExit();
    break;
  case "message":
    nexus.message(process.argv[3], process.argv.slice(4).join(" "));
    waitAndExit();
    break;
  case "tool":
    nexus.toolCall(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
    waitAndExit();
    break;
  case "end":
    nexus.sessionEnd(process.argv[3], process.argv[4] !== "false", process.argv[5]);
    waitAndExit();
    break;
  case "demo":
  default: {
    const sid = nexus.generateId("cursor-demo");
    console.error(`[nexus-cursor] Demo: ${sid}`);
    setTimeout(() => nexus.sessionStart(sid, "Refatorando módulo de autenticação", "nexus-island"), 300);
    setTimeout(() => nexus.message(sid, "## Análise\n\nO módulo atual tem **3 problemas**:\n\n1. Tokens sem expiração\n2. Falta refresh token\n3. Middleware não cobre todas as rotas\n\n```typescript\n// auth.ts atual\napp.use('/api', authMiddleware);\n// Falta: /admin, /webhook\n```"), 1000);
    setTimeout(() => nexus.toolCall(sid, "Write", "src/middleware/auth.ts", "Corrigir middleware de autenticação"), 2000);
    setTimeout(() => nexus.sessionUpdate(sid, "waiting_approval", "Aguardando aprovação..."), 2500);
    process.stdin.resume();
  }
}
