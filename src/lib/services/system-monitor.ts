import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "$lib/services/pet-window";

export interface SystemMonitorSnapshot {
  cpuLoad: number | null;
  memoryLoad: number | null;
  source: "placeholder" | "simulated" | "native";
}

export function getSystemMonitorSnapshot(): SystemMonitorSnapshot {
  return {
    cpuLoad: null,
    memoryLoad: null,
    source: "placeholder",
  };
}

const SIMULATED_KEYFRAMES: SystemMonitorSnapshot[] = [
  {
    cpuLoad: null,
    memoryLoad: null,
    source: "placeholder",
  },
  {
    cpuLoad: 0.24,
    memoryLoad: 0.38,
    source: "simulated",
  },
  {
    cpuLoad: 0.51,
    memoryLoad: 0.57,
    source: "simulated",
  },
  {
    cpuLoad: 0.82,
    memoryLoad: 0.73,
    source: "simulated",
  },
  {
    cpuLoad: 0.43,
    memoryLoad: 0.61,
    source: "simulated",
  },
];

export interface SimulatedMonitorController {
  start: () => void;
  stop: () => void;
}

export interface SystemMonitorController {
  start: () => void;
  stop: () => void;
}

interface LoadSmoothingState {
  cpuLoad: number | null;
  memoryLoad: number | null;
}

const LOAD_RISE_BLEND = 0.58;
const LOAD_FALL_BLEND = 0.24;
const LOAD_JITTER_DEADBAND = 0.035;

export function createSimulatedMonitor(
  onSnapshot: (snapshot: SystemMonitorSnapshot) => void,
  intervalMs = 160,
): SimulatedMonitorController {
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stepsPerSegment = 24;

  const interpolateValue = (from: number | null, to: number | null, progress: number) => {
    if (from === null || to === null) {
      return progress < 0.5 ? from : to;
    }

    return from + (to - from) * progress;
  };

  const emit = () => {
    const fromIndex = Math.floor(frame / stepsPerSegment) % SIMULATED_KEYFRAMES.length;
    const toIndex = (fromIndex + 1) % SIMULATED_KEYFRAMES.length;
    const progress = (frame % stepsPerSegment) / stepsPerSegment;

    const from = SIMULATED_KEYFRAMES[fromIndex];
    const to = SIMULATED_KEYFRAMES[toIndex];

    onSnapshot({
      cpuLoad: interpolateValue(from.cpuLoad, to.cpuLoad, progress),
      memoryLoad: interpolateValue(from.memoryLoad, to.memoryLoad, progress),
      source: progress < 0.5 ? from.source : to.source,
    });

    frame = (frame + 1) % (SIMULATED_KEYFRAMES.length * stepsPerSegment);
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

async function getNativeSystemMonitorSnapshot(): Promise<SystemMonitorSnapshot> {
  const snapshot = await invoke<SystemMonitorSnapshot>("get_system_monitor_snapshot");

  return {
    cpuLoad: clampLoad(snapshot.cpuLoad),
    memoryLoad: clampLoad(snapshot.memoryLoad),
    source: snapshot.source,
  };
}

function clampLoad(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.min(Math.max(value, 0), 1);
}

function smoothLoad(
  previousValue: number | null,
  nextValue: number | null,
  riseBlend = LOAD_RISE_BLEND,
  fallBlend = LOAD_FALL_BLEND,
): number | null {
  if (nextValue === null) {
    return previousValue;
  }

  if (previousValue === null) {
    return nextValue;
  }

  const delta = nextValue - previousValue;
  if (Math.abs(delta) < LOAD_JITTER_DEADBAND) {
    return previousValue;
  }

  const blend = delta > 0 ? riseBlend : fallBlend;
  return clampLoad(previousValue + delta * blend);
}

function createSmoothedSnapshot(
  snapshot: SystemMonitorSnapshot,
  previousState: LoadSmoothingState,
): SystemMonitorSnapshot {
  const cpuLoad = smoothLoad(previousState.cpuLoad, clampLoad(snapshot.cpuLoad));
  const memoryLoad = smoothLoad(previousState.memoryLoad, clampLoad(snapshot.memoryLoad), 0.42, 0.18);

  previousState.cpuLoad = cpuLoad;
  previousState.memoryLoad = memoryLoad;

  return {
    cpuLoad,
    memoryLoad,
    source: snapshot.source,
  };
}

export function createSystemMonitor(
  onSnapshot: (snapshot: SystemMonitorSnapshot) => void,
  intervalMs = 900,
): SystemMonitorController {
  if (!isTauriRuntime()) {
    return createSimulatedMonitor(onSnapshot);
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;
  const smoothingState: LoadSmoothingState = {
    cpuLoad: null,
    memoryLoad: null,
  };

  const emit = async () => {
    if (isPolling) {
      return;
    }

    isPolling = true;

    try {
      const snapshot = await getNativeSystemMonitorSnapshot();
      onSnapshot(createSmoothedSnapshot(snapshot, smoothingState));
    } catch {
      onSnapshot(getSystemMonitorSnapshot());
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
