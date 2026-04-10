<script lang="ts">
  import type { CodexActivity } from "$lib/models/codex-status";

  interface Props {
    activity: CodexActivity;
    layer?: "back" | "front";
    role?: "all" | "terminal" | "keyboard";
  }

  let { activity, layer = "back", role = "all" }: Props = $props();
</script>

<g class="codex-effects">
  <g class="thought-bubble" aria-hidden={activity !== "thinking" || layer !== "back" || role !== "all"}>
    <rect x="164" y="20" width="40" height="22" rx="4" ry="4" class="bubble-body" />
    <rect x="176" y="44" width="6" height="6" class="bubble-tail" />
    <rect x="170" y="52" width="4" height="4" class="bubble-tail tail-small" />

    <rect x="172" y="27" width="5" height="5" class="bubble-dot dot-1" />
    <rect x="181" y="27" width="5" height="5" class="bubble-dot dot-2" />
    <rect x="190" y="27" width="5" height="5" class="bubble-dot dot-3" />
  </g>

  {#if layer === "back"}
    <g class="typing-rig typing-rig-back" aria-hidden={activity !== "acting"}>
      <rect
        x="70"
        y="158"
        width="110"
        height="20"
        rx="3"
        ry="3"
        class="keyboard-base"
        aria-hidden={role === "terminal"}
      />

      <g class="keyboard-keys" aria-hidden={role === "terminal"}>
        <rect x="78" y="162" width="6" height="3" />
        <rect x="90" y="162" width="6" height="3" />
        <rect x="102" y="162" width="6" height="3" />
        <rect x="114" y="162" width="6" height="3" />
        <rect x="126" y="162" width="6" height="3" />
        <rect x="138" y="162" width="6" height="3" />
        <rect x="150" y="162" width="6" height="3" />
        <rect x="162" y="162" width="6" height="3" />

        <rect x="82" y="167" width="8" height="3" />
        <rect x="96" y="167" width="8" height="3" />
        <rect x="110" y="167" width="8" height="3" />
        <rect x="124" y="167" width="8" height="3" />
        <rect x="138" y="167" width="8" height="3" />
        <rect x="152" y="167" width="8" height="3" />

        <rect x="92" y="172" width="24" height="2" />
        <rect x="120" y="172" width="36" height="2" />
      </g>
    </g>
  {:else}
    <g class="typing-rig typing-rig-front" aria-hidden={activity !== "acting" || role !== "terminal"}>
      <rect x="76" y="-18" width="70" height="48" rx="4" ry="4" class="laptop-screen" />
      <rect x="82" y="-10" width="8" height="4" class="window-dot window-dot-red" />
      <rect x="94" y="-10" width="8" height="4" class="window-dot window-dot-yellow" />
      <rect x="106" y="-10" width="8" height="4" class="window-dot window-dot-green" />
      <rect x="84" y="2" width="26" height="4" class="terminal-line line-1" />
      <rect x="84" y="10" width="44" height="4" class="terminal-line line-2" />
      <rect x="84" y="18" width="24" height="4" class="terminal-line line-3" />
      <rect x="112" y="18" width="22" height="4" class="terminal-line line-4" />
      <rect x="84" y="26" width="30" height="4" class="terminal-line line-5" />
    </g>
  {/if}

  <g class="notice-mark" aria-hidden={activity !== "notice" || layer !== "back" || role !== "all"}>
    <rect x="180" y="38" width="8" height="28" class="notice-main" />
    <rect x="180" y="72" width="8" height="8" class="notice-main" />
    <rect x="170" y="46" width="6" height="6" class="notice-shadow" />
  </g>

  <g class="error-sweat" aria-hidden={(activity !== "error" && activity !== "error_burst") || layer !== "back" || role !== "all"}>
    <path
      d="M178 86h8v6h-2v4h-2v4h-2v-4h-2v-4h2z"
      class="sweat-drop sweat-main"
    />
    <rect x="170" y="96" width="8" height="4" class="stress-mark mark-1" />
    <rect x="164" y="102" width="6" height="4" class="stress-mark mark-2" />
  </g>

  <g class="celebrate-plus" aria-hidden={activity !== "celebrate" || layer !== "back" || role !== "all"}>
    <rect x="182" y="54" width="8" height="28" class="plus-main" />
    <rect x="172" y="64" width="28" height="8" class="plus-main" />
    <rect x="168" y="60" width="4" height="4" class="plus-glint" />
  </g>

  <g class="done-sparkles" aria-hidden={(activity !== "done" && activity !== "celebrate") || layer !== "back" || role !== "all"}>
    <g class="sparkle sparkle-left">
      <rect x="70" y="70" width="4" height="12" />
      <rect x="66" y="74" width="12" height="4" />
      <rect x="68" y="72" width="8" height="8" />
    </g>

    <g class="sparkle sparkle-top">
      <rect x="118" y="24" width="4" height="12" />
      <rect x="114" y="28" width="12" height="4" />
      <rect x="116" y="26" width="8" height="8" />
    </g>

    <g class="sparkle sparkle-right">
      <rect x="176" y="64" width="4" height="12" />
      <rect x="172" y="68" width="12" height="4" />
      <rect x="174" y="66" width="8" height="8" />
    </g>
  </g>
</g>

<style>
  .codex-effects {
    pointer-events: none;
  }

  .thought-bubble,
  .typing-rig,
  .notice-mark,
  .error-sweat,
  .celebrate-plus,
  .done-sparkles {
    shape-rendering: crispEdges;
    transition:
      opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .thought-bubble {
    opacity: var(--codex-thinking-opacity);
    transform:
      translate(var(--codex-thinking-shift-x), var(--codex-thinking-shift-y))
      scale(var(--codex-thinking-scale));
    transform-origin: 184px 32px;
    animation: thought-bubble-drift 1.8s ease-in-out infinite;
  }

  .bubble-body,
  .bubble-tail {
    fill: #fffaf0;
    stroke: rgb(160 179 208 / 0.38);
    stroke-width: 1.5px;
    paint-order: stroke fill;
  }

  .bubble-dot {
    fill: #5d8fda;
    animation: bubble-pulse 1.05s steps(1, end) infinite;
    opacity: var(--codex-thinking-dot-opacity);
  }

  .dot-1,
  .dot-3 {
    opacity: calc(var(--codex-thinking-dot-opacity) * 0.82);
  }

  .dot-2 {
    animation-delay: 0.16s;
    fill: #73a6f2;
  }

  .dot-3 {
    animation-delay: 0.32s;
  }

  .tail-small {
    opacity: 0.82;
  }

  .typing-rig {
    opacity: var(--codex-acting-opacity);
    transform: translate(var(--codex-acting-shift-x), var(--codex-acting-shift-y));
  }

  .error-sweat {
    opacity: var(--codex-error-opacity);
    transform:
      translate(var(--codex-error-shift-x), var(--codex-error-shift-y))
      scale(var(--codex-error-scale));
    transform-origin: 176px 94px;
    animation: error-drop-release 0.78s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .notice-mark {
    opacity: var(--codex-notice-opacity);
    transform: translate(var(--codex-notice-shift-x), var(--codex-notice-shift-y));
    transform-origin: 184px 58px;
    animation: notice-bounce 0.82s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .celebrate-plus {
    opacity: var(--codex-celebrate-opacity);
    transform: translate(var(--codex-celebrate-shift-x), var(--codex-celebrate-shift-y));
    transform-origin: 186px 68px;
    animation: celebrate-pop 0.74s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .done-sparkles {
    opacity: var(--codex-done-opacity);
    transform:
      translate(var(--codex-done-shift-x), var(--codex-done-shift-y))
      scale(var(--codex-done-scale));
    animation: done-sparkle-burst 0.72s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .laptop-screen {
    fill: #2b2c3c;
  }

  .window-dot-red {
    fill: #f87171;
  }

  .window-dot-yellow {
    fill: #fbbf24;
  }

  .window-dot-green {
    fill: #4ade80;
  }

  .terminal-line {
    fill: #65db7d;
    animation: terminal-blink 0.9s steps(1, end) infinite;
  }

  .line-2 {
    animation-delay: 0.22s;
  }

  .line-3 {
    animation-delay: 0.34s;
  }

  .line-4 {
    animation-delay: 0.46s;
  }

  .line-5 {
    animation-delay: 0.58s;
  }

  .keyboard-base {
    fill: #7f95a0;
  }

  .keyboard-keys {
    fill: #a8bbc4;
    animation: keyboard-tap 0.16s steps(2, end) infinite;
    transform-origin: 125px 166px;
  }

  .typing-rig-back .keyboard-keys rect:nth-child(odd) {
    animation: key-left-hit 0.16s steps(2, end) infinite;
  }

  .typing-rig-back .keyboard-keys rect:nth-child(even) {
    animation: key-right-hit 0.16s steps(2, end) infinite;
  }

  .sweat-drop {
    fill: #7db8ff;
    animation: sweat-wobble 0.72s steps(2, end) infinite;
  }

  .stress-mark {
    fill: #be4b5c;
    animation: stress-flicker 0.52s steps(1, end) infinite;
  }

  .notice-main {
    fill: #ff5a18;
  }

  .notice-shadow {
    fill: #ffb18c;
    animation: notice-shadow-flicker 0.82s steps(2, end) infinite;
  }

  .plus-main {
    fill: #ff9f0a;
  }

  .plus-glint {
    fill: #ffd36b;
    animation: plus-glint-pop 0.74s steps(2, end) infinite;
  }

  .mark-2 {
    animation-delay: 0.14s;
  }

  .sparkle {
    fill: #ffd66b;
    animation: sparkle-pop 0.88s steps(2, end) infinite;
    transform-origin: center;
  }

  .sparkle-top {
    animation-delay: 0.12s;
  }

  .sparkle-right {
    animation-delay: 0.24s;
  }

  @keyframes bubble-pulse {
    0%,
    100% {
      opacity: 0.28;
      transform: translateY(0);
    }

    50% {
      opacity: 1;
      transform: translateY(-1px);
    }
  }

  .dot-2 {
    animation-name: bubble-pulse-focus;
  }

  @keyframes thought-bubble-drift {
    0%,
    100% {
      transform:
        translate(var(--codex-thinking-shift-x), var(--codex-thinking-shift-y))
        scale(var(--codex-thinking-scale));
    }

    50% {
      transform:
        translate(
          var(--codex-thinking-shift-x),
          calc(var(--codex-thinking-shift-y) + var(--codex-thinking-float))
        )
        scale(calc(var(--codex-thinking-scale) * 1.02));
    }
  }

  @keyframes bubble-pulse-focus {
    0%,
    100% {
      opacity: 0.46;
      transform: translateY(0);
    }

    50% {
      opacity: 1;
      transform: translateY(-1px);
    }
  }

  @keyframes terminal-blink {
    0%,
    100% {
      opacity: 0.5;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes keyboard-tap {
    0%,
    100% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(2px);
    }
  }

  @keyframes key-left-hit {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.9;
    }

    50% {
      transform: translateY(2px);
      opacity: 1;
    }
  }

  @keyframes key-right-hit {
    0%,
    100% {
      transform: translateY(2px);
      opacity: 1;
    }

    50% {
      transform: translateY(0);
      opacity: 0.88;
    }
  }

  @keyframes notice-bounce {
    0%,
    100% {
      transform: translate(var(--codex-notice-shift-x), var(--codex-notice-shift-y));
    }

    30% {
      transform: translate(
        var(--codex-notice-shift-x),
        calc(var(--codex-notice-shift-y) + -2px)
      );
    }

    58% {
      transform: translate(
        var(--codex-notice-shift-x),
        calc(var(--codex-notice-shift-y) + 0.8px)
      );
    }
  }

  @keyframes celebrate-pop {
    0%,
    100% {
      transform: translate(var(--codex-celebrate-shift-x), var(--codex-celebrate-shift-y))
        scale(1);
    }

    34% {
      transform: translate(var(--codex-celebrate-shift-x), calc(var(--codex-celebrate-shift-y) + -1.4px))
        scale(1.08);
    }

    66% {
      transform: translate(var(--codex-celebrate-shift-x), calc(var(--codex-celebrate-shift-y) + 0.5px))
        scale(0.96);
    }
  }

  @keyframes sweat-wobble {
    0%,
    100% {
      transform: translate(0, 0);
    }

    50% {
      transform: translate(-1px, 1px);
    }
  }

  @keyframes stress-flicker {
    0%,
    100% {
      opacity: 0.42;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes notice-shadow-flicker {
    0%,
    100% {
      opacity: 0.4;
    }

    50% {
      opacity: 0.9;
    }
  }

  @keyframes plus-glint-pop {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(0.86);
    }

    50% {
      opacity: 1;
      transform: scale(1.14);
    }
  }

  @keyframes error-drop-release {
    0%,
    100% {
      transform:
        translate(var(--codex-error-shift-x), var(--codex-error-shift-y))
        scale(var(--codex-error-scale));
    }

    26% {
      transform:
        translate(
          calc(var(--codex-error-shift-x) + 0.5px * var(--codex-error-drop)),
          calc(var(--codex-error-shift-y) + -0.6px * var(--codex-error-drop))
        )
        scale(calc(var(--codex-error-scale) + 0.03 * var(--codex-error-drop)));
    }

    60% {
      transform:
        translate(
          calc(var(--codex-error-shift-x) + -0.8px * var(--codex-error-drop)),
          calc(var(--codex-error-shift-y) + 1.4px * var(--codex-error-drop))
        )
        scale(calc(var(--codex-error-scale) - 0.04 * var(--codex-error-drop)));
    }
  }

  @keyframes sparkle-pop {
    0%,
    100% {
      opacity: 0.28;
      transform: scale(0.86);
    }

    50% {
      opacity: 1;
      transform: scale(1.08);
    }
  }

  @keyframes done-sparkle-burst {
    0%,
    100% {
      transform:
        translate(var(--codex-done-shift-x), var(--codex-done-shift-y))
        scale(var(--codex-done-scale));
    }

    35% {
      transform:
        translate(
          var(--codex-done-shift-x),
          calc(var(--codex-done-shift-y) + -1px * var(--codex-done-burst))
        )
        scale(calc(var(--codex-done-scale) + 0.05 * var(--codex-done-burst)));
    }

    68% {
      transform:
        translate(
          var(--codex-done-shift-x),
          calc(var(--codex-done-shift-y) + 0.6px * var(--codex-done-burst))
        )
        scale(calc(var(--codex-done-scale) - 0.02 * var(--codex-done-burst)));
    }
  }
</style>
