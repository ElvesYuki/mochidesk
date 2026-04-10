export interface LanMessage {
  version: 1;
  type:
    | "hello"
    | "hello_ack"
    | "heartbeat"
    | "status"
    | "interaction"
    | "request"
    | "deploy_announce"
    | "deploy_ack"
    | "deploy_progress"
    | "deploy_result"
    | "bye";
  senderId: string;
  senderName: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface NetworkEvent {
  direction: "incoming" | "outgoing";
  address: string;
  port: number;
  message: LanMessage;
  receivedAt: number;
}
