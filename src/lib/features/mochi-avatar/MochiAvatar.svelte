<script lang="ts">
  import { onMount } from "svelte";
  import type { MotionProfile } from "$lib/animation/motion";

  const BODY_IDLE_OUTLINE = [
    90, 70, 160, 76, 170, 82, 180, 160, 170, 170, 160, 180, 90, 170, 80, 160, 70, 82, 80, 76,
    90,
  ] as const;

  const BODY_HEATED_OUTLINE = [
    88, 82, 162, 88, 174, 96, 186, 176, 178, 190, 166, 198, 84, 190, 72, 176, 60, 96, 76, 88,
    90,
  ] as const;

  interface Props {
    motion: MotionProfile;
  }

  let { motion }: Props = $props();
  let spinAngle = $state(0);
  let currentSpinSpeed = 0;

  function getHeatAlpha(profile: MotionProfile): number {
    return Math.max(0, Math.min(1, (profile.energy - 0.56) / 0.22));
  }

  function interpolateInteger(from: number, to: number, progress: number): number {
    return Math.round(from + (to - from) * progress);
  }

  function getBodyPath(profile: MotionProfile): string {
    const heatAlpha = getHeatAlpha(profile);
    const outline = BODY_IDLE_OUTLINE.map((value, index) =>
      interpolateInteger(value, BODY_HEATED_OUTLINE[index], heatAlpha),
    );
    const [
      moveX,
      moveY,
      h1,
      v1,
      h2,
      v2,
      h3,
      v3,
      h4,
      v4,
      h5,
      v5,
      h6,
      v6,
      h7,
      v7,
      h8,
      v8,
      h9,
      v9,
      h10,
    ] = outline;

    return `M ${moveX} ${moveY} H ${h1} V ${v1} H ${h2} V ${v2} H ${h3} V ${v3} H ${h4} V ${v4} H ${h5} V ${v5} H ${h6} V ${v6} H ${h7} V ${v7} H ${h8} V ${v8} H ${h9} V ${v9} H ${h10} Z`;
  }

  function getTargetSpinSpeed(profile: MotionProfile): number {
    const energy = Math.max(0, Math.min(1, profile.energy));
    const warmThreshold = 0.68;

    if (energy < warmThreshold) {
      const calmCurve = energy ** 1.18;
      const spinSeconds = 4.4 - calmCurve * 2.05;
      return 360 / spinSeconds;
    }

    const hotProgress = Math.min(1, (energy - warmThreshold) / 0.14);
    const hotCurve = 1 - (1 - hotProgress) ** 2.4;
    const spinSeconds = 3.08 - hotCurve * 2.56;
    return 360 / spinSeconds;
  }

  function getAvatarStyle(profile: MotionProfile): string {
    const heatAlpha = getHeatAlpha(profile);
    const breatheSeconds = Math.max(0.8, profile.pulseSeconds);
    const faceOffset = Math.round(heatAlpha * 16);
    const bodyFill = profile.mood === "busy" ? "#ffcfd2" : "#ffffff";
    const armFill = profile.mood === "busy" ? "#ffd8dc" : "#f5e6d8";
    const armOutline = profile.mood === "busy" ? "#b97a84" : "#9f8266";
    const leftArmRotate = `${(-8 + heatAlpha * 3).toFixed(2)}deg`;
    const rightArmRotate = `${(8 + heatAlpha * 9).toFixed(2)}deg`;

    return [
      `--breathe-speed:${breatheSeconds.toFixed(2)}s`,
      `--steam-speed:${Math.max(0.9, 1.5 - heatAlpha * 0.45).toFixed(2)}s`,
      `--arm-bob-distance:${(profile.mood === "busy" ? 1.1 : 1.8).toFixed(1)}px`,
      `--face-y:${faceOffset}px`,
      `--heat-alpha:${heatAlpha.toFixed(3)}`,
      `--melt-drop:${Math.round(3 + heatAlpha * 7)}px`,
      `--melt-squash:${(0.96 - heatAlpha * 0.05).toFixed(3)}`,
      `--face-jitter:${(heatAlpha * 1.8).toFixed(2)}px`,
      `--body-fill:${bodyFill}`,
      `--arm-fill:${armFill}`,
      `--arm-outline:${armOutline}`,
      `--hand-fill:${profile.mood === "busy" ? "#fff3f5" : "#fffdf9"}`,
      `--hand-highlight:${profile.mood === "busy" ? "#ffffff" : "#fffefb"}`,
      `--left-arm-rotate:${leftArmRotate}`,
      `--right-arm-rotate:${rightArmRotate}`,
      `--face-fill:${profile.mood === "busy" ? "#5f0f16" : "#444444"}`,
      `--leaf-1-fill:${profile.mood === "busy" ? "#fca5a5" : "#d9f99d"}`,
      `--leaf-1-border:${profile.mood === "busy" ? "#991b1b" : "#4d7c0f"}`,
      `--leaf-2-fill:${profile.mood === "busy" ? "#ef4444" : "#4ade80"}`,
      `--leaf-2-border:${profile.mood === "busy" ? "#7f1d1d" : "#166534"}`,
    ].join("; ");
  }

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

<div class="avatar-frame" class:is-busy={motion.mood === "busy"} style={getAvatarStyle(motion)}>
  <svg
    viewBox="0 0 250 250"
    aria-label="顽皮小木藕像素豆芽"
    role="img"
  >
    <g class="steam-group" aria-hidden={motion.mood !== "busy"}>
      <rect x="110" y="30" width="6" height="6" class="steam steam-1" />
      <rect x="135" y="15" width="8" height="8" class="steam steam-2" />
    </g>

    <g class="avatar-bob">
      <rect x="123" y="52" width="4" height="16" fill="#3f6212" class="sprout-stem" />

      <g class="propeller-group" style={`transform: rotate(${spinAngle.toFixed(3)}deg);`}>
        <path
          class="sprout-leaf-outline"
          d="M122 21h6v4h6v4h4v8h-4v4h-6v4h-6v-4h-6v-4h-4v-8h4v-4h6z"
          fill="var(--leaf-1-border)"
        />
        <path
          class="sprout-leaf-fill"
          d="M124 25h2v4h6v8h-6v4h-2v-4h-6v-8h6z"
          fill="var(--leaf-1-fill)"
        />

        <path
          class="sprout-leaf-outline"
          d="M122 77h6v-4h6v-4h4v-8h-4v-4h-6v-4h-6v4h-6v4h-4v8h4v4h6z"
          fill="var(--leaf-2-border)"
        />
        <path
          class="sprout-leaf-fill"
          d="M124 73h2v-4h6v-8h-6v-4h-2v4h-6v8h6z"
          fill="var(--leaf-2-fill)"
        />

        <rect x="121" y="45" width="8" height="8" fill="#eef6cf" />
        <rect x="123" y="47" width="4" height="4" fill="#f8fce7" />
      </g>

      <g class="body-group">
        <g class="arm-group arm-left">
          <rect x="78" y="134" width="8" height="4" class="arm-outline" />
          <rect x="72" y="138" width="8" height="4" class="arm-outline" />
          <rect x="68" y="142" width="8" height="4" class="arm-outline" />
          <rect x="80" y="134" width="4" height="4" class="arm-fill" />
          <rect x="74" y="138" width="4" height="4" class="arm-fill" />
          <rect x="70" y="142" width="4" height="4" class="arm-fill" />
        </g>

        <g class="arm-group arm-right">
          <rect x="164" y="134" width="8" height="4" class="arm-outline" />
          <rect x="170" y="138" width="8" height="4" class="arm-outline" />
          <rect x="174" y="142" width="8" height="4" class="arm-outline" />
          <rect x="166" y="134" width="4" height="4" class="arm-fill" />
          <rect x="172" y="138" width="4" height="4" class="arm-fill" />
          <rect x="176" y="142" width="4" height="4" class="arm-fill" />
        </g>

        <path
          class="pixel-body transition-logic"
          fill="var(--body-fill)"
          d={getBodyPath(motion)}
        />

        <g class="arm-group arm-left">
          <rect x="46" y="140" width="16" height="14" class="arm-outline" />
          <rect x="42" y="144" width="6" height="8" class="arm-outline" />
          <rect x="50" y="136" width="8" height="4" class="arm-outline" />
          <rect x="50" y="142" width="10" height="10" class="hand-fill" />
          <rect x="44" y="146" width="4" height="4" class="hand-fill" />
          <rect x="50" y="138" width="6" height="4" class="hand-fill" />
          <rect x="52" y="144" width="4" height="2" class="hand-highlight" />
          <rect x="56" y="146" width="2" height="2" class="hand-highlight" />
        </g>

        <g class="arm-group arm-right">
          <rect x="188" y="140" width="16" height="14" class="arm-outline" />
          <rect x="204" y="144" width="6" height="8" class="arm-outline" />
          <rect x="194" y="136" width="8" height="4" class="arm-outline" />
          <rect x="190" y="142" width="10" height="10" class="hand-fill" />
          <rect x="204" y="146" width="4" height="4" class="hand-fill" />
          <rect x="194" y="138" width="6" height="4" class="hand-fill" />
          <rect x="196" y="144" width="4" height="2" class="hand-highlight" />
          <rect x="194" y="146" width="2" height="2" class="hand-highlight" />
        </g>

        <g class="melt-drips">
          <rect x="118" y="184" width="8" height="4" />
          <rect x="120" y="188" width="4" height="4" />

          <rect x="100" y="188" width="10" height="4" />
          <rect x="102" y="192" width="6" height="10" />
          <rect x="104" y="202" width="2" height="6" />

          <rect x="138" y="186" width="12" height="4" />
          <rect x="140" y="190" width="8" height="8" />
          <rect x="142" y="198" width="4" height="10" />
        </g>

        <g class="face-group transition-logic">
          <g class="face-idle face-pixels">
            <rect x="86" y="104" width="6" height="6" />
            <rect x="92" y="98" width="6" height="6" />
            <rect x="98" y="104" width="6" height="6" />

            <rect x="146" y="104" width="6" height="6" />
            <rect x="152" y="98" width="6" height="6" />
            <rect x="158" y="104" width="6" height="6" />

            <rect x="112" y="124" width="24" height="6" />
          </g>

          <g class="face-heated">
            <rect x="84" y="108" width="6" height="6" />
            <rect x="90" y="114" width="6" height="6" />
            <rect x="96" y="120" width="6" height="6" />
            <rect x="90" y="126" width="6" height="6" />
            <rect x="84" y="132" width="6" height="6" />

            <rect x="112" y="136" width="24" height="6" />

            <rect x="160" y="108" width="6" height="6" />
            <rect x="154" y="114" width="6" height="6" />
            <rect x="148" y="120" width="6" height="6" />
            <rect x="154" y="126" width="6" height="6" />
            <rect x="160" y="132" width="6" height="6" />
          </g>

          <rect x="68" y="128" width="16" height="6" class="cheek" />
          <rect x="166" y="128" width="16" height="6" class="cheek" />
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

  .transition-logic {
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .avatar-bob {
    animation: bob var(--breathe-speed) ease-in-out infinite;
  }

  .body-group {
    animation: squash var(--breathe-speed) ease-in-out infinite;
    transform-origin: 125px 184px;
  }

  .propeller-group {
    transform-origin: 125px 49px;
    transform-box: view-box;
    will-change: transform;
  }

  .arm-group {
    will-change: transform;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .arm-left {
    transform-origin: 82px 130px;
    transform: rotate(var(--left-arm-rotate));
    animation: arm-left-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite;
  }

  .arm-right {
    transform-origin: 168px 130px;
    transform: rotate(var(--right-arm-rotate));
    animation: arm-right-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite 0.16s;
  }

  .sprout-stem,
  .pixel-body,
  .face-group,
  .melt-drips,
  .cheek,
  .arm-outline,
  .arm-fill,
  .hand-fill,
  .hand-highlight {
    shape-rendering: crispEdges;
  }

  .arm-outline {
    fill: var(--arm-outline);
  }

  .arm-fill {
    fill: var(--arm-fill);
  }

  .hand-fill {
    fill: var(--hand-fill);
  }

  .hand-highlight {
    fill: var(--hand-highlight);
    opacity: 0.92;
  }

  .sprout-leaf-outline,
  .sprout-leaf-fill {
    transition:
      fill 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .face-group {
    transform: translateY(var(--face-y));
  }

  .face-pixels {
    fill: var(--face-fill);
    transition:
      fill 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .face-idle {
    opacity: calc(1 - var(--heat-alpha));
  }

  .face-heated {
    fill: #5f0f16;
    opacity: var(--heat-alpha);
    animation: face-jitter 0.16s steps(2, end) infinite;
    transition:
      opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .cheek {
    fill: #ffb6c1;
    opacity: calc(var(--heat-alpha) * 0.85);
  }

  .melt-drips {
    fill: var(--body-fill);
    opacity: calc(var(--heat-alpha) * 0.92);
    transition:
      opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .steam-group {
    opacity: var(--heat-alpha);
  }

  .steam {
    fill: #ffffff;
    opacity: 0;
  }

  .steam-1 {
    animation: pixel-float var(--steam-speed) infinite;
  }

  .steam-2 {
    animation: pixel-float var(--steam-speed) infinite 0.28s;
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(var(--melt-drop));
    }
  }

  @keyframes squash {
    0%,
    100% {
      transform: scaleY(1);
    }

    50% {
      transform: scaleY(var(--melt-squash));
    }
  }

  @keyframes pixel-float {
    0% {
      transform: translateY(0);
      opacity: 0;
    }

    20% {
      opacity: 0.8;
    }

    100% {
      transform: translateY(-60px);
      opacity: 0;
    }
  }

  @keyframes face-jitter {
    0%,
    100% {
      transform: translateX(0);
    }

    25% {
      transform: translateX(calc(var(--face-jitter) * -1));
    }

    75% {
      transform: translateX(var(--face-jitter));
    }
  }

  @keyframes arm-left-idle {
    0%,
    100% {
      transform: rotate(var(--left-arm-rotate)) translateY(0);
    }

    50% {
      transform: rotate(var(--left-arm-rotate)) translateY(calc(var(--arm-bob-distance) * -1));
    }
  }

  @keyframes arm-right-idle {
    0%,
    100% {
      transform: rotate(var(--right-arm-rotate)) translateY(0);
    }

    50% {
      transform: rotate(var(--right-arm-rotate)) translateY(var(--arm-bob-distance));
    }
  }
</style>
