#!/usr/bin/env node
/**
 * CortezIA Island — OpenCode Integration v0.2
 */
import cortezia from "./ai-hook.js";

cortezia.connect();

let inputData = "";
process.stdin.on("data", (chunk) => { inputData += chunk.toString(); });

process.stdin.on("end", () => {
  try {
    const ctx = JSON.parse(inputData || "{}");
    const sid = ctx.session_id || cortezia.generateId("opencode");

    if (ctx.action === "task_start") {
      cortezia.sessionStart(sid, ctx.summary, ctx.project);
    } else if (ctx.action === "task_complete") {
      cortezia.sessionEnd(sid, !ctx.error, ctx.error);
    } else if (ctx.action === "tool_call") {
      cortezia.toolCall(sid, ctx.tool_name, ctx.tool_input, ctx.description);
    } else if (ctx.action === "message") {
      cortezia.message(sid, ctx.content);
    } else {
      cortezia.sessionUpdate(sid, ctx.status || "running", ctx.progress_text);
    }
  } catch {
    cortezia.sessionUpdate(cortezia.generateId("opencode"), "running");
  }

  setTimeout(() => process.exit(0), 500);
});

setTimeout(() => process.exit(0), 10000);
