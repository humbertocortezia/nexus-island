import React from "react";
import { motion } from "framer-motion";
import { ToolCall as ToolCallType } from "../lib/types";

interface ToolCallProps {
  toolCall: ToolCallType;
  sessionId: string;
  onApprove: (sessionId: string, approvalId: string) => void;
  onDeny: (sessionId: string, approvalId: string) => void;
  expanded?: boolean;
}

const ToolCall: React.FC<ToolCallProps> = ({
  toolCall,
  sessionId,
  onApprove,
  onDeny,
  expanded = false,
}) => {
  const isPending = toolCall.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden mt-2"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid var(--panel-border)",
      }}
    >
      {/* Tool header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              backgroundColor:
                toolCall.status === "approved"
                  ? "rgba(48,209,88,0.15)"
                  : toolCall.status === "denied"
                    ? "rgba(255,69,58,0.15)"
                    : "rgba(255,159,10,0.15)",
              color:
                toolCall.status === "approved"
                  ? "var(--success)"
                  : toolCall.status === "denied"
                    ? "var(--error)"
                    : "var(--warning)",
            }}
          >
            {toolCall.name}
          </span>
          {isPending && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-[10px]"
              style={{ color: "var(--warning)" }}
            >
              Waiting for approval...
            </motion.span>
          )}
          {toolCall.status === "approved" && (
            <span className="text-[10px]" style={{ color: "var(--success)" }}>
              Approved
            </span>
          )}
          {toolCall.status === "denied" && (
            <span className="text-[10px]" style={{ color: "var(--error)" }}>
              Denied
            </span>
          )}
        </div>
      </div>

      {/* Tool content */}
      {(expanded || toolCall.description) && (
        <div className="px-3 pb-2">
          {toolCall.description && (
            <p
              className="text-[11px] leading-relaxed mb-1.5"
              style={{ color: "var(--panel-muted)" }}
            >
              {toolCall.description}
            </p>
          )}
          {expanded && toolCall.input && (
            <pre
              className="text-[11px] p-2 rounded-lg font-mono overflow-x-auto"
              style={{
                background: "var(--code-bg)",
                color: "var(--panel-text)",
                opacity: 0.8,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              {toolCall.input.length > 500
                ? toolCall.input.slice(0, 500) + "\n..."
                : toolCall.input}
            </pre>
          )}
        </div>
      )}

      {/* Action buttons */}
      {isPending && expanded && (
        <div
          className="flex justify-end gap-2 px-3 py-2 border-t"
          style={{ borderColor: "var(--panel-border)" }}
        >
          <button
            onClick={() => onDeny(sessionId, toolCall.id)}
            className="text-[11px] font-medium px-4 py-1.5 rounded-md transition-all hover:brightness-110"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--panel-muted)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Deny
          </button>
          <button
            onClick={() => onApprove(sessionId, toolCall.id)}
            className="text-[11px] font-medium px-4 py-1.5 rounded-md transition-all hover:brightness-110"
            style={{
              backgroundColor: "var(--accent)",
              color: "#000",
            }}
          >
            Allow
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ToolCall;
