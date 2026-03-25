export interface SystemMonitorSnapshot {
  cpuLoad: number | null;
  memoryLoad: number | null;
  source: "placeholder" | "simulated";
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
