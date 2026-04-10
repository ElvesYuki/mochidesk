export type CodexActivity =
  | "idle"
  | "thinking"
  | "acting"
  | "waiting_input"
  | "notice"
  | "celebrate"
  | "error"
  | "error_burst"
  | "done";

export interface CodexStatusSnapshot {
  activity: CodexActivity;
  source: "placeholder" | "simulated" | "native";
  detail: string | null;
}
