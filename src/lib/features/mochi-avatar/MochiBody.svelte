<script lang="ts">
  interface Props {
    variant: "top" | "shell";
    spinAngle?: number;
    bodyPath?: string;
  }

  let { variant, spinAngle = 0, bodyPath = "" }: Props = $props();
</script>

{#if variant === "top"}
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
{:else}
  <path
    class="pixel-body transition-logic"
    fill="var(--body-fill)"
    d={bodyPath}
  />
{/if}

<style>
  .transition-logic {
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sprout-stem,
  .pixel-body {
    shape-rendering: crispEdges;
  }

  .propeller-group {
    transform-origin: 125px 49px;
    transform-box: view-box;
    will-change: transform;
  }

  .sprout-leaf-outline,
  .sprout-leaf-fill {
    transition:
      fill 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
