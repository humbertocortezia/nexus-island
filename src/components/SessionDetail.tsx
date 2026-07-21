import React from "react";
import { motion } from "framer-motion";
import { Session } from "../lib/types";
import ToolCall from "./ToolCall";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SessionDetailProps {
  session: Session;
  onBack: () => void;
  onApprove: (sessionId: string, approvalId: string) => void;
  onDeny: (sessionId: string, approvalId: string) => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  onBack,
  onApprove,
  onDeny,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <button
          onClick={onBack}
          className="no-drag p-1 -ml-1 rounded-md hover:bg-white/5 transition-colors"
          style={{ color: "var(--panel-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2
            className="text-[13px] font-semibold leading-tight truncate"
            style={{ color: "var(--panel-text)" }}
          >
            {session.summary}
          </h2>
          <span
            className="text-[10px]"
            style={{ color: "var(--panel-muted)", opacity: 0.5 }}
          >
            {session.agent} · {formatDate(session.created_at)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 markdown-body">
        {session.messages.length === 0 && (
          <p
            className="text-[12px] text-center py-8"
            style={{ color: "var(--panel-muted)" }}
          >
            Aguardando resposta do agente...
          </p>
        )}

        {session.messages.map((msg) => (
          <div key={msg.id}>
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeStr = String(children).replace(/\n$/, "");
                  const nodeProps = props as Record<string, unknown>;

                  if (match) {
                    return (
                      <div
                        className="no-drag"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            borderRadius: "8px",
                            padding: "12px",
                            fontSize: "12px",
                            background: "var(--code-bg)",
                            border: "1px solid var(--panel-border)",
                          }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }

                  return (
                    <code
                      className={className}
                      {...nodeProps}
                      style={{
                        background: "var(--code-bg)",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        fontSize: "12px",
                      }}
                    >
                      {children}
                    </code>
                  );
                },
                hr() {
                  return (
                    <hr
                      style={{
                        border: "none",
                        borderTop: "1px solid var(--panel-border)",
                        margin: "12px 0",
                      }}
                    />
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>

            {msg.tool_calls?.map((tc) => (
              <div key={tc.id} className="no-drag" onClick={(e) => e.stopPropagation()}>
                <ToolCall
                  toolCall={tc}
                  sessionId={session.id}
                  onApprove={onApprove}
                  onDeny={onDeny}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pending Approval at bottom */}
      {session.pending_approval &&
        session.pending_approval.status === "pending" && (
          <div
            className="border-t p-3 no-drag"
            style={{ borderColor: "var(--panel-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <ToolCall
              toolCall={session.pending_approval}
              sessionId={session.id}
              onApprove={onApprove}
              onDeny={onDeny}
              expanded
            />
          </div>
        )}
    </motion.div>
  );
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default SessionDetail;
