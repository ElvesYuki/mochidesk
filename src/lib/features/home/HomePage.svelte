<script lang="ts">
  import { onMount } from "svelte";
  import { createMotionProfile } from "$lib/animation/motion";
  import {
    createSystemMonitor,
    getSystemMonitorSnapshot,
    type SystemMonitorSnapshot,
  } from "$lib/services/system-monitor";
  import { createPetWindowController } from "$lib/services/pet-window";
  import MochiAvatar from "$lib/features/mochi-avatar/MochiAvatar.svelte";

  type DebugCycleStage = "idle" | "calm" | "alert" | "busy";

  const DEBUG_CYCLE_STAGES: DebugCycleStage[] = ["idle", "calm", "alert", "busy"];
  const DEBUG_CYCLE_INTERVAL_MS = 5000;

  let snapshot: SystemMonitorSnapshot = getSystemMonitorSnapshot();
  let motion = createMotionProfile(snapshot);
  let isDragging = false;
  let debugCycleEnabled = false;
  let debugCycleStage: DebugCycleStage = "idle";
  let interactionPulse = 0;
  let interactionTimer: ReturnType<typeof setTimeout> | null = null;
  let hoverPulse = 0;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let releasePulse = 0;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;
  let hasHoverPrimed = false;
  let interactionLookX = 0;
  let interactionLookY = 0;
  const petWindow = createPetWindowController();

  function getDebugCycleSnapshot(stage: DebugCycleStage): SystemMonitorSnapshot {
    if (stage === "idle") {
      return {
        cpuLoad: null,
        memoryLoad: null,
        source: "simulated",
      };
    }

    if (stage === "calm") {
      return {
        cpuLoad: 0.22,
        memoryLoad: 0.34,
        source: "simulated",
      };
    }

    if (stage === "alert") {
      return {
        cpuLoad: 0.54,
        memoryLoad: 0.58,
        source: "simulated",
      };
    }

    return {
      cpuLoad: 0.92,
      memoryLoad: 0.78,
      source: "simulated",
    };
  }

  function getEffectiveMotion(nextSnapshot: SystemMonitorSnapshot) {
    if (!debugCycleEnabled) {
      return createMotionProfile(nextSnapshot);
    }

    return createMotionProfile(getDebugCycleSnapshot(debugCycleStage));
  }

  function triggerInteractionPulse(event: PointerEvent) {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const relativeY = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;

      interactionLookX = Math.max(-1, Math.min(1, relativeX * 2));
      interactionLookY = Math.max(-1, Math.min(1, relativeY * 2));
    }

    interactionPulse += 1;

    if (interactionTimer !== null) {
      clearTimeout(interactionTimer);
    }

    interactionTimer = setTimeout(() => {
      interactionTimer = null;
      interactionLookX = 0;
      interactionLookY = 0;
    }, 220);
  }

  function triggerHoverPulse(event: PointerEvent) {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const relativeY = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;

      interactionLookX = Math.max(-0.55, Math.min(0.55, relativeX * 1.4));
      interactionLookY = Math.max(-0.45, Math.min(0.25, relativeY * 1.2 - 0.08));
    }

    hoverPulse += 1;

    if (hoverTimer !== null) {
      clearTimeout(hoverTimer);
    }

    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      interactionLookX = 0;
      interactionLookY = 0;
    }, 320);
  }

  async function handlePointerDown(event: PointerEvent) {
    if (event.button === 0) {
      hasHoverPrimed = true;

      if (event.cancelable) {
        event.preventDefault();
      }

      triggerInteractionPulse(event);
    }

    const canDrag = event.button === 0 && petWindow.isAvailable();
    if (!canDrag) {
      return;
    }

    isDragging = true;

    try {
      await petWindow.handlePointerDown(event);
    } finally {
      isDragging = false;
    }
  }

  function handleDoubleClick(event: MouseEvent) {
    if (!event.shiftKey) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    debugCycleEnabled = !debugCycleEnabled;
    debugCycleStage = "idle";
    motion = getEffectiveMotion(snapshot);
  }

  function handlePointerEnter(event: PointerEvent) {
    if (hasHoverPrimed || isDragging) {
      return;
    }

    hasHoverPrimed = true;
    triggerHoverPulse(event);
  }

  function handlePointerLeave() {
    hasHoverPrimed = false;

    if (hoverTimer !== null) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    releasePulse += 1;

    if (releaseTimer !== null) {
      clearTimeout(releaseTimer);
    }

    const previousLookX = interactionLookX;
    const previousLookY = interactionLookY;
    interactionLookX = previousLookX * -0.2;
    interactionLookY = Math.max(-0.18, Math.min(0.18, previousLookY * -0.22 + 0.14));

    releaseTimer = setTimeout(() => {
      releaseTimer = null;

      if (interactionTimer === null && hoverTimer === null) {
        interactionLookX = 0;
        interactionLookY = 0;
      }
    }, 220);

    if (interactionTimer === null && releaseTimer === null) {
      interactionLookX = 0;
      interactionLookY = 0;
    }
  }

  onMount(() => {
    let isDisposed = false;
    let unlistenWindowMoved: (() => void) | null = null;
    let debugCycleTimer: ReturnType<typeof setInterval> | null = null;

    if (petWindow.isAvailable()) {
      void petWindow
        .listenForMove()
        .then((unlisten) => {
          if (isDisposed) {
            unlisten();
            return;
          }

          unlistenWindowMoved = unlisten;
        });

      void petWindow.restorePosition();
    }

    const monitor = createSystemMonitor((nextSnapshot) => {
      snapshot = nextSnapshot;
      motion = getEffectiveMotion(nextSnapshot);
    });

    monitor.start();

    debugCycleTimer = setInterval(() => {
      if (!debugCycleEnabled) {
        return;
      }

      const currentIndex = DEBUG_CYCLE_STAGES.indexOf(debugCycleStage);
      const nextIndex = (currentIndex + 1) % DEBUG_CYCLE_STAGES.length;
      debugCycleStage = DEBUG_CYCLE_STAGES[nextIndex];
      motion = getEffectiveMotion(snapshot);
    }, DEBUG_CYCLE_INTERVAL_MS);

    return () => {
      isDisposed = true;
      if (interactionTimer !== null) {
        clearTimeout(interactionTimer);
      }
      if (hoverTimer !== null) {
        clearTimeout(hoverTimer);
      }
      if (releaseTimer !== null) {
        clearTimeout(releaseTimer);
      }
      if (debugCycleTimer !== null) {
        clearInterval(debugCycleTimer);
      }
      unlistenWindowMoved?.();
      monitor.stop();
    };
  });
</script>

<svelte:head>
  <title>MochiDesk</title>
  <meta
    name="description"
    content="MochiDesk desktop application scaffold built with SvelteKit and Tauri."
  />
</svelte:head>

<main class="page">
  <section
    class="pet-scene"
    class:dragging={isDragging}
    role="presentation"
    onpointerenter={handlePointerEnter}
    onpointerleave={handlePointerLeave}
    onpointerdown={handlePointerDown}
    ondblclick={handleDoubleClick}
  >
    <div class="pet-stage">
      <MochiAvatar
        {motion}
        isDragging={isDragging}
        hoverPulse={hoverPulse}
        releasePulse={releasePulse}
        interactionPulse={interactionPulse}
        interactionLookX={interactionLookX}
        interactionLookY={interactionLookY}
      />

      {#if debugCycleEnabled}
        <div class="debug-badge">{debugCycleStage} loop</div>
      {/if}
    </div>
  </section>
</main>

<style>
  :global(html) {
    width: 100%;
    height: 100%;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  :global(body) {
    margin: 0;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    background: transparent;
    color: #162033;
    font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  .page {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 0;
    box-sizing: border-box;
    background: transparent;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .pet-scene {
    width: 100%;
    height: 100%;
    display: grid;
    justify-items: center;
    align-items: center;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden;
  }

  .pet-scene :global(*) {
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .pet-scene.dragging {
    cursor: grabbing;
  }

  .pet-stage {
    width: 100%;
    height: 100%;
    display: grid;
    justify-items: center;
    align-items: center;
    padding: 0;
    overflow: hidden;
    position: relative;
  }

  .debug-badge {
    position: absolute;
    top: 8px;
    right: 6px;
    padding: 2px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, #7d1d1d 84%, transparent);
    color: #fff7f5;
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.04em;
    pointer-events: none;
    box-shadow: 0 2px 6px rgb(92 15 22 / 0.18);
  }

  @media (max-width: 640px) {
    .page {
      padding: 0;
    }
  }
</style>
