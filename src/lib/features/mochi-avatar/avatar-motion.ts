import type { MotionProfile } from "$lib/animation/motion";

const BODY_IDLE_OUTLINE = [
  90, 70, 160, 76, 170, 82, 180, 160, 170, 170, 160, 180, 90, 170, 80, 160, 70, 82, 80, 76, 90,
] as const;

const BODY_HEATED_OUTLINE = [
  88, 82, 162, 88, 174, 96, 186, 176, 178, 190, 166, 198, 84, 190, 72, 176, 60, 96, 76, 88, 90,
] as const;

export function getHeatAlpha(profile: MotionProfile): number {
  return Math.max(0, Math.min(1, (profile.energy - 0.56) / 0.22));
}

function interpolateInteger(from: number, to: number, progress: number): number {
  return Math.round(from + (to - from) * progress);
}

export function getBodyPath(profile: MotionProfile): string {
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

export function getTargetSpinSpeed(profile: MotionProfile): number {
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
