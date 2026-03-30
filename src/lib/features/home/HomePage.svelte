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

  let snapshot: SystemMonitorSnapshot = getSystemMonitorSnapshot();
  let motion = createMotionProfile(snapshot);
  let isDragging = false;
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
      motion = createMotionProfile(nextSnapshot);
    });

    monitor.start();

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
  }

  @media (max-width: 640px) {
    .page {
      padding: 0;
    }
  }
</style>
