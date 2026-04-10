import {
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  monitorFromPoint,
  PhysicalPosition,
  PhysicalSize,
  type Monitor,
} from "@tauri-apps/api/window";

const PET_WINDOW_POSITION_KEY = "mochi.pet.window.position";
const PET_WINDOW_EDGE_MARGIN = 24;
const PET_WINDOW_SNAP_DISTANCE = 20;

export interface StoredWindowPosition {
  x: number;
  y: number;
}

interface WindowBounds {
  width: number;
  height: number;
}

export interface PetWindowController {
  isAvailable: () => boolean;
  restorePosition: () => Promise<void>;
  handlePointerDown: (event: PointerEvent) => Promise<boolean>;
  listenForMove: (
    onMove?: (position: StoredWindowPosition) => void,
  ) => Promise<() => void>;
  resizeWindow: (width: number, height: number) => Promise<void>;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function createPetWindowController(): PetWindowController {
  let lastSavedWindowPosition: StoredWindowPosition | null = null;

  function readStoredWindowPosition(): StoredWindowPosition | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(PET_WINDOW_POSITION_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredWindowPosition>;
      if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
        return null;
      }

      const position = {
        x: parsed.x,
        y: parsed.y,
      };

      lastSavedWindowPosition = position;
      return position;
    } catch {
      return null;
    }
  }

  function writeStoredWindowPosition(position: StoredWindowPosition): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    if (
      lastSavedWindowPosition?.x === position.x &&
      lastSavedWindowPosition?.y === position.y
    ) {
      return;
    }

    localStorage.setItem(PET_WINDOW_POSITION_KEY, JSON.stringify(position));
    lastSavedWindowPosition = position;
  }

  function clamp(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  function getSnappedAxisValue(value: number, min: number, max: number): number {
    const distanceToMin = Math.abs(value - min);
    const distanceToMax = Math.abs(value - max);

    if (distanceToMin <= PET_WINDOW_SNAP_DISTANCE && distanceToMin <= distanceToMax) {
      return min;
    }

    if (distanceToMax <= PET_WINDOW_SNAP_DISTANCE) {
      return max;
    }

    return value;
  }

  function getMonitorBounds(monitor: Monitor, windowSize: WindowBounds) {
    const workAreaPosition = monitor.workArea.position;
    const workAreaSize = monitor.workArea.size;

    return {
      minX: workAreaPosition.x,
      minY: workAreaPosition.y,
      maxX: workAreaPosition.x + workAreaSize.width - windowSize.width,
      maxY: workAreaPosition.y + workAreaSize.height - windowSize.height,
    };
  }

  function getDistanceToRange(value: number, min: number, max: number): number {
    if (value < min) {
      return min - value;
    }

    if (value > max) {
      return value - max;
    }

    return 0;
  }

  function getMonitorDistance(
    position: StoredWindowPosition,
    windowSize: WindowBounds,
    monitor: Monitor,
  ): number {
    const workAreaPosition = monitor.workArea.position;
    const workAreaSize = monitor.workArea.size;
    const centerX = position.x + windowSize.width / 2;
    const centerY = position.y + windowSize.height / 2;
    const minX = workAreaPosition.x;
    const minY = workAreaPosition.y;
    const maxX = workAreaPosition.x + workAreaSize.width;
    const maxY = workAreaPosition.y + workAreaSize.height;
    const dx = getDistanceToRange(centerX, minX, maxX);
    const dy = getDistanceToRange(centerY, minY, maxY);

    return dx ** 2 + dy ** 2;
  }

  async function getMonitorForPosition(
    position: StoredWindowPosition,
    windowSize: WindowBounds,
  ): Promise<Monitor | null> {
    const centerX = position.x + windowSize.width / 2;
    const centerY = position.y + windowSize.height / 2;
    const matchedMonitor = await monitorFromPoint(centerX, centerY);

    if (matchedMonitor) {
      return matchedMonitor;
    }

    const monitors = await availableMonitors();
    if (monitors.length > 0) {
      return monitors.reduce((closestMonitor, candidateMonitor) => {
        const candidateDistance = getMonitorDistance(position, windowSize, candidateMonitor);
        const closestDistance = getMonitorDistance(position, windowSize, closestMonitor);

        if (candidateDistance < closestDistance) {
          return candidateMonitor;
        }

        return closestMonitor;
      });
    }

    return currentMonitor();
  }

  async function constrainWindowPosition(
    position: StoredWindowPosition,
    snapToEdge = false,
  ): Promise<StoredWindowPosition> {
    const appWindow = getCurrentWindow();
    const windowSize = await appWindow.outerSize();
    const monitor = await getMonitorForPosition(position, windowSize);

    if (!monitor) {
      return position;
    }

    const { minX, minY, maxX, maxY } = getMonitorBounds(monitor, windowSize);
    const normalized = {
      x: clamp(position.x, minX, maxX),
      y: clamp(position.y, minY, maxY),
    };

    if (!snapToEdge) {
      return normalized;
    }

    return {
      x: getSnappedAxisValue(normalized.x, minX, maxX),
      y: getSnappedAxisValue(normalized.y, minY, maxY),
    };
  }

  async function getDefaultWindowPosition(): Promise<StoredWindowPosition | null> {
    const appWindow = getCurrentWindow();
    const [activeMonitor, monitors, windowSize] = await Promise.all([
      currentMonitor(),
      availableMonitors(),
      appWindow.outerSize(),
    ]);
    const monitor = activeMonitor ?? monitors[0] ?? null;

    if (!monitor) {
      return null;
    }

    const { minX, minY, maxX, maxY } = getMonitorBounds(monitor, windowSize);

    return {
      x: clamp(maxX - PET_WINDOW_EDGE_MARGIN, minX, maxX),
      y: clamp(maxY - PET_WINDOW_EDGE_MARGIN, minY, maxY),
    };
  }

  async function setAndPersistWindowPosition(position: StoredWindowPosition): Promise<void> {
    writeStoredWindowPosition(position);
    await getCurrentWindow().setPosition(new PhysicalPosition(position.x, position.y));
  }

  return {
    isAvailable(): boolean {
      return isTauriRuntime();
    },

    async restorePosition(): Promise<void> {
      if (!isTauriRuntime()) {
        return;
      }

      const stored = readStoredWindowPosition();
      if (!stored) {
        const fallback = await getDefaultWindowPosition();
        if (!fallback) {
          return;
        }

        await setAndPersistWindowPosition(fallback);
        return;
      }

      const normalized = await constrainWindowPosition(stored);
      await setAndPersistWindowPosition(normalized);
    },

    async handlePointerDown(event: PointerEvent): Promise<boolean> {
      if (event.button !== 0 || !isTauriRuntime()) {
        return false;
      }

      const appWindow = getCurrentWindow();
      await appWindow.startDragging();

      const position = await appWindow.outerPosition();
      const snappedPosition = await constrainWindowPosition(
        {
          x: position.x,
          y: position.y,
        },
        true,
      );

      await setAndPersistWindowPosition(snappedPosition);
      return true;
    },

    async listenForMove(
      onMove?: (position: StoredWindowPosition) => void,
    ): Promise<() => void> {
      if (!isTauriRuntime()) {
        return () => {};
      }

      return getCurrentWindow().onMoved(({ payload }) => {
        const position = {
          x: payload.x,
          y: payload.y,
        };

        writeStoredWindowPosition(position);
        onMove?.(position);
      });
    },

    async resizeWindow(width: number, height: number): Promise<void> {
      if (!isTauriRuntime()) {
        return;
      }

      await getCurrentWindow().setSize(new PhysicalSize(width, height));
    },
  };
}
