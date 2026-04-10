<script lang="ts">
  import type { CodexActivity } from "$lib/models/codex-status";

  interface Props {
    layer: "back" | "front";
    activity?: CodexActivity;
    interactionPulse?: number;
  }

  let { layer, activity = "idle", interactionPulse = 0 }: Props = $props();
</script>

{#key interactionPulse}
  {#if layer === "back"}
    <g class="arm-group arm-left" class:is-acting={activity === "acting"}>
      <rect x="76" y="132" width="10" height="4" class="arm-outline" />
      <rect x="70" y="136" width="10" height="6" class="arm-outline" />
      <rect x="64" y="142" width="10" height="6" class="arm-outline" />
      <rect x="78" y="132" width="6" height="4" class="arm-fill" />
      <rect x="72" y="138" width="6" height="4" class="arm-fill" />
      <rect x="66" y="144" width="6" height="4" class="arm-fill" />
    </g>

    <g class="arm-group arm-right" class:is-acting={activity === "acting"}>
      <rect x="164" y="132" width="10" height="4" class="arm-outline" />
      <rect x="170" y="136" width="10" height="6" class="arm-outline" />
      <rect x="176" y="142" width="10" height="6" class="arm-outline" />
      <rect x="166" y="132" width="6" height="4" class="arm-fill" />
      <rect x="172" y="138" width="6" height="4" class="arm-fill" />
      <rect x="178" y="144" width="6" height="4" class="arm-fill" />
    </g>
  {:else}
    <g class="arm-group arm-left" class:is-acting={activity === "acting"}>
      <rect x="42" y="138" width="20" height="16" class="arm-outline" />
      <rect x="36" y="142" width="8" height="10" class="arm-outline" />
      <rect x="48" y="134" width="10" height="4" class="arm-outline" />
      <rect x="46" y="140" width="14" height="12" class="hand-fill" />
      <rect x="38" y="144" width="6" height="6" class="hand-fill" />
      <rect x="48" y="136" width="8" height="4" class="hand-fill" />
      <rect x="50" y="142" width="6" height="3" class="hand-highlight" />
      <rect x="56" y="145" width="3" height="3" class="hand-highlight" />

      {#if activity === "acting"}
        <g class="typing-paw typing-paw-left">
          <rect x="42" y="150" width="20" height="8" class="hand-fill" />
          <rect x="40" y="154" width="6" height="4" class="hand-fill" />
          <rect x="58" y="154" width="6" height="4" class="hand-fill" />
          <rect x="46" y="152" width="12" height="3" class="hand-highlight" />
        </g>
      {/if}
    </g>

    <g class="arm-group arm-right" class:is-acting={activity === "acting"}>
      <rect x="188" y="138" width="20" height="16" class="arm-outline" />
      <rect x="208" y="142" width="8" height="10" class="arm-outline" />
      <rect x="194" y="134" width="10" height="4" class="arm-outline" />
      <rect x="190" y="140" width="14" height="12" class="hand-fill" />
      <rect x="208" y="144" width="6" height="6" class="hand-fill" />
      <rect x="196" y="136" width="8" height="4" class="hand-fill" />
      <rect x="198" y="142" width="6" height="3" class="hand-highlight" />
      <rect x="195" y="145" width="3" height="3" class="hand-highlight" />

      {#if activity === "acting"}
        <g class="typing-paw typing-paw-right">
          <rect x="190" y="150" width="20" height="8" class="hand-fill" />
          <rect x="188" y="154" width="6" height="4" class="hand-fill" />
          <rect x="206" y="154" width="6" height="4" class="hand-fill" />
          <rect x="194" y="152" width="12" height="3" class="hand-highlight" />
        </g>
      {/if}
    </g>
  {/if}
{/key}

<style>
  .arm-group {
    will-change: transform;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .arm-left {
    transform-origin: 82px 130px;
    transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale));
    animation:
      arm-left-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite var(--codex-left-phase),
      arm-left-tap 0.24s ease-out 1;
  }

  .arm-right {
    transform-origin: 168px 130px;
    transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale));
    animation:
      arm-right-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite var(--codex-right-phase),
      arm-right-tap 0.24s ease-out 1;
  }

  .arm-left.is-acting {
    animation:
      arm-left-typing var(--codex-typing-seconds) cubic-bezier(0.3, 0, 0.2, 1) infinite
        var(--codex-left-phase),
      arm-left-tap 0.24s ease-out 1;
  }

  .arm-right.is-acting {
    animation:
      arm-right-typing var(--codex-typing-seconds) cubic-bezier(0.3, 0, 0.2, 1) infinite
        var(--codex-right-phase),
      arm-right-tap 0.24s ease-out 1;
  }

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

  .typing-paw {
    opacity: var(--codex-acting-hand-opacity);
    animation: typing-paw-hit var(--codex-typing-seconds) cubic-bezier(0.28, 0, 0.22, 1) infinite;
    transform-origin: center top;
  }

  .typing-paw-left {
    animation-delay: 0s;
  }

  .typing-paw-right {
    animation-delay: var(--codex-right-phase);
  }

  @keyframes arm-left-typing {
    0%,
    100% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(calc(var(--drag-left-lift) + var(--codex-left-lift)));
    }

    20% {
      transform: rotate(calc(var(--left-arm-rotate) - 1.5deg)) scale(var(--hand-scale))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) -
              var(--arm-bob-distance) * 0.24
          )
        );
    }

    42% {
      transform: rotate(calc(var(--left-arm-rotate) + 4deg))
        scale(calc(var(--hand-scale) + 0.025))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) +
              var(--arm-bob-distance) * var(--codex-left-bob-factor) +
              var(--busy-arm-fidget)
          )
        );
    }

    58% {
      transform: rotate(calc(var(--left-arm-rotate) + 1.2deg))
        scale(calc(var(--hand-scale) + 0.01))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) +
              var(--arm-bob-distance) * 0.26
          )
        );
    }
  }

  @keyframes arm-right-typing {
    0%,
    100% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(calc(var(--drag-right-lift) + var(--codex-right-lift)));
    }

    20% {
      transform: rotate(calc(var(--right-arm-rotate) + 1.5deg)) scale(var(--hand-scale))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) -
              var(--arm-bob-distance) * 0.2
          )
        );
    }

    42% {
      transform: rotate(calc(var(--right-arm-rotate) - 4deg))
        scale(calc(var(--hand-scale) + 0.025))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) +
              var(--arm-bob-distance) * var(--codex-right-bob-factor) +
              var(--busy-arm-fidget)
          )
        );
    }

    58% {
      transform: rotate(calc(var(--right-arm-rotate) - 1.2deg))
        scale(calc(var(--hand-scale) + 0.01))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) +
              var(--arm-bob-distance) * 0.22
          )
        );
    }
  }

  @keyframes arm-left-idle {
    0%,
    100% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(calc(var(--drag-left-lift) + var(--codex-left-lift)));
    }

    50% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) +
              var(--arm-bob-distance) * -1 * var(--codex-left-bob-factor) -
              var(--busy-arm-fidget)
          )
        );
    }

    62% {
      transform: rotate(calc(var(--left-arm-rotate) + 10deg))
        scale(calc(var(--hand-scale) + 0.06))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) +
              var(--arm-bob-distance) * -1.5 * var(--codex-left-bob-factor) -
              var(--busy-arm-fidget)
          )
        );
    }

    72% {
      transform: rotate(calc(var(--left-arm-rotate) + 12deg)) scale(calc(var(--hand-scale) + 0.08))
        translateY(
          calc(
            var(--drag-left-lift) + var(--codex-left-lift) +
              var(--arm-bob-distance) * -1.15 * var(--codex-left-bob-factor)
          )
        );
    }
  }

  @keyframes arm-right-idle {
    0%,
    100% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(calc(var(--drag-right-lift) + var(--codex-right-lift)));
    }

    50% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) +
              var(--arm-bob-distance) * var(--codex-right-bob-factor) -
              var(--busy-arm-fidget)
          )
        );
    }

    28% {
      transform: rotate(calc(var(--right-arm-rotate) - 10deg))
        scale(calc(var(--hand-scale) + 0.06))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) +
              var(--arm-bob-distance) * 1.45 * var(--codex-right-bob-factor) -
              var(--busy-arm-fidget)
          )
        );
    }

    72% {
      transform: rotate(calc(var(--right-arm-rotate) - 12deg)) scale(calc(var(--hand-scale) + 0.08))
        translateY(
          calc(
            var(--drag-right-lift) + var(--codex-right-lift) +
              var(--arm-bob-distance) * 1.08 * var(--codex-right-bob-factor)
          )
        );
    }
  }

  @keyframes arm-left-tap {
    0%,
    100% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(var(--drag-left-lift));
    }

    40% {
      transform: rotate(calc(var(--left-arm-rotate) + var(--tap-left-rotate)))
        scale(calc(var(--hand-scale) + var(--tap-hand-scale-boost)))
        translateY(calc(var(--drag-left-lift) + var(--tap-left-lift)));
    }
  }

  @keyframes arm-right-tap {
    0%,
    100% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(var(--drag-right-lift));
    }

    40% {
      transform: rotate(calc(var(--right-arm-rotate) + var(--tap-right-rotate)))
        scale(calc(var(--hand-scale) + var(--tap-hand-scale-boost)))
        translateY(calc(var(--drag-right-lift) + var(--tap-right-lift)));
    }
  }

  @keyframes typing-paw-hit {
    0%,
    100% {
      transform: translateY(0);
      opacity: var(--codex-acting-hand-opacity);
    }

    18% {
      transform: translateY(-0.8px) scaleY(1.01);
      opacity: var(--codex-acting-hand-opacity);
    }

    42% {
      transform: translateY(2.4px) scaleY(0.95);
      opacity: calc(var(--codex-acting-hand-opacity) * 0.96);
    }

    60% {
      transform: translateY(0.6px) scaleY(0.985);
      opacity: calc(var(--codex-acting-hand-opacity) * 0.98);
    }
  }
</style>
