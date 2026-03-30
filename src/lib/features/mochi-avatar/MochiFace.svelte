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

  .face-idle {
    opacity: var(--face-idle-opacity);
  }

  .face-alert {
    opacity: var(--face-alert-opacity);
  }

  .face-press {
    opacity: var(--face-press-opacity);
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
</style>
