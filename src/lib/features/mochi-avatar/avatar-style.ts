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
  const codexThinking = profile.codexActivity === "thinking";
  const codexActing = profile.codexActivity === "acting";
  const codexWaiting = profile.codexActivity === "waiting_input";
  const codexNotice = profile.codexActivity === "notice";
  const codexCelebrate = profile.codexActivity === "celebrate";
  const codexError = profile.codexActivity === "error";
  const codexErrorBurst = profile.codexActivity === "error_burst";
  const codexDone = profile.codexActivity === "done";
  const lookX = Math.max(-1, Math.min(1, interactionLookX));
  const lookY = Math.max(-1, Math.min(1, interactionLookY));
  const releaseLookStrength = isReleasing ? (isBusy ? 0.14 : isAlert ? 0.18 : 0.22) : 0;
  const hoverLookStrength = isHovering ? (isBusy ? 0.32 : isAlert ? 0.34 : 0.42) : 0;
  const interactionLookStrength = isInteracting ? (isBusy ? 0.6 : isAlert ? 0.9 : 1) : 0;
  const lookStrength = Math.max(releaseLookStrength, hoverLookStrength, interactionLookStrength);
  const codexLookX = codexThinking
    ? 0.45
    : codexActing
      ? 0.08
      : codexWaiting
        ? 0
        : codexNotice
          ? 0.08
          : codexCelebrate
            ? 0.14
            : codexErrorBurst
              ? -0.24
              : codexError
                ? -0.18
                : codexDone
                  ? 0.12
                  : 0;
  const codexLookY = codexThinking
    ? -0.28
    : codexActing
      ? -0.44
      : codexWaiting
        ? -0.36
        : codexNotice
          ? -0.48
          : codexCelebrate
            ? -0.3
            : codexErrorBurst
              ? 0.46
              : codexError
                ? 0.3
                : codexDone
                  ? -0.18
                  : 0;
  const eyeLookX = (lookX * 3.2 * lookStrength) + codexLookX;
  const eyeLookY = (lookY * 2.4 * lookStrength) + codexLookY;
  const codexLiftY = codexThinking
    ? "-1.2px"
    : codexActing
      ? "-0.6px"
      : codexWaiting
        ? "-2.1px"
        : codexNotice
          ? "-2.6px"
          : codexCelebrate
            ? "-2.2px"
            : codexErrorBurst
              ? "2.6px"
              : codexError
                ? "1.8px"
                : codexDone
                  ? "-1.4px"
                  : "0px";
  const dragLiftY = isDragging ? (isBusy ? "-7px" : isAlert ? "-8px" : "-9px") : codexLiftY;
  const codexBodyScaleY = codexActing
    ? 0.988
    : codexWaiting
      ? 1.012
      : codexNotice
        ? 1.026
        : codexCelebrate
          ? 0.972
          : codexErrorBurst
            ? 0.944
            : codexError
              ? 0.962
              : codexDone
                ? 1.018
                : 1;
  const dragBodyScaleY = isDragging ? (isBusy ? 0.986 : isAlert ? 0.978 : 0.968) : codexBodyScaleY;
  const dragFaceLookX = isDragging ? (isBusy ? "0.6px" : isAlert ? "0.3px" : "0px") : "0px";
  const dragFaceLookY = isDragging ? (isBusy ? "-0.8px" : isAlert ? "-1.2px" : "-1.8px") : "0px";
  const hoverFaceLift = isHovering ? (isBusy ? 1 : isAlert ? -1 : -2) : 0;
  const releaseFaceDrop = isReleasing ? (isBusy ? 1 : isAlert ? 1 : 2) : 0;
  const codexFaceBias = codexThinking
    ? -2
    : codexActing
      ? -4
      : codexWaiting
        ? -4
        : codexNotice
          ? -5
          : codexCelebrate
            ? -3
            : codexErrorBurst
              ? 6
              : codexError
                ? 4
                : codexDone
                  ? -2
                  : 0;
  const faceOffset = Math.round(
    heatAlpha * 16 +
      (isInteracting ? (isBusy ? 2 : isAlert ? 1 : 4) : 0) +
      (isDragging ? (isBusy ? -1 : isAlert ? -2 : -3) : 0) +
      hoverFaceLift +
      releaseFaceDrop +
      codexFaceBias +
      eyeLookY * 0.6,
  );
  const armFill = isBusy ? "#ffd8dc" : isAlert ? "#ffe1b8" : "#f5e6d8";
  const armOutline = isBusy ? "#b97a84" : isAlert ? "#b88436" : "#9f8266";
  const leftCodexArmBias = codexThinking
    ? -5
    : codexActing
      ? -13
      : codexWaiting
        ? -10
        : codexNotice
          ? -13
          : codexCelebrate
            ? -6
            : codexErrorBurst
              ? 12
              : codexError
                ? 8
                : codexDone
                  ? -3
                  : 0;
  const rightCodexArmBias = codexThinking
    ? 4
    : codexActing
      ? 15
      : codexWaiting
        ? 2
        : codexNotice
          ? 12
          : codexCelebrate
            ? 10
            : codexErrorBurst
              ? -10
              : codexError
                ? -6
                : codexDone
                  ? 8
                  : 0;
  const leftArmRotate = `${(isBusy ? -5 + heatAlpha * 3 : isAlert ? -14 : -8 + heatAlpha * 3) - (isInteracting ? (isBusy ? 7 : isAlert ? 2 : 5) : 0) - (isDragging ? (isBusy ? 11 : isAlert ? 10 : 9) : 0) - (isHovering ? (isBusy ? 3 : isAlert ? 2 : 3) : 0) + (isReleasing ? (isBusy ? 1 : 2) : 0) + leftCodexArmBias}deg`;
  const rightArmRotate = `${(isBusy ? 17 + heatAlpha * 7 : isAlert ? 14 : 8 + heatAlpha * 9) + (isInteracting ? (isBusy ? 7 : isAlert ? 2 : 5) : 0) + (isDragging ? (isBusy ? 12 : isAlert ? 10 : 9) : 0) + (isHovering ? (isBusy ? 4 : isAlert ? 2 : 3) : 0) - (isReleasing ? (isBusy ? 1 : 2) : 0) + rightCodexArmBias}deg`;
  const handScale =
    (isBusy ? 1.16 : isAlert ? 1.1 : 1.06) +
    (isInteracting ? 0.04 : 0) +
    (codexActing ? 0.03 : codexNotice ? 0.02 : codexCelebrate ? 0.04 : codexErrorBurst ? -0.03 : codexError ? -0.01 : 0);
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
  const codexTapShiftY = codexThinking
    ? "-0.4px"
    : codexActing
      ? "-0.1px"
      : codexWaiting
        ? "-1px"
        : codexNotice
          ? "-1.6px"
          : codexCelebrate
            ? "-1.2px"
            : codexErrorBurst
              ? "1.8px"
              : codexError
                ? "1.2px"
                : codexDone
                  ? "-0.7px"
                  : "0px";
  const tapTilt = isInteracting
    ? (isBusy ? "-1.8deg" : isAlert ? "0.8deg" : "-0.4deg")
    : isDragging
      ? (isBusy ? "-2.2deg" : isAlert ? "-1.5deg" : "-1deg")
      : isHovering
        ? (isBusy ? "-0.9deg" : isAlert ? "0.2deg" : "-0.1deg")
        : isReleasing
          ? (isBusy ? "0.45deg" : isAlert ? "-0.12deg" : "0.18deg")
      : codexThinking
        ? "-0.5deg"
        : codexActing
          ? "0.8deg"
          : codexWaiting
            ? "-0.2deg"
            : codexNotice
              ? "0deg"
              : codexCelebrate
                ? "-1.2deg"
                : codexErrorBurst
                  ? "1.8deg"
            : codexError
              ? "1.2deg"
              : codexDone
                ? "-0.9deg"
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
  const faceAlertOpacity = isAlert && !codexThinking && !codexActing && !codexWaiting && !codexNotice && !codexCelebrate && !codexError && !codexErrorBurst && !codexDone
    ? (isInteracting || isDragging || isHovering ? "0.9" : "1")
    : "0";
  const faceLookX = isDragging ? dragFaceLookX : `${eyeLookX.toFixed(2)}px`;
  const faceLookY = isDragging ? dragFaceLookY : `${eyeLookY.toFixed(2)}px`;
  const faceFocusOpacity = codexThinking ? "0.42" : codexCelebrate ? "0.14" : codexNotice ? "0.1" : codexWaiting ? "0.18" : "0";
  const faceActingOpacity = codexActing ? "1" : "0";
  const faceWaitOpacity = codexNotice ? "0.72" : codexWaiting ? "0.58" : codexDone ? "0.22" : "0";
  const faceErrorOpacity = codexErrorBurst ? "1" : codexError ? "0.88" : "0";
  const faceDoneOpacity = codexCelebrate ? "0.94" : codexDone ? "0.82" : "0";
  const cheekOpacity = isBusy
    ? "calc(var(--heat-alpha) * 0.88)"
    : isAlert
      ? (isInteracting ? "0.34" : isDragging ? "0.22" : isHovering ? "0.2" : isReleasing ? "0.12" : "0.16")
      : (isInteracting ? "0.58" : isDragging ? "0.3" : isHovering ? "0.28" : isReleasing ? "0.16" : "0.22");
  const steamSpeed = Math.max(
    0.82,
    1.5 - heatAlpha * 0.45 - (isBusy && isInteracting ? 0.18 : 0) - (isBusy && isHovering ? 0.12 : 0),
  );
  const busyLoopRotate = isBusy ? `${(-1.2 - heatAlpha * 1.8).toFixed(2)}deg` : codexActing ? "-0.55deg" : codexCelebrate ? "-0.9deg" : codexErrorBurst ? "1.2deg" : "0deg";
  const busyLoopShiftX = isBusy ? `${(0.9 + heatAlpha * 1.5).toFixed(2)}px` : codexActing ? "0.34px" : codexCelebrate ? "0.8px" : codexErrorBurst ? "-0.9px" : "0px";
  const busyLoopLiftY = isBusy ? `${(-0.8 - heatAlpha * 1.6).toFixed(2)}px` : codexActing ? "-0.42px" : codexCelebrate ? "-1.2px" : codexErrorBurst ? "0.8px" : "0px";
  const busyLoopScaleX = isBusy ? (1 + heatAlpha * 0.012).toFixed(3) : "1";
  const busyLoopScaleY = isBusy ? (1 - heatAlpha * 0.018).toFixed(3) : "1";
  const busyLoopSeconds = isBusy ? Math.max(1.6, 2.35 - heatAlpha * 0.55) : codexActing ? 1.38 : codexCelebrate ? 1.48 : codexErrorBurst ? 1.36 : 2.8;
  const busyArmFidget = isBusy ? `${(0.55 + heatAlpha * 0.9).toFixed(2)}px` : codexActing ? "0.28px" : codexNotice ? "0.18px" : codexCelebrate ? "0.34px" : codexErrorBurst ? "0.56px" : "0px";
  const dragLeftLift = isDragging
    ? (isBusy ? "calc(var(--arm-bob-distance) * -1.9)" : "calc(var(--arm-bob-distance) * -1.6)")
    : "0px";
  const dragRightLift = isDragging
    ? (isBusy ? "calc(var(--arm-bob-distance) * -1.7)" : "calc(var(--arm-bob-distance) * -1.45)")
    : "0px";
  const codexLeftLift = codexActing
    ? "calc(var(--arm-bob-distance) * 0.34)"
    : codexWaiting
      ? "calc(var(--arm-bob-distance) * -0.9)"
    : codexNotice
      ? "calc(var(--arm-bob-distance) * -1.3)"
    : codexCelebrate
      ? "calc(var(--arm-bob-distance) * -1.5)"
    : codexErrorBurst
      ? "calc(var(--arm-bob-distance) * 1)"
    : codexError
      ? "calc(var(--arm-bob-distance) * 0.6)"
      : codexDone
        ? "calc(var(--arm-bob-distance) * -0.7)"
        : "0px";
  const codexRightLift = codexActing
    ? "calc(var(--arm-bob-distance) * 0.28)"
    : codexWaiting
      ? "calc(var(--arm-bob-distance) * -0.45)"
    : codexNotice
      ? "calc(var(--arm-bob-distance) * -1.28)"
    : codexCelebrate
      ? "calc(var(--arm-bob-distance) * -1.45)"
    : codexErrorBurst
      ? "calc(var(--arm-bob-distance) * 1.1)"
    : codexError
      ? "calc(var(--arm-bob-distance) * 0.8)"
      : codexDone
        ? "calc(var(--arm-bob-distance) * -0.95)"
        : "0px";
  const codexBodyBounce = codexCelebrate ? "-2.1px" : codexDone ? "-1.6px" : codexNotice ? "-1.7px" : codexWaiting ? "-1px" : codexErrorBurst ? "1.8px" : codexError ? "1px" : codexActing ? "-0.4px" : "0px";
  const codexLeftPhase = codexActing ? "0s" : codexNotice ? "0.02s" : codexCelebrate ? "0s" : codexWaiting ? "0.08s" : codexErrorBurst ? "0s" : "0s";
  const codexRightPhase = codexActing ? "0.22s" : codexNotice ? "0.02s" : codexCelebrate ? "0.04s" : codexWaiting ? "0.02s" : codexErrorBurst ? "0.01s" : "0.16s";
  const codexLeftBobFactor = codexActing ? "0.92" : codexNotice ? "0.52" : codexCelebrate ? "1.48" : codexWaiting ? "0.38" : codexErrorBurst ? "0.16" : "1";
  const codexRightBobFactor = codexActing ? "0.84" : codexNotice ? "0.5" : codexCelebrate ? "1.34" : codexWaiting ? "0.18" : codexErrorBurst ? "0.12" : "1";
  const codexTypingSeconds = codexActing ? "0.78s" : "0.78s";
  const codexAccentMix = codexErrorBurst
    ? "color-mix(in srgb, var(--face-fill) 28%, #6f1010 72%)"
    : codexError
    ? "color-mix(in srgb, var(--face-fill) 44%, #8f1d1d 56%)"
    : codexCelebrate
      ? "color-mix(in srgb, var(--face-fill) 34%, #b36f18 66%)"
    : codexNotice
      ? "color-mix(in srgb, var(--face-fill) 42%, #ff5a18 58%)"
    : codexDone
      ? "color-mix(in srgb, var(--face-fill) 38%, #7a6f24 62%)"
      : codexThinking
        ? "color-mix(in srgb, var(--face-fill) 72%, #3f4e79 28%)"
        : "var(--face-fill)";
  const codexThinkingOpacity = codexThinking ? "1" : "0";
  const codexThinkingShiftX = codexThinking ? "0px" : "4px";
  const codexThinkingShiftY = codexThinking ? "0px" : "2px";
  const codexThinkingScale = codexThinking ? "1" : "0.94";
  const codexThinkingFloat = codexThinking ? "-1px" : "0px";
  const codexThinkingDotOpacity = codexThinking ? "1" : "0";
  const codexThinkingFaceScaleX = codexThinking ? "0.985" : "1";
  const codexThinkingFaceScaleY = codexThinking ? "0.97" : "1";
  const codexActingOpacity = codexActing ? "1" : "0";
  const codexActingShiftX = codexActing ? "0px" : "0px";
  const codexActingShiftY = codexActing ? "0px" : "6px";
  const codexActingHandOpacity = codexActing ? "1" : "0";
  const codexNoticeOpacity = codexNotice ? "1" : "0";
  const codexNoticeShiftX = codexNotice ? "0px" : "0px";
  const codexNoticeShiftY = codexNotice ? "0px" : "6px";
  const codexCelebrateOpacity = codexCelebrate ? "1" : "0";
  const codexCelebrateShiftX = codexCelebrate ? "0px" : "0px";
  const codexCelebrateShiftY = codexCelebrate ? "0px" : "5px";
  const codexErrorOpacity = (codexError || codexErrorBurst) ? "1" : "0";
  const codexErrorShiftX = codexError ? "0px" : "4px";
  const codexErrorShiftY = codexErrorBurst ? "0px" : codexError ? "0px" : "-2px";
  const codexErrorScale = codexError ? "1" : "0.92";
  const codexErrorDrop = codexErrorBurst ? "1.2" : codexError ? "1" : "0";
  const codexErrorFaceScaleX = codexErrorBurst ? "1.06" : codexError ? "1.02" : "1";
  const codexErrorFaceScaleY = codexErrorBurst ? "1.1" : codexError ? "1.06" : "1";
  const codexDoneOpacity = (codexDone || codexCelebrate) ? "1" : "0";
  const codexDoneShiftX = codexDone ? "0px" : "0px";
  const codexDoneShiftY = codexDone ? "0px" : "4px";
  const codexDoneScale = codexDone ? "1" : "0.9";
  const codexDoneBurst = codexDone ? "1" : "0";
  const codexDoneFaceScaleX = codexDone ? "1.04" : "1";
  const codexDoneFaceScaleY = codexDone ? "0.96" : "1";

  return [
    `--breathe-speed:${breatheSeconds.toFixed(2)}s`,
    `--steam-speed:${steamSpeed.toFixed(2)}s`,
    `--arm-bob-distance:${(isBusy ? 1.1 : isAlert ? 1.5 : 1.8).toFixed(1)}px`,
    `--avatar-scale:${profile.pulseScale.toFixed(3)}`,
    `--drag-lift-y:${dragLiftY}`,
    `--drag-body-scale-y:${dragBodyScaleY.toFixed(3)}`,
    `--drag-left-lift:${dragLeftLift}`,
    `--drag-right-lift:${dragRightLift}`,
    `--codex-left-lift:${codexLeftLift}`,
    `--codex-right-lift:${codexRightLift}`,
    `--codex-body-bounce:${codexBodyBounce}`,
    `--codex-left-phase:${codexLeftPhase}`,
    `--codex-right-phase:${codexRightPhase}`,
    `--codex-left-bob-factor:${codexLeftBobFactor}`,
    `--codex-right-bob-factor:${codexRightBobFactor}`,
    `--codex-typing-seconds:${codexTypingSeconds}`,
    `--float-distance:${profile.floatOffset.toFixed(0)}px`,
    `--hand-scale:${handScale.toFixed(3)}`,
    `--interaction-press:${interactionPress.toFixed(2)}`,
    `--tap-scale-x:${tapScaleX.toFixed(3)}`,
    `--tap-scale-y:${tapScaleY.toFixed(3)}`,
    `--tap-shift-y:calc(${tapShiftY} + ${codexTapShiftY})`,
    `--tap-tilt:${tapTilt}`,
    `--tap-left-rotate:${tapLeftRotate}`,
    `--tap-right-rotate:${tapRightRotate}`,
    `--tap-left-lift:${tapLeftLift}`,
    `--tap-right-lift:${tapRightLift}`,
    `--tap-hand-scale-boost:${tapHandScaleBoost}`,
    `--busy-loop-rotate:${busyLoopRotate}`,
    `--busy-loop-shift-x:${busyLoopShiftX}`,
    `--busy-loop-lift-y:${busyLoopLiftY}`,
    `--busy-loop-scale-x:${busyLoopScaleX}`,
    `--busy-loop-scale-y:${busyLoopScaleY}`,
    `--busy-loop-seconds:${busyLoopSeconds.toFixed(2)}s`,
    `--busy-arm-fidget:${busyArmFidget}`,
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
    `--face-codex-fill:${codexAccentMix}`,
    `--face-alert-opacity:${faceAlertOpacity}`,
    `--face-idle-opacity:${(codexThinking || codexActing || codexWaiting || codexNotice || codexCelebrate || codexError || codexErrorBurst || codexDone) ? "0" : isAlert ? "0" : `calc(1 - var(--heat-alpha))`}`,
    `--face-press-opacity:${facePressOpacity}`,
    `--face-focus-opacity:${faceFocusOpacity}`,
    `--face-acting-opacity:${faceActingOpacity}`,
    `--face-wait-opacity:${faceWaitOpacity}`,
    `--face-error-opacity:${faceErrorOpacity}`,
    `--face-done-opacity:${faceDoneOpacity}`,
    `--codex-thinking-opacity:${codexThinkingOpacity}`,
    `--codex-thinking-shift-x:${codexThinkingShiftX}`,
    `--codex-thinking-shift-y:${codexThinkingShiftY}`,
    `--codex-thinking-scale:${codexThinkingScale}`,
    `--codex-thinking-float:${codexThinkingFloat}`,
    `--codex-thinking-dot-opacity:${codexThinkingDotOpacity}`,
    `--codex-thinking-face-scale-x:${codexThinkingFaceScaleX}`,
    `--codex-thinking-face-scale-y:${codexThinkingFaceScaleY}`,
    `--codex-acting-opacity:${codexActingOpacity}`,
    `--codex-acting-shift-x:${codexActingShiftX}`,
    `--codex-acting-shift-y:${codexActingShiftY}`,
    `--codex-acting-hand-opacity:${codexActingHandOpacity}`,
    `--codex-notice-opacity:${codexNoticeOpacity}`,
    `--codex-notice-shift-x:${codexNoticeShiftX}`,
    `--codex-notice-shift-y:${codexNoticeShiftY}`,
    `--codex-celebrate-opacity:${codexCelebrateOpacity}`,
    `--codex-celebrate-shift-x:${codexCelebrateShiftX}`,
    `--codex-celebrate-shift-y:${codexCelebrateShiftY}`,
    `--codex-error-opacity:${codexErrorOpacity}`,
    `--codex-error-shift-x:${codexErrorShiftX}`,
    `--codex-error-shift-y:${codexErrorShiftY}`,
    `--codex-error-scale:${codexErrorScale}`,
    `--codex-error-drop:${codexErrorDrop}`,
    `--codex-error-face-scale-x:${codexErrorFaceScaleX}`,
    `--codex-error-face-scale-y:${codexErrorFaceScaleY}`,
    `--codex-done-opacity:${codexDoneOpacity}`,
    `--codex-done-shift-x:${codexDoneShiftX}`,
    `--codex-done-shift-y:${codexDoneShiftY}`,
    `--codex-done-scale:${codexDoneScale}`,
    `--codex-done-burst:${codexDoneBurst}`,
    `--codex-done-face-scale-x:${codexDoneFaceScaleX}`,
    `--codex-done-face-scale-y:${codexDoneFaceScaleY}`,
    `--cheek-opacity:${cheekOpacity}`,
    `--leaf-1-fill:${isBusy ? "#fca5a5" : isAlert ? "#fde68a" : "#d9f99d"}`,
    `--leaf-1-border:${isBusy ? "#991b1b" : isAlert ? "#a16207" : "#4d7c0f"}`,
    `--leaf-2-fill:${isBusy ? "#ef4444" : isAlert ? "#f59e0b" : "#4ade80"}`,
    `--leaf-2-border:${isBusy ? "#7f1d1d" : isAlert ? "#92400e" : "#166534"}`,
  ].join("; ");
}
