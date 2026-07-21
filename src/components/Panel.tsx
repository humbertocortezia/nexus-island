import React, { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Session, Theme } from "../lib/types";
import SessionList from "./SessionList";
import SessionDetail from "./SessionDetail";

interface PanelProps {
  sessions: Session[];
  connected: boolean;
  theme: Theme;
  onArchive: (sessionId: string) => void;
  onApprove: (sessionId: string, approvalId: string) => void;
  onDeny: (sessionId: string, approvalId: string) => void;
  onMarkRead: (sessionId: string) => void;
}

const Panel: React.FC<PanelProps> = ({
  sessions,
  connected,
  theme: _theme,
  onArchive,
  onApprove,
  onDeny,
  onMarkRead,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? sessions.find((s) => s.id === selectedId) ?? null
    : null;

  const handleBack = useCallback(() => setSelectedId(null), []);

  return (
    <div className="drag-handle w-full h-full flex items-start justify-end p-2">
      <div
        className="no-drag flex flex-col w-full h-full overflow-hidden"
        style={{
          background: "var(--panel-bg)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: "14px",
          border: "1px solid var(--panel-border)",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--panel-border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: connected
                  ? "var(--success)"
                  : "var(--warning)",
                boxShadow: connected
                  ? "0 0 6px var(--success)"
                  : "0 0 6px var(--warning)",
              }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--panel-text)", opacity: 0.8 }}
            >
              Nexus
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: connected ? "var(--success)" : "var(--warning)",
                background: connected
                  ? "rgba(48,209,88,0.1)"
                  : "rgba(255,159,10,0.1)",
              }}
            >
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selected ? (
              <SessionDetail
                key="detail"
                session={selected}
                onBack={handleBack}
                onApprove={onApprove}
                onDeny={onDeny}
              />
            ) : (
              <SessionList
                key="list"
                sessions={sessions}
                onSelect={(s) => {
                  setSelectedId(s.id);
                  onMarkRead(s.id);
                }}
                onArchive={onArchive}
                onApprove={onApprove}
                onDeny={onDeny}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Panel;
