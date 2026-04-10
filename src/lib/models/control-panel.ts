export interface ControlPanelSnapshot {
  debugCycleEnabled: boolean;
  debugCodexCycleEnabled: boolean;
  debugCycleStage: "idle" | "calm" | "alert" | "busy";
  debugCodexStage:
    | "idle"
    | "thinking"
    | "acting"
    | "waiting_input"
    | "notice"
    | "celebrate"
    | "error"
    | "error_burst"
    | "done";
}
