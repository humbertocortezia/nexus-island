export type SessionStatus = "idle" | "running" | "waiting_approval" | "completed";

export type AgentEventType =
  | "session_start"
  | "session_update"
  | "tool_call"
  | "agent_message"
  | "session_end";

export interface AgentEvent {
  type: AgentEventType;
  session_id: string;
  agent: string;
  timestamp: string;
  // session_start
  project?: string;
  summary?: string;
  // session_update
  status?: SessionStatus;
  progress_text?: string;
  // tool_call
  tool_name?: string;
  tool_input?: string;
  tool_description?: string;
  approval_id?: string;
  // agent_message
  content?: string;
  // session_end
  result?: { success: boolean; error?: string };
}

export interface Session {
  id: string;
  agent: string;
  project: string;
  summary: string;
  status: SessionStatus;
  progress_text: string;
  last_message: string;
  messages: Message[];
  pending_approval: ToolCall | null;
  created_at: string;
  updated_at: string;
  has_unread: boolean;
}

export interface Message {
  id: string;
  role: "agent" | "user" | "system";
  content: string;
  timestamp: string;
  tool_calls: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  description: string;
  status: "pending" | "approved" | "denied" | "executed";
}

export interface UserResponse {
  type: "approval_response";
  session_id: string;
  approval_id: string;
  action: "allow" | "deny";
}

export type Theme = "dark" | "gold" | "black";

export interface IslandState {
  sessions: Session[];
  theme: Theme;
}
