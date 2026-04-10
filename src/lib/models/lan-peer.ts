export interface LanPeer {
  id: string;
  name: string;
  address: string;
  port: number;
  lastSeenAt: number;
  status: "online" | "stale";
  activity:
    | "idle"
    | "thinking"
    | "acting"
    | "waiting_input"
    | "notice"
    | "busy";
}
