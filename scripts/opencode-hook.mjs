#!/usr/bin/env node
/**
 * Nexus Island — OpenCode Integration v0.2
 */
import nexus from "./ai-hook.js";

nexus.connect();

let inputData = "";
process.stdin.on("data", (chunk) => { inputData += chunk.toString(); });

process.stdin.on("end", () => {
  try {
    const ctx = JSON.parse(inputData || "{}");
    const sid = ctx.session_id || nexus.generateId("opencode");

    if (ctx.action === "task_start") {
      nexus.sessionStart(sid, ctx.summary, ctx.project);
    } else if (ctx.action === "task_complete") {
      nexus.sessionEnd(sid, !ctx.error, ctx.error);
    } else if (ctx.action === "tool_call") {
      nexus.toolCall(sid, ctx.tool_name, ctx.tool_input, ctx.description);
    } else if (ctx.action === "message") {
      nexus.message(sid, ctx.content);
    } else {
      nexus.sessionUpdate(sid, ctx.status || "running", ctx.progress_text);
    }
  } catch {
    nexus.sessionUpdate(nexus.generateId("opencode"), "running");
  }

  setTimeout(() => process.exit(0), 500);
});

setTimeout(() => process.exit(0), 10000);
