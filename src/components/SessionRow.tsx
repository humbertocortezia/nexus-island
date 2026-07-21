import React from "react";
import { motion } from "framer-motion";
import { Session, SessionStatus } from "../lib/types";

interface SessionRowProps {
  session: Session;
  onClick: () => void;
  onArchive: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}

const STATUS_CONFIG: Record<
  SessionStatus,
  { color: string; label: string }
> = {
  running: { color: "var(--success)", label: "Rodando" },
  waiting_approval: { color: "var(--warning)", label: "Aguardando" },
  completed: { color: "rgba(255,255,255,0.3)", label: "Concluído" },
  idle: { color: "rgba(255,255,255,0.3)", label: "Parado" },
};

const SessionRow: React.FC<SessionRowProps> = ({
  session,
  onClick,
  onArchive,
  onApprove,
  onDeny,
}) => {
  const cfg = STATUS_CONFIG[session.status];

  return (
    <motion.div
      className="flex items-start gap-3 px-4 py-3 cursor-pointer border-b no-drag relative group"
      style={{
        borderColor: "var(--panel-border)",
        backgroundColor: session.has_unread
          ? "var(--surface-hover)"
          : "transparent",
      }}
      whileHover={{
        backgroundColor: "var(--surface-hover)",
      }}
      onClick={onClick}
    >
      {/* Indicador de status */}
      <div className="flex-shrink-0 mt-0.5">
        <span
          className="block w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: cfg.color,
            boxShadow:
              session.status === "running"
                ? `0 0 8px ${cfg.color}`
                : "none",
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-medium leading-tight truncate"
            style={{ color: "var(--panel-text)" }}
          >
            {session.summary}
          </span>
          {session.has_unread && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "var(--accent)" }}
            />
          )}
        </div>
        {session.last_message && (
          <p
            className="text-[11px] leading-snug mt-0.5 truncate"
            style={{ color: "var(--panel-muted)" }}
          >
            {session.last_message}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--panel-muted)", opacity: 0.4 }}
          >
            {session.agent}
            {session.project ? ` · ${session.project}` : ""}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {session.status === "waiting_approval" && onApprove && onDeny ? (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onDeny}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "var(--panel-muted)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Deny
            </button>
            <button
              onClick={onApprove}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
              style={{
                backgroundColor: "var(--accent)",
                color: "#000",
              }}
            >
              Allow
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="p-1 rounded-md hover:scale-110 transition-transform"
              style={{ color: "var(--panel-muted)" }}
              title="Arquivar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5 2h4M2 4h10M5.5 7v4M8.5 7v4M4 4l1 8h4l1-8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="p-1 rounded-md hover:scale-110 transition-transform"
              style={{ color: "var(--panel-muted)" }}
              title="Abrir"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5 2h3M5 2v3M9 8h3M9 8v3M2 5v3M2 5h3"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SessionRow;
