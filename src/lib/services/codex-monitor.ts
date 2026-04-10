import { invoke } from "@tauri-apps/api/core";
import type { CodexStatusSnapshot } from "$lib/models/codex-status";
import { isTauriRuntime } from "$lib/services/pet-window";

export interface CodexMonitorController {
  start: () => void;
  stop: () => void;
}

const SIMULATED_KEYFRAMES: CodexStatusSnapshot[] = [
  {
    activity: "idle",
    source: "simulated",
    detail: "waiting for a task",
  },
  {
    activity: "thinking",
    source: "simulated",
    detail: "reasoning through a request",
  },
  {
    activity: "acting",
    source: "simulated",
    detail: "running tools",
  },
  {
    activity: "waiting_input",
    source: "simulated",
    detail: "waiting for confirmation",
  },
  {
    activity: "notice",
    source: "simulated",
    detail: "permission request or notification",
  },
  {
    activity: "celebrate",
    source: "simulated",
    detail: "post compact or graceful stop",
  },
  {
    activity: "error",
    source: "simulated",
    detail: "last tool run failed",
  },
  {
    activity: "error_burst",
    source: "simulated",
    detail: "post tool failure or stop failure",
  },
];

export function getCodexStatusSnapshot(): CodexStatusSnapshot {
  return {
    activity: "idle",
    source: "placeholder",
    detail: null,
  };
}

export function createSimulatedCodexMonitor(
  onSnapshot: (snapshot: CodexStatusSnapshot) => void,
  intervalMs = 2200,
): CodexMonitorController {
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    onSnapshot(SIMULATED_KEYFRAMES[frame % SIMULATED_KEYFRAMES.length]);
    frame += 1;
  };

  return {
    start() {
      if (timer !== null) {
        return;
      }

      emit();
      timer = setInterval(emit, intervalMs);
    },
    stop() {
      if (timer === null) {
        return;
      }

      clearInterval(timer);
      timer = null;
    },
  };
}

async function getNativeCodexStatusSnapshot(): Promise<CodexStatusSnapshot> {
  const snapshot = await invoke<CodexStatusSnapshot>("get_codex_status_snapshot");

  return {
    activity: snapshot.activity,
    source: snapshot.source,
    detail: snapshot.detail,
  };
}

export function createCodexMonitor(
  onSnapshot: (snapshot: CodexStatusSnapshot) => void,
  intervalMs = 1600,
): CodexMonitorController {
  if (!isTauriRuntime()) {
    return createSimulatedCodexMonitor(onSnapshot);
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;

  const emit = async () => {
    if (isPolling) {
      return;
    }

    isPolling = true;

    try {
      onSnapshot(await getNativeCodexStatusSnapshot());
    } catch {
      onSnapshot(getCodexStatusSnapshot());
    } finally {
      isPolling = false;
    }
  };

  return {
    start() {
      if (timer !== null) {
        return;
      }

      void emit();
      timer = setInterval(() => {
        void emit();
      }, intervalMs);
    },
    stop() {
      if (timer === null) {
        return;
      }

      clearInterval(timer);
      timer = null;
    },
  };
}
