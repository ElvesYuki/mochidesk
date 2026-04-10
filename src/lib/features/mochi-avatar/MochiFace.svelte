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

  <g class="face-alert face-pixels">
    <rect x="84" y="102" width="6" height="6" />
    <rect x="92" y="96" width="10" height="6" />
    <rect x="100" y="102" width="6" height="6" />

    <rect x="144" y="102" width="6" height="6" />
    <rect x="150" y="96" width="10" height="6" />
    <rect x="158" y="102" width="6" height="6" />

    <rect x="110" y="122" width="6" height="6" />
    <rect x="116" y="128" width="16" height="6" />
    <rect x="132" y="122" width="6" height="6" />
  </g>

  <g class="face-press face-pixels">
    <rect x="88" y="108" width="18" height="4" />
    <rect x="144" y="108" width="18" height="4" />
    <rect x="114" y="128" width="20" height="6" />
  </g>

  <g class="face-focus face-codex face-pixels">
    <rect x="88" y="98" width="14" height="4" />
    <rect x="148" y="98" width="14" height="4" />
    <rect x="118" y="124" width="12" height="4" />
  </g>

  <g class="face-acting face-codex face-pixels">
    <rect x="86" y="96" width="16" height="4" />
    <rect x="148" y="96" width="16" height="4" />
    <rect x="116" y="122" width="18" height="4" />
    <rect x="120" y="126" width="10" height="4" />
  </g>

  <g class="face-wait face-codex face-pixels">
    <rect x="92" y="104" width="8" height="4" />
    <rect x="150" y="104" width="8" height="4" />
    <rect x="118" y="124" width="4" height="4" />
    <rect x="126" y="124" width="4" height="4" />
    <rect x="122" y="130" width="4" height="4" />
  </g>

  <g class="face-error face-codex face-pixels">
    <rect x="86" y="100" width="6" height="4" />
    <rect x="92" y="104" width="6" height="4" />
    <rect x="98" y="108" width="6" height="4" />

    <rect x="146" y="108" width="6" height="4" />
    <rect x="152" y="104" width="6" height="4" />
    <rect x="158" y="100" width="6" height="4" />

    <rect x="114" y="132" width="20" height="4" />
  </g>

  <g class="face-done face-codex face-pixels">
    <rect x="90" y="102" width="6" height="6" />
    <rect x="96" y="96" width="6" height="6" />
    <rect x="102" y="102" width="6" height="6" />

    <rect x="142" y="102" width="6" height="6" />
    <rect x="148" y="96" width="6" height="6" />
    <rect x="154" y="102" width="6" height="6" />

    <rect x="114" y="124" width="20" height="4" />
    <rect x="118" y="128" width="12" height="4" />
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

<style>
  .transition-logic {
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .face-group,
  .cheek {
    shape-rendering: crispEdges;
  }

  .face-group {
    transform: translate(var(--face-look-x), calc(var(--face-y) + var(--face-look-y)));
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .face-pixels {
    fill: var(--face-fill);
    transition:
      fill 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .face-codex {
    fill: var(--face-codex-fill);
  }

  .face-idle {
    opacity: var(--face-idle-opacity);
  }

  .face-alert {
    opacity: var(--face-alert-opacity);
  }

  .face-press {
    opacity: var(--face-press-opacity);
  }

  .face-focus {
    opacity: var(--face-focus-opacity);
    transform-origin: 124px 116px;
    animation: face-focus-hold 1.6s ease-in-out infinite;
  }

  .face-acting {
    opacity: var(--face-acting-opacity);
    transform-origin: 124px 114px;
    animation: face-acting-drive 0.42s steps(2, end) infinite;
  }

  .face-wait {
    opacity: var(--face-wait-opacity);
  }

  .face-error {
    opacity: var(--face-error-opacity);
    transform-origin: 124px 120px;
    animation: face-error-sag 0.78s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .face-done {
    opacity: var(--face-done-opacity);
    transform-origin: 124px 118px;
    animation: face-done-release 0.72s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .face-heated {
    fill: var(--face-fill);
    opacity: var(--heat-alpha);
    animation: face-jitter 0.16s steps(2, end) infinite;
    transition:
      opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .cheek {
    fill: var(--blush-fill);
    opacity: var(--cheek-opacity);
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

  @keyframes face-focus-hold {
    0%,
    100% {
      transform: scale(1);
    }

    36% {
      transform: scaleX(var(--codex-thinking-face-scale-x))
        scaleY(var(--codex-thinking-face-scale-y));
    }

    58% {
      transform: scaleX(calc((1 + var(--codex-thinking-face-scale-x)) / 2))
        scaleY(calc((1 + var(--codex-thinking-face-scale-y)) / 2));
    }
  }

  @keyframes face-acting-drive {
    0%,
    100% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(-1px);
    }
  }

  @keyframes face-done-release {
    0%,
    100% {
      transform: scale(1);
    }

    32% {
      transform: scaleX(var(--codex-done-face-scale-x))
        scaleY(var(--codex-done-face-scale-y));
    }

    60% {
      transform: scaleX(calc(1 - (var(--codex-done-face-scale-x) - 1) * 0.42))
        scaleY(calc(1 + (1 - var(--codex-done-face-scale-y)) * 0.58));
    }
  }

  @keyframes face-error-sag {
    0%,
    100% {
      transform: scale(1);
    }

    28% {
      transform: scaleX(var(--codex-error-face-scale-x))
        scaleY(calc(2 - var(--codex-error-face-scale-y)));
    }

    62% {
      transform: scaleX(calc(1 - (var(--codex-error-face-scale-x) - 1) * 0.6))
        scaleY(var(--codex-error-face-scale-y));
    }
  }
</style>
