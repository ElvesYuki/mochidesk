<script lang="ts">
  interface Props {
    layer: "back" | "front";
    interactionPulse?: number;
  }

  let { layer, interactionPulse = 0 }: Props = $props();
</script>

{#key interactionPulse}
  {#if layer === "back"}
    <g class="arm-group arm-left">
      <rect x="76" y="132" width="10" height="4" class="arm-outline" />
      <rect x="70" y="136" width="10" height="6" class="arm-outline" />
      <rect x="64" y="142" width="10" height="6" class="arm-outline" />
      <rect x="78" y="132" width="6" height="4" class="arm-fill" />
      <rect x="72" y="138" width="6" height="4" class="arm-fill" />
      <rect x="66" y="144" width="6" height="4" class="arm-fill" />
    </g>

    <g class="arm-group arm-right">
      <rect x="164" y="132" width="10" height="4" class="arm-outline" />
      <rect x="170" y="136" width="10" height="6" class="arm-outline" />
      <rect x="176" y="142" width="10" height="6" class="arm-outline" />
      <rect x="166" y="132" width="6" height="4" class="arm-fill" />
      <rect x="172" y="138" width="6" height="4" class="arm-fill" />
      <rect x="178" y="144" width="6" height="4" class="arm-fill" />
    </g>
  {:else}
    <g class="arm-group arm-left">
      <rect x="42" y="138" width="20" height="16" class="arm-outline" />
      <rect x="36" y="142" width="8" height="10" class="arm-outline" />
      <rect x="48" y="134" width="10" height="4" class="arm-outline" />
      <rect x="46" y="140" width="14" height="12" class="hand-fill" />
      <rect x="38" y="144" width="6" height="6" class="hand-fill" />
      <rect x="48" y="136" width="8" height="4" class="hand-fill" />
      <rect x="50" y="142" width="6" height="3" class="hand-highlight" />
      <rect x="56" y="145" width="3" height="3" class="hand-highlight" />
    </g>

    <g class="arm-group arm-right">
      <rect x="188" y="138" width="20" height="16" class="arm-outline" />
      <rect x="208" y="142" width="8" height="10" class="arm-outline" />
      <rect x="194" y="134" width="10" height="4" class="arm-outline" />
      <rect x="190" y="140" width="14" height="12" class="hand-fill" />
      <rect x="208" y="144" width="6" height="6" class="hand-fill" />
      <rect x="196" y="136" width="8" height="4" class="hand-fill" />
      <rect x="198" y="142" width="6" height="3" class="hand-highlight" />
      <rect x="195" y="145" width="3" height="3" class="hand-highlight" />
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
      arm-left-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite,
      arm-left-tap 0.24s ease-out 1;
  }

  .arm-right {
    transform-origin: 168px 130px;
    transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale));
    animation:
      arm-right-idle calc(var(--breathe-speed) * 0.95) ease-in-out infinite 0.16s,
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

  @keyframes arm-left-idle {
    0%,
    100% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(var(--drag-left-lift));
    }

    50% {
      transform: rotate(var(--left-arm-rotate)) scale(var(--hand-scale))
        translateY(
          calc(var(--drag-left-lift) + var(--arm-bob-distance) * -1 - var(--busy-arm-fidget))
        );
    }
  }

  @keyframes arm-right-idle {
    0%,
    100% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(var(--drag-right-lift));
    }

    50% {
      transform: rotate(var(--right-arm-rotate)) scale(var(--hand-scale))
        translateY(calc(var(--drag-right-lift) + var(--arm-bob-distance) - var(--busy-arm-fidget)));
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
</style>
