import type { MotionProfile } from "$lib/animation/motion";
import { getHeatAlpha } from "$lib/features/mochi-avatar/avatar-motion";

export function getAvatarStyle(
  profile: MotionProfile,
  isInteracting = false,
  interactionLookX = 0,
  interactionLookY = 0,
  isDragging = false,
  isHovering = false,
  isReleasing = false,
): string {
  const heatAlpha = getHeatAlpha(profile);
  const breatheSeconds = Math.max(0.8, profile.pulseSeconds);
  const isBusy = profile.mood === "busy";
  const isAlert = profile.mood === "alert";
  const lookX = Math.max(-1, Math.min(1, interactionLookX));
  const lookY = Math.max(-1, Math.min(1, interactionLookY));
  const releaseLookStrength = isReleasing ? (isBusy ? 0.14 : isAlert ? 0.18 : 0.22) : 0;
  const hoverLookStrength = isHovering ? (isBusy ? 0.32 : isAlert ? 0.34 : 0.42) : 0;
  const interactionLookStrength = isInteracting ? (isBusy ? 0.6 : isAlert ? 0.9 : 1) : 0;
  const lookStrength = Math.max(releaseLookStrength, hoverLookStrength, interactionLookStrength);
  const eyeLookX = lookX * 3.2 * lookStrength;
  const eyeLookY = lookY * 2.4 * lookStrength;
  const dragLiftY = isDragging ? (isBusy ? "-7px" : isAlert ? "-8px" : "-9px") : "0px";
  const dragBodyScaleY = isDragging ? (isBusy ? 0.986 : isAlert ? 0.978 : 0.968) : 1;
  const dragFaceLookX = isDragging ? (isBusy ? "0.6px" : isAlert ? "0.3px" : "0px") : "0px";
  const dragFaceLookY = isDragging ? (isBusy ? "-0.8px" : isAlert ? "-1.2px" : "-1.8px") : "0px";
  const hoverFaceLift = isHovering ? (isBusy ? 1 : isAlert ? -1 : -2) : 0;
  const releaseFaceDrop = isReleasing ? (isBusy ? 1 : isAlert ? 1 : 2) : 0;
  const faceOffset = Math.round(
    heatAlpha * 16 +
      (isInteracting ? (isBusy ? 2 : isAlert ? 1 : 4) : 0) +
      (isDragging ? (isBusy ? -1 : isAlert ? -2 : -3) : 0) +
      hoverFaceLift +
      releaseFaceDrop +
      eyeLookY * 0.6,
  );
  const armFill = isBusy ? "#ffd8dc" : isAlert ? "#ffe1b8" : "#f5e6d8";
  const armOutline = isBusy ? "#b97a84" : isAlert ? "#b88436" : "#9f8266";
  const leftArmRotate = `${(isBusy ? -5 + heatAlpha * 3 : isAlert ? -14 : -8 + heatAlpha * 3) - (isInteracting ? (isBusy ? 7 : isAlert ? 2 : 5) : 0) - (isDragging ? (isBusy ? 11 : isAlert ? 10 : 9) : 0) - (isHovering ? (isBusy ? 3 : isAlert ? 2 : 3) : 0) + (isReleasing ? (isBusy ? 1 : 2) : 0)}deg`;
  const rightArmRotate = `${(isBusy ? 17 + heatAlpha * 7 : isAlert ? 14 : 8 + heatAlpha * 9) + (isInteracting ? (isBusy ? 7 : isAlert ? 2 : 5) : 0) + (isDragging ? (isBusy ? 12 : isAlert ? 10 : 9) : 0) + (isHovering ? (isBusy ? 4 : isAlert ? 2 : 3) : 0) - (isReleasing ? (isBusy ? 1 : 2) : 0)}deg`;
  const handScale = (isBusy ? 1.16 : isAlert ? 1.1 : 1.06) + (isInteracting ? 0.04 : 0);
  const interactionPress = isInteracting ? 1 : 0;
  const tapScaleX = isInteracting
    ? (isBusy ? 1.04 : isAlert ? 0.992 : 1.018)
    : isHovering
      ? (isBusy ? 1.016 : isAlert ? 0.998 : 1.006)
      : isReleasing
        ? (isBusy ? 0.996 : isAlert ? 1.002 : 0.994)
      : 1;
  const tapScaleY = isInteracting
    ? (isBusy ? 0.935 : isAlert ? 1.015 : 0.968)
    : isHovering
      ? (isBusy ? 0.982 : isAlert ? 1.004 : 0.988)
      : isReleasing
        ? (isBusy ? 1.01 : isAlert ? 0.998 : 1.012)
      : 1;
  const tapShiftY = isInteracting
    ? (isBusy ? "2.8px" : isAlert ? "-0.8px" : "1.6px")
    : isHovering
      ? (isBusy ? "1.2px" : isAlert ? "-0.4px" : "0.2px")
      : isReleasing
        ? (isBusy ? "-0.5px" : isAlert ? "0.2px" : "-0.8px")
      : "0px";
  const tapTilt = isInteracting
    ? (isBusy ? "-1.8deg" : isAlert ? "0.8deg" : "-0.4deg")
    : isDragging
      ? (isBusy ? "-2.2deg" : isAlert ? "-1.5deg" : "-1deg")
      : isHovering
        ? (isBusy ? "-0.9deg" : isAlert ? "0.2deg" : "-0.1deg")
        : isReleasing
          ? (isBusy ? "0.45deg" : isAlert ? "-0.12deg" : "0.18deg")
      : "0deg";
  const tapLeftRotate = isBusy ? "-10deg" : isAlert ? "-4deg" : "-6deg";
  const tapRightRotate = isBusy ? "10deg" : isAlert ? "4deg" : "6deg";
  const tapLeftLift = isBusy
    ? "calc(var(--arm-bob-distance) * -2.1)"
    : isAlert
      ? "calc(var(--arm-bob-distance) * -0.75)"
      : "calc(var(--arm-bob-distance) * -1.5)";
  const tapRightLift = isBusy
    ? "calc(var(--arm-bob-distance) * 1.6)"
    : isAlert
      ? "calc(var(--arm-bob-distance) * 0.45)"
      : "calc(var(--arm-bob-distance) * 0.9)";
  const tapHandScaleBoost = isBusy ? "0.08" : isAlert ? "0.03" : "0.05";
  const facePressOpacity = isInteracting
    ? (isBusy ? "0.82" : isAlert ? "0.38" : "1")
    : isHovering
      ? (isBusy ? "0.32" : isAlert ? "0.14" : "0.08")
      : isReleasing
        ? (isBusy ? "0.12" : isAlert ? "0.06" : "0.04")
      : "0";
  const faceAlertOpacity = isAlert ? (isInteracting || isDragging || isHovering ? "0.9" : "1") : "0";
  const faceLookX = isDragging ? dragFaceLookX : `${eyeLookX.toFixed(2)}px`;
  const faceLookY = isDragging ? dragFaceLookY : `${eyeLookY.toFixed(2)}px`;
  const cheekOpacity = isBusy
    ? "calc(var(--heat-alpha) * 0.88)"
    : isAlert
      ? (isInteracting ? "0.34" : isDragging ? "0.22" : isHovering ? "0.2" : isReleasing ? "0.12" : "0.16")
      : (isInteracting ? "0.58" : isDragging ? "0.3" : isHovering ? "0.28" : isReleasing ? "0.16" : "0.22");
  const steamSpeed = Math.max(
    0.82,
    1.5 - heatAlpha * 0.45 - (isBusy && isInteracting ? 0.18 : 0) - (isBusy && isHovering ? 0.12 : 0),
  );
  const dragLeftLift = isDragging
    ? (isBusy ? "calc(var(--arm-bob-distance) * -1.9)" : "calc(var(--arm-bob-distance) * -1.6)")
    : "0px";
  const dragRightLift = isDragging
    ? (isBusy ? "calc(var(--arm-bob-distance) * -1.7)" : "calc(var(--arm-bob-distance) * -1.45)")
    : "0px";

  return [
    `--breathe-speed:${breatheSeconds.toFixed(2)}s`,
    `--steam-speed:${steamSpeed.toFixed(2)}s`,
    `--arm-bob-distance:${(isBusy ? 1.1 : isAlert ? 1.5 : 1.8).toFixed(1)}px`,
    `--avatar-scale:${profile.pulseScale.toFixed(3)}`,
    `--drag-lift-y:${dragLiftY}`,
    `--drag-body-scale-y:${dragBodyScaleY.toFixed(3)}`,
    `--drag-left-lift:${dragLeftLift}`,
    `--drag-right-lift:${dragRightLift}`,
    `--float-distance:${profile.floatOffset.toFixed(0)}px`,
    `--hand-scale:${handScale.toFixed(3)}`,
    `--interaction-press:${interactionPress.toFixed(2)}`,
    `--tap-scale-x:${tapScaleX.toFixed(3)}`,
    `--tap-scale-y:${tapScaleY.toFixed(3)}`,
    `--tap-shift-y:${tapShiftY}`,
    `--tap-tilt:${tapTilt}`,
    `--tap-left-rotate:${tapLeftRotate}`,
    `--tap-right-rotate:${tapRightRotate}`,
    `--tap-left-lift:${tapLeftLift}`,
    `--tap-right-lift:${tapRightLift}`,
    `--tap-hand-scale-boost:${tapHandScaleBoost}`,
    `--face-y:${faceOffset}px`,
    `--face-look-x:${faceLookX}`,
    `--face-look-y:${faceLookY}`,
    `--heat-alpha:${heatAlpha.toFixed(3)}`,
    `--melt-drop:${Math.round(isBusy ? 3 + heatAlpha * 7 : isAlert ? 4 : 3 + heatAlpha * 2)}px`,
    `--melt-squash:${(isBusy ? 0.96 - heatAlpha * 0.05 : isAlert ? 0.975 : 0.99).toFixed(3)}`,
    `--face-jitter:${(isBusy ? heatAlpha * 1.8 : isAlert ? 0.7 : 0.15) + (isInteracting ? 0.6 : 0)}`,
    `--body-fill:${profile.palette.shell}`,
    `--body-shadow:${profile.palette.shellShade}`,
    `--blush-fill:${profile.palette.blush}`,
    `--arm-fill:${armFill}`,
    `--arm-outline:${armOutline}`,
    `--hand-fill:${isBusy ? "#fff3f5" : isAlert ? "#fff5dc" : "#fffdf9"}`,
    `--hand-highlight:${isBusy ? "#ffffff" : isAlert ? "#fffdf1" : "#fffefb"}`,
    `--left-arm-rotate:${leftArmRotate}`,
    `--right-arm-rotate:${rightArmRotate}`,
    `--face-fill:${profile.palette.accent}`,
    `--face-alert-opacity:${faceAlertOpacity}`,
    `--face-idle-opacity:${isAlert ? "0" : `calc(1 - var(--heat-alpha))`}`,
    `--face-press-opacity:${facePressOpacity}`,
    `--cheek-opacity:${cheekOpacity}`,
    `--leaf-1-fill:${isBusy ? "#fca5a5" : isAlert ? "#fde68a" : "#d9f99d"}`,
    `--leaf-1-border:${isBusy ? "#991b1b" : isAlert ? "#a16207" : "#4d7c0f"}`,
    `--leaf-2-fill:${isBusy ? "#ef4444" : isAlert ? "#f59e0b" : "#4ade80"}`,
    `--leaf-2-border:${isBusy ? "#7f1d1d" : isAlert ? "#92400e" : "#166534"}`,
  ].join("; ");
}
