<script lang="ts">
  import { emitTo } from "@tauri-apps/api/event";
  import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { LogicalPosition, LogicalSize, currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import { createMotionProfile } from "$lib/animation/motion";
  import type { CodexActivity, CodexStatusSnapshot } from "$lib/models/codex-status";
  import type { ControlPanelSnapshot } from "$lib/models/control-panel";
  import { createRemoteSkillController } from "$lib/services/remote-skill";
  import {
    createCodexMonitor,
    getCodexStatusSnapshot,
  } from "$lib/services/codex-monitor";
  import {
    createSystemMonitor,
    getSystemMonitorSnapshot,
    type SystemMonitorSnapshot,
  } from "$lib/services/system-monitor";
  import { createPetWindowController } from "$lib/services/pet-window";
  import MochiAvatar from "$lib/features/mochi-avatar/MochiAvatar.svelte";

  type DebugCycleStage = "idle" | "calm" | "alert" | "busy";

  const CONTROL_PANEL_WINDOW_LABEL = "control-panel";
  const CONTROL_PANEL_EVENT = "mochi://control-panel";
  const DEBUG_CYCLE_STAGES: DebugCycleStage[] = ["idle", "calm", "alert", "busy"];
  const DEBUG_CODEX_STAGES: CodexActivity[] = [
    "idle",
    "thinking",
    "acting",
    "waiting_input",
    "notice",
    "celebrate",
    "error",
    "error_burst",
    "done",
  ];
  const DEBUG_CYCLE_INTERVAL_MS = 5000;
  let snapshot: SystemMonitorSnapshot = getSystemMonitorSnapshot();
  let codexStatus: CodexStatusSnapshot = getCodexStatusSnapshot();
  let motion = createMotionProfile(snapshot, codexStatus);
  let isDragging = false;
  let debugCycleEnabled = false;
  let debugCycleStage: DebugCycleStage = "idle";
  let debugCodexCycleEnabled = false;
  let debugCodexStage: CodexActivity = "idle";
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
  const remoteSkill = createRemoteSkillController();

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

  function getDebugCodexSnapshot(activity: CodexActivity): CodexStatusSnapshot {
    return {
      activity,
      source: "simulated",
      detail:
        activity === "idle"
          ? "debug codex loop: idle"
          : activity === "thinking"
            ? "debug codex loop: reasoning"
            : activity === "acting"
              ? "debug codex loop: running tools"
              : activity === "waiting_input"
                ? "debug codex loop: waiting for you"
                : activity === "notice"
                  ? "debug codex loop: permission request"
                  : activity === "celebrate"
                    ? "debug codex loop: graceful stop"
                    : activity === "error_burst"
                      ? "debug codex loop: failure burst"
                : activity === "error"
                  ? "debug codex loop: recent failure"
                  : "debug codex loop: completed",
    };
  }

  function getEffectiveMotion(nextSnapshot: SystemMonitorSnapshot) {
    const effectiveCodexStatus = debugCodexCycleEnabled
      ? getDebugCodexSnapshot(debugCodexStage)
      : codexStatus;

    if (!debugCycleEnabled) {
      return createMotionProfile(nextSnapshot, effectiveCodexStatus);
    }

    return createMotionProfile(getDebugCycleSnapshot(debugCycleStage), effectiveCodexStatus);
  }

  function getControlPanelSnapshot(): ControlPanelSnapshot {
    return {
      debugCycleEnabled,
      debugCodexCycleEnabled,
      debugCycleStage,
      debugCodexStage,
    };
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
    const hasControlModifier = event.metaKey || event.ctrlKey;
    const hasDebugModifier = event.shiftKey || event.altKey;
    const isModifierGesture = event.button === 0 && (hasControlModifier || hasDebugModifier);

    if (isModifierGesture) {
      if (event.cancelable) {
        event.preventDefault();
      }

      if (hasControlModifier) {
        await openControlPanelWindow();
        return;
      }

      if (event.detail < 2) {
        return;
      }

      if (event.shiftKey) {
        debugCycleEnabled = !debugCycleEnabled;
        debugCycleStage = "idle";
      }

      if (event.altKey) {
        debugCodexCycleEnabled = !debugCodexCycleEnabled;
        debugCodexStage = "idle";
      }

      motion = getEffectiveMotion(snapshot);
      await syncControlPanelSnapshot();
      return;
    }

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
    if (!event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    if (event.metaKey || event.ctrlKey) {
      void openControlPanelWindow();
      return;
    }

    if (event.shiftKey) {
      debugCycleEnabled = !debugCycleEnabled;
      debugCycleStage = "idle";
    }

    if (event.altKey) {
      debugCodexCycleEnabled = !debugCodexCycleEnabled;
      debugCodexStage = "idle";
    }

    motion = getEffectiveMotion(snapshot);
    void syncControlPanelSnapshot();
  }

  async function syncControlPanelSnapshot() {
    if (!petWindow.isAvailable()) {
      return;
    }

    await emitTo(CONTROL_PANEL_WINDOW_LABEL, CONTROL_PANEL_EVENT, {
      snapshot: getControlPanelSnapshot(),
    });
  }

  async function openControlPanelWindow() {
    if (!petWindow.isAvailable()) {
      return;
    }

    const width = 980;
    const height = 760;
    const minWidth = 860;
    const minHeight = 620;
    const activeMonitor = await currentMonitor();
    const monitorWidth = activeMonitor?.size.width ?? 1440;
    const monitorHeight = activeMonitor?.size.height ?? 900;
    const x = Math.round(((activeMonitor?.position.x ?? 0) + monitorWidth / 2) - width / 2);
    const y = Math.round(((activeMonitor?.position.y ?? 0) + monitorHeight / 2) - height / 2);
    const existingWindow = await WebviewWindow.getByLabel(CONTROL_PANEL_WINDOW_LABEL);

    if (existingWindow) {
      await existingWindow.setSize(new LogicalSize(width, height));
      await existingWindow.setPosition(new LogicalPosition(x, y));
      await existingWindow.show();
      await existingWindow.setFocus();
      await syncControlPanelSnapshot();
      return;
    }

    const panelWindow = new WebviewWindow(CONTROL_PANEL_WINDOW_LABEL, {
      title: "MochiDesk Control Panel",
      url: "/control-panel",
      width,
      height,
      minWidth,
      minHeight,
      x,
      y,
      center: false,
      decorations: true,
      transparent: false,
      alwaysOnTop: false,
      resizable: true,
      focus: true,
    });

    panelWindow.once("tauri://created", () => {
      void syncControlPanelSnapshot();
    });

    panelWindow.once("tauri://error", () => {
      console.warn("Failed to create control panel window.");
    });
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
    let debugCodexCycleTimer: ReturnType<typeof setInterval> | null = null;
    let remoteSkillTimer: ReturnType<typeof setInterval> | null = null;
    let unlistenControlPanel: (() => void) | null = null;

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

      void getCurrentWindow()
        .listen<{ action?: string }>(CONTROL_PANEL_EVENT, ({ payload }) => {
          if (payload.action === "toggle-system-debug") {
            debugCycleEnabled = !debugCycleEnabled;
            debugCycleStage = "idle";
            motion = getEffectiveMotion(snapshot);
            void syncControlPanelSnapshot();
          }

          if (payload.action === "toggle-codex-debug") {
            debugCodexCycleEnabled = !debugCodexCycleEnabled;
            debugCodexStage = "idle";
            motion = getEffectiveMotion(snapshot);
            void syncControlPanelSnapshot();
          }
        })
        .then((unlisten) => {
          unlistenControlPanel = unlisten;
        });
    }

    const monitor = createSystemMonitor((nextSnapshot) => {
      snapshot = nextSnapshot;
      motion = getEffectiveMotion(nextSnapshot);
    });
    const codexMonitor = createCodexMonitor((nextStatus) => {
      codexStatus = nextStatus;
      motion = getEffectiveMotion(snapshot);
    });

    monitor.start();
    codexMonitor.start();

    debugCycleTimer = setInterval(() => {
      if (!debugCycleEnabled) {
        return;
      }

      const currentIndex = DEBUG_CYCLE_STAGES.indexOf(debugCycleStage);
      const nextIndex = (currentIndex + 1) % DEBUG_CYCLE_STAGES.length;
      debugCycleStage = DEBUG_CYCLE_STAGES[nextIndex];
      motion = getEffectiveMotion(snapshot);
      void syncControlPanelSnapshot();
    }, DEBUG_CYCLE_INTERVAL_MS);

    debugCodexCycleTimer = setInterval(() => {
      if (!debugCodexCycleEnabled) {
        return;
      }

      const currentIndex = DEBUG_CODEX_STAGES.indexOf(debugCodexStage);
      const nextIndex = (currentIndex + 1) % DEBUG_CODEX_STAGES.length;
      debugCodexStage = DEBUG_CODEX_STAGES[nextIndex];
      motion = getEffectiveMotion(snapshot);
      void syncControlPanelSnapshot();
    }, DEBUG_CYCLE_INTERVAL_MS);

    remoteSkillTimer = setInterval(() => {
      void remoteSkill.dequeueRemoteSkillRequest().then((payload) => {
        if (!payload) {
          return;
        }

        void remoteSkill.runRemoteSkill(payload);
      });
    }, 1200);

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
      if (debugCodexCycleTimer !== null) {
        clearInterval(debugCodexCycleTimer);
      }
      if (remoteSkillTimer !== null) {
        clearInterval(remoteSkillTimer);
      }
      unlistenControlPanel?.();
      unlistenWindowMoved?.();
      monitor.stop();
      codexMonitor.stop();
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

      {#if debugCycleEnabled || debugCodexCycleEnabled}
        <div class="debug-badge" class:codex-loop-only={debugCodexCycleEnabled && !debugCycleEnabled}>
          {#if debugCycleEnabled}
            <span>{debugCycleStage} loop</span>
          {/if}
          {#if debugCodexCycleEnabled && !debugCycleEnabled}
            <span>{motion.codexActivity}</span>
          {:else if debugCodexCycleEnabled}
            <span>{debugCodexStage} codex loop</span>
            <span>{motion.codexActivity}</span>
          {/if}
        </div>
      {/if}

      {#if debugCycleEnabled || debugCodexCycleEnabled}
        <div class="debug-panel">
          <div><strong>mood</strong> {motion.mood}</div>
          <div><strong>energy</strong> {motion.energy.toFixed(2)}</div>
          <div><strong>cpu</strong> {snapshot.cpuLoad === null ? "null" : snapshot.cpuLoad.toFixed(2)}</div>
          <div><strong>memory</strong> {snapshot.memoryLoad === null ? "null" : snapshot.memoryLoad.toFixed(2)}</div>
          <div><strong>system</strong> {snapshot.source}</div>
          <div><strong>codex</strong> {codexStatus.activity}</div>
          <div><strong>codex source</strong> {codexStatus.source}</div>
          <div class="debug-detail"><strong>detail</strong> {codexStatus.detail ?? "-"}</div>
        </div>
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
    justify-items: center;
    align-items: end;
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
    align-items: end;
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
    align-items: end;
    padding: 0;
    overflow: hidden;
    position: relative;
  }

  .debug-badge {
    position: absolute;
    top: 8px;
    right: 6px;
    display: grid;
    gap: 2px;
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

  .debug-badge.codex-loop-only {
    top: -8px;
    right: -4px;
    gap: 1px;
    padding: 1px 5px;
    font-size: 9px;
    line-height: 1.1;
    opacity: 0.9;
    background: color-mix(in srgb, #5a2d18 74%, transparent);
    box-shadow: 0 1px 4px rgb(64 26 12 / 0.14);
  }

  .debug-panel {
    position: absolute;
    top: 30px;
    left: calc(100% + 8px);
    width: 168px;
    padding: 8px 10px;
    border-radius: 14px;
    background: color-mix(in srgb, #fff8ef 92%, transparent);
    color: #3d3025;
    font-size: 10px;
    line-height: 1.35;
    box-shadow: 0 10px 24px rgb(67 42 24 / 0.12);
    border: 1px solid rgb(194 155 117 / 0.22);
    pointer-events: none;
    backdrop-filter: blur(6px);
  }

  .debug-panel > div {
    white-space: nowrap;
  }

  .debug-panel strong {
    display: inline-block;
    min-width: 62px;
    color: #7f5c41;
    font-weight: 600;
  }

  .debug-detail {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid rgb(194 155 117 / 0.18);
    word-break: break-word;
    white-space: normal;
  }

  @media (max-width: 120px), (max-height: 140px) {
    .debug-panel {
      top: 3px;
      left: 3px;
      right: 3px;
      width: auto;
      padding: 3px 4px;
      border-radius: 9px;
      font-size: 7px;
      line-height: 1.05;
      display: flex;
      align-items: center;
      gap: 4px;
      background: color-mix(in srgb, #fff9f0 72%, transparent);
      box-shadow: 0 3px 8px rgb(67 42 24 / 0.1);
      backdrop-filter: blur(4px);
      z-index: 2;
      max-height: 22px;
      overflow: hidden;
    }

    .debug-panel > div {
      display: none;
    }

    .debug-panel > div:nth-child(1),
    .debug-panel > div:nth-child(3),
    .debug-panel > div:nth-child(4),
    .debug-panel > div:nth-child(6) {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .debug-panel strong {
      display: inline;
      min-width: 0;
      margin-bottom: 0;
      font-size: 0;
      letter-spacing: 0;
    }

    .debug-panel > div:nth-child(1)::before {
      content: "m ";
      color: #7f5c41;
      font-size: 6px;
      font-weight: 700;
    }

    .debug-panel > div:nth-child(3)::before {
      content: "c ";
      color: #7f5c41;
      font-size: 6px;
      font-weight: 700;
    }

    .debug-panel > div:nth-child(4)::before {
      content: "r ";
      color: #7f5c41;
      font-size: 6px;
      font-weight: 700;
    }

    .debug-panel > div:nth-child(6)::before {
      content: "x ";
      color: #7f5c41;
      font-size: 6px;
      font-weight: 700;
    }

    .debug-detail {
      display: none;
    }
  }

  @media (max-width: 640px) and (min-width: 121px) and (min-height: 141px) {
    .page {
      padding: 0;
    }

    .debug-panel {
      left: auto;
      right: 0;
      top: calc(100% + 8px);
      width: min(180px, calc(100vw - 12px));
    }
  }
</style>
