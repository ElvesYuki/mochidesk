<script lang="ts">
  import { onMount } from "svelte";
  import { createMotionProfile } from "$lib/animation/motion";
  import {
    createSimulatedMonitor,
    getSystemMonitorSnapshot,
    type SystemMonitorSnapshot,
  } from "$lib/services/system-monitor";
  import { createPetWindowController } from "$lib/services/pet-window";
  import MochiAvatar from "$lib/features/mochi-avatar/MochiAvatar.svelte";

  let snapshot: SystemMonitorSnapshot = getSystemMonitorSnapshot();
  let motion = createMotionProfile(snapshot);
  let isDragging = false;
  const petWindow = createPetWindowController();

  async function handlePointerDown(event: PointerEvent) {
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

    const monitor = createSimulatedMonitor((nextSnapshot) => {
      snapshot = nextSnapshot;
      motion = createMotionProfile(nextSnapshot);
    });

    monitor.start();

    return () => {
      isDisposed = true;
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
    onpointerdown={handlePointerDown}
  >
    <div class="pet-stage">
      <MochiAvatar {motion} />
    </div>
  </section>
</main>

<style>
  :global(html) {
    width: 100%;
    height: 100%;
    overflow: hidden;
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
  }

  .pet-scene {
    width: 100%;
    height: 100%;
    display: grid;
    justify-items: center;
    align-items: center;
    cursor: grab;
    user-select: none;
    overflow: hidden;
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
