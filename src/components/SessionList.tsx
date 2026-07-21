import React from "react";
import { motion } from "framer-motion";
import { Session } from "../lib/types";
import SessionRow from "./SessionRow";

interface SessionListProps {
  sessions: Session[];
  onSelect: (session: Session) => void;
  onArchive: (sessionId: string) => void;
  onApprove: (sessionId: string, approvalId: string) => void;
  onDeny: (sessionId: string, approvalId: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onSelect,
  onArchive,
  onApprove,
  onDeny,
}) => {
  if (sessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full gap-3 px-4"
      >
        <span style={{ color: "var(--panel-muted)", fontSize: "13px" }}>
          Nenhum agente conectado
        </span>
        <span
          style={{ color: "var(--panel-muted)", fontSize: "11px", opacity: 0.6 }}
        >
          Aguardando eventos em ws://127.0.0.1:19876
        </span>
      </motion.div>
    );
  }

  return (
    <div className="overflow-y-auto h-full" style={{ maxHeight: "calc(100vh - 50px)" }}>
      {sessions.map((session, i) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <SessionRow
            session={session}
            onClick={() => onSelect(session)}
            onArchive={() => onArchive(session.id)}
            onApprove={
              session.pending_approval
                ? () => onApprove(session.id, session.pending_approval!.id)
                : undefined
            }
            onDeny={
              session.pending_approval
                ? () => onDeny(session.id, session.pending_approval!.id)
                : undefined
            }
          />
        </motion.div>
      ))}
    </div>
  );
};

export default SessionList;
