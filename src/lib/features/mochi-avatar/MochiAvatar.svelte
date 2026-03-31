<script lang="ts">
  import { onMount } from "svelte";
  import type { MotionProfile } from "$lib/animation/motion";
  import MochiBody from "$lib/features/mochi-avatar/MochiBody.svelte";
  import MochiFace from "$lib/features/mochi-avatar/MochiFace.svelte";
  import MochiHands from "$lib/features/mochi-avatar/MochiHands.svelte";
  import MochiHeatEffects from "$lib/features/mochi-avatar/MochiHeatEffects.svelte";
  import {
    getBodyPath,
    getTargetSpinSpeed,
  } from "$lib/features/mochi-avatar/avatar-motion";
  import { getAvatarStyle } from "$lib/features/mochi-avatar/avatar-style";

  interface Props {
    motion: MotionProfile;
    isDragging?: boolean;
    hoverPulse?: number;
    releasePulse?: number;
    interactionPulse?: number;
    interactionLookX?: number;
    interactionLookY?: number;
  }

  let {
    motion,
    isDragging = false,
    hoverPulse = 0,
    releasePulse = 0,
    interactionPulse = 0,
    interactionLookX = 0,
    interactionLookY = 0,
  }: Props = $props();
  let spinAngle = $state(0);
  let currentSpinSpeed = 0;
  let isInteracting = $state(false);
  let isHovering = $state(false);
  let isReleasing = $state(false);
  let interactionTimeout = 0;
  let hoverTimeout = 0;
  let releaseTimeout = 0;

  $effect(() => {
    interactionPulse;

    if (interactionPulse <= 0) {
      return;
    }

    isInteracting = true;

    clearTimeout(interactionTimeout);
    interactionTimeout = window.setTimeout(() => {
      isInteracting = false;
    }, 240);

    return () => {
      clearTimeout(interactionTimeout);
    };
  });

  $effect(() => {
    hoverPulse;

    if (hoverPulse <= 0) {
      return;
    }

    isHovering = true;

    clearTimeout(hoverTimeout);
    hoverTimeout = window.setTimeout(() => {
      isHovering = false;
    }, 320);

    return () => {
      clearTimeout(hoverTimeout);
    };
  });

  $effect(() => {
    releasePulse;

    if (releasePulse <= 0) {
      return;
    }

    isReleasing = true;

    clearTimeout(releaseTimeout);
    releaseTimeout = window.setTimeout(() => {
      isReleasing = false;
    }, 220);

    return () => {
      clearTimeout(releaseTimeout);
    };
  });

  onMount(() => {
    let frameId = 0;
    let lastTimestamp = 0;

    const animate = (timestamp: number) => {
      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      const targetSpinSpeed = getTargetSpinSpeed(motion);
      const speedChangeRate = targetSpinSpeed > currentSpinSpeed ? 3.8 : 3.1;
      const accelerationBlend = 1 - Math.exp(-deltaSeconds * speedChangeRate);

      currentSpinSpeed += (targetSpinSpeed - currentSpinSpeed) * accelerationBlend;
      spinAngle = (spinAngle + currentSpinSpeed * deltaSeconds) % 360;

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  });
</script>

<div
  class="avatar-frame"
  class:is-busy={motion.mood === "busy"}
  class:is-alert={motion.mood === "alert"}
  class:is-dragging={isDragging}
  class:is-hovering={isHovering}
  class:is-releasing={isReleasing}
  class:is-interacting={isInteracting}
  style={getAvatarStyle(
    motion,
    isInteracting,
    interactionLookX,
    interactionLookY,
    isDragging,
    isHovering,
    isReleasing,
  )}
  >
  <svg
    viewBox="0 0 250 250"
    aria-label="顽皮小木藕像素豆芽"
    role="img"
  >
    <g class="avatar-interaction">
      <MochiHeatEffects variant="steam" isBusy={motion.mood === "busy"} />

      <g class="avatar-bob">
        <MochiBody variant="top" {spinAngle} />

        <g class="body-group">
          <MochiHands layer="back" {interactionPulse} />
          <MochiBody variant="shell" bodyPath={getBodyPath(motion)} />
          <MochiHands layer="front" {interactionPulse} />
          <MochiHeatEffects variant="melt" />
          <MochiFace />
        </g>
      </g>
    </g>
  </svg>
</div>

<style>
  .avatar-frame {
    display: grid;
    justify-items: center;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  svg {
    display: block;
    width: min(92px, 100%);
    max-height: 100%;
    height: auto;
    overflow: visible;
    pointer-events: none;
  }

  .avatar-interaction {
    transform-origin: 125px 150px;
    transform:
      translateY(var(--tap-shift-y))
      scaleX(var(--tap-scale-x))
      scaleY(var(--tap-scale-y))
      rotate(var(--tap-tilt));
    transition: transform 0.3s cubic-bezier(0.18, 1.2, 0.26, 1);
    animation: busy-fidget var(--busy-loop-seconds) ease-in-out infinite;
  }

  .avatar-bob {
    animation: bob var(--breathe-speed) ease-in-out infinite;
    transform: translateY(calc(var(--drag-lift-y) + var(--float-distance) * -0.08));
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .body-group {
    animation: squash var(--breathe-speed) ease-in-out infinite;
    transform-origin: 125px 184px;
    transform: scale(var(--avatar-scale)) scaleY(var(--drag-body-scale-y));
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(calc(var(--drag-lift-y) + var(--float-distance) * -0.08));
    }

    50% {
      transform: translateY(
        calc(var(--drag-lift-y) + var(--melt-drop) + var(--float-distance) * 0.08)
      );
    }
  }

  @keyframes squash {
    0%,
    100% {
      transform: scale(var(--avatar-scale)) scaleY(var(--drag-body-scale-y));
    }

    50% {
      transform: scale(var(--avatar-scale))
        scaleY(calc(var(--melt-squash) * var(--drag-body-scale-y)));
    }
  }

  @keyframes busy-fidget {
    0%,
    100% {
      transform:
        translateY(var(--tap-shift-y))
        translateX(0)
        scaleX(var(--tap-scale-x))
        scaleY(var(--tap-scale-y))
        rotate(var(--tap-tilt));
    }

    30% {
      transform:
        translateY(calc(var(--tap-shift-y) + var(--busy-loop-lift-y)))
        translateX(var(--busy-loop-shift-x))
        scaleX(calc(var(--tap-scale-x) * var(--busy-loop-scale-x)))
        scaleY(calc(var(--tap-scale-y) * var(--busy-loop-scale-y)))
        rotate(calc(var(--tap-tilt) + var(--busy-loop-rotate)));
    }

    62% {
      transform:
        translateY(calc(var(--tap-shift-y) + var(--busy-loop-lift-y) * 0.4))
        translateX(calc(var(--busy-loop-shift-x) * -0.72))
        scaleX(calc(var(--tap-scale-x) * var(--busy-loop-scale-y)))
        scaleY(calc(var(--tap-scale-y) * var(--busy-loop-scale-x)))
        rotate(calc(var(--tap-tilt) + var(--busy-loop-rotate) * -0.58));
    }
  }

</style>
