<script lang="ts">
  interface Props {
    variant: "steam" | "melt";
    isBusy?: boolean;
  }

  let { variant, isBusy = false }: Props = $props();
</script>

{#if variant === "steam"}
  <g class="steam-group" aria-hidden={!isBusy}>
    <rect x="110" y="30" width="6" height="6" class="steam steam-1" />
    <rect x="135" y="15" width="8" height="8" class="steam steam-2" />
  </g>
{:else}
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
{/if}

<style>
  .melt-drips {
    shape-rendering: crispEdges;
    fill: var(--body-shadow);
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
</style>
