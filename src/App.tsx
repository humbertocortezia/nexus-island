import { useState, useCallback, useEffect, useRef } from "react";
import Panel from "./components/Panel";
import { useWebSocket } from "./hooks/useWebSocket";
import { Session, Theme, AgentEvent } from "./lib/types";

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem("nexus-theme") as Theme) || "dark",
  );
  const connectedRef = useRef(false);

  // Posiciona no canto superior direito (estilo menu bar flutuante)
  useEffect(() => {
    const position = async () => {
      try {
        const { getCurrentWindow, primaryMonitor, PhysicalPosition } =
          await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const monitor = await primaryMonitor();
        if (monitor) {
          const winWidth = 440;
          const x = monitor.position.x + monitor.size.width - winWidth - 16;
          const y = monitor.position.y + 40;
          await win.setPosition(new PhysicalPosition(x, y));
        }
      } catch {}
    };
    position();
  }, []);

  // Tema
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nexus-theme", theme);
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("set_theme", { theme }))
      .catch(() => {});
  }, [theme]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<Theme>("theme-changed", (e) => setTheme(e.payload)),
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, []);

  // WebSocket + eventos Tauri
  const handleEvent = useCallback((event: AgentEvent) => {
    setSessions((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === event.session_id);

      switch (event.type) {
        case "session_start": {
          if (idx === -1) {
            next.unshift({
              id: event.session_id,
              agent: event.agent,
              project: event.project || "",
              summary: event.summary || "Nova tarefa",
              status: "running",
              progress_text: "Iniciando...",
              last_message: "",
              messages: [],
              pending_approval: null,
              created_at: event.timestamp,
              updated_at: event.timestamp,
              has_unread: true,
            });
          }
          break;
        }
        case "session_update": {
          if (idx !== -1) {
            const s = { ...next[idx] };
            if (event.status) s.status = event.status;
            if (event.progress_text) s.progress_text = event.progress_text;
            s.updated_at = event.timestamp;
            next[idx] = s;
          }
          break;
        }
        case "tool_call": {
          if (idx !== -1) {
            const s = { ...next[idx] };
            s.status = "waiting_approval";
            s.pending_approval = {
              id: event.approval_id || "",
              name: event.tool_name || "",
              input: event.tool_input || "",
              description: event.tool_description || "",
              status: "pending",
            };
            s.updated_at = event.timestamp;
            s.has_unread = true;
            next[idx] = s;
          }
          break;
        }
        case "agent_message": {
          if (idx !== -1) {
            const s = { ...next[idx] };
            s.last_message = (event.content || "").slice(0, 200);
            s.messages = [
              ...s.messages,
              {
                id: `msg_${Date.now()}`,
                role: "agent" as const,
                content: event.content || "",
                timestamp: event.timestamp,
                tool_calls: [],
              },
            ].slice(-50);
            s.updated_at = event.timestamp;
            next[idx] = s;
          }
          break;
        }
        case "session_end": {
          if (idx !== -1) {
            const s = { ...next[idx] };
            s.status = "completed";
            s.updated_at = event.timestamp;
            s.has_unread = true;
            if (event.result?.error) {
              s.progress_text = `Erro: ${event.result.error}`;
            } else {
              s.progress_text = "Concluído";
            }
            next[idx] = s;
          }
          break;
        }
      }
      return next;
    });
  }, []);

  const { connected } = useWebSocket(handleEvent);
  connectedRef.current = connected;

  const handleArchive = useCallback(async (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("archive_session", { sessionId });
    } catch {}
  }, []);

  const handleApprove = useCallback(
    async (sessionId: string, approvalId: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: "running" as const,
                pending_approval: s.pending_approval
                  ? { ...s.pending_approval, status: "approved" as const }
                  : null,
                has_unread: false,
              }
            : s,
        ),
      );
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("approve_action", { sessionId, approvalId });
      } catch {}
    },
    [],
  );

  const handleDeny = useCallback(
    async (sessionId: string, approvalId: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: "completed" as const,
                pending_approval: s.pending_approval
                  ? { ...s.pending_approval, status: "denied" as const }
                  : null,
              }
            : s,
        ),
      );
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("deny_action", { sessionId, approvalId });
      } catch {}
    },
    [],
  );

  const handleMarkRead = useCallback(async (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, has_unread: false } : s)),
    );
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("mark_read", { sessionId });
    } catch {}
  }, []);

  return (
    <Panel
      sessions={sessions}
      connected={connected}
      theme={theme}
      onArchive={handleArchive}
      onApprove={handleApprove}
      onDeny={handleDeny}
      onMarkRead={handleMarkRead}
    />
  );
}

export default App;
