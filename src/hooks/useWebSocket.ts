import { useEffect, useRef, useState } from "react";
import { AgentEvent } from "../lib/types";

const WS_PORT = 19876;

export function useWebSocket(onEvent: (e: AgentEvent) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);

      ws.onopen = () => {
        if (mounted) setConnected(true);
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.status === "ok" || parsed.status === "connected") return;
          if (mounted && parsed.type) {
            onEventRef.current(parsed as AgentEvent);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (mounted) {
          setConnected(false);
          timer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };

    connect();

    // Também escuta eventos Tauri como fallback
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<AgentEvent>("agent-event", (e) => {
          if (mounted) onEventRef.current(e.payload);
        }),
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      mounted = false;
      clearTimeout(timer);
      wsRef.current?.close();
      unlisten?.();
    };
  }, []);

  return { connected };
}
