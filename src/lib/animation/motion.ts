import type { CodexStatusSnapshot } from "$lib/models/codex-status";
import type { SystemMonitorSnapshot } from "$lib/services/system-monitor";

export type MochiMood = "idle" | "calm" | "alert" | "busy";

export interface MotionPalette {
  shell: string;
  shellShade: string;
  blush: string;
  accent: string;
}

export interface MotionProfile {
  mood: MochiMood;
  label: string;
  pulseSeconds: number;
  pulseScale: number;
  floatOffset: number;
  palette: MotionPalette;
  energy: number;
  codexActivity: CodexStatusSnapshot["activity"];
  codexDetail: string | null;
}

function clampLoad(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.min(Math.max(value, 0), 1);
}

function mixColor(idleColor: string, activeColor: string, ratio: number): string {
  return `color-mix(in srgb, ${idleColor} ${Math.round((1 - ratio) * 100)}%, ${activeColor} ${Math.round(ratio * 100)}%)`;
}

function getCodexEnergyBoost(status: CodexStatusSnapshot): number {
  if (status.activity === "acting") {
    return 0.08;
  }

  if (status.activity === "notice") {
    return 0.065;
  }

  if (status.activity === "celebrate") {
    return 0.04;
  }

  if (status.activity === "thinking") {
    return 0.045;
  }

  if (status.activity === "error_burst") {
    return 0.16;
  }

  if (status.activity === "error") {
    return 0.12;
  }

  if (status.activity === "waiting_input") {
    return 0.03;
  }

  return 0;
}

export function createMotionProfile(
  snapshot: SystemMonitorSnapshot,
  codexStatus: CodexStatusSnapshot = {
    activity: "idle",
    source: "placeholder",
    detail: null,
  },
): MotionProfile {
  const cpuLoad = clampLoad(snapshot.cpuLoad);
  const memoryLoad = clampLoad(snapshot.memoryLoad);
  const codexEnergyBoost = getCodexEnergyBoost(codexStatus);

  if (cpuLoad === null && memoryLoad === null) {
    return {
      mood: "idle",
      label: "Idle",
      pulseSeconds: 3.2,
      pulseScale: 1.02,
      floatOffset: 8,
      palette: {
        shell: "#ead0b2",
        shellShade: "#d4a883",
        blush: "#f5c5bc",
        accent: "#8c6d56",
      },
      energy: 0.18,
      codexActivity: codexStatus.activity,
      codexDetail: codexStatus.detail,
    };
  }

  const cpuEnergy = cpuLoad ?? memoryLoad ?? 0;
  const memoryEnergy = memoryLoad ?? cpuLoad ?? 0;
  const baseEnergy = cpuEnergy * 0.7 + memoryEnergy * 0.3;
  const pressureBoost = Math.max(0, memoryEnergy - 0.72) * 0.22;
  const energy = Math.min(1, baseEnergy + pressureBoost + codexEnergyBoost);

  let mood: MochiMood = "calm";
  if (energy >= 0.72 || cpuEnergy >= 0.78 || memoryEnergy >= 0.88) {
    mood = "busy";
  } else if (energy >= 0.4 || cpuEnergy >= 0.48 || memoryEnergy >= 0.58) {
    mood = "alert";
  }

  const label =
    mood === "busy" ? "Hot" : mood === "alert" ? "Alert" : mood === "calm" ? "Calm" : "Idle";
  const pulseSeconds =
    mood === "busy" ? 1.45 : mood === "alert" ? 2.15 : 3.35 - energy * 1.1;
  const pulseScale =
    mood === "busy" ? 1.09 : mood === "alert" ? 1.055 : 1.01 + energy * 0.04;
  const floatOffset =
    mood === "busy"
      ? Math.round(13 + energy * 4)
      : mood === "alert"
        ? Math.round(10 + energy * 3)
        : Math.round(7 + energy * 4 + memoryEnergy * 1.5);
  const warmth =
    mood === "busy"
      ? Math.min(1, 0.78 + energy * 0.22)
      : mood === "alert"
        ? Math.min(1, 0.42 + energy * 0.3)
        : Math.min(1, energy * 0.68 + cpuEnergy * 0.12);
  const flush =
    mood === "busy"
      ? Math.min(1, 0.72 + memoryEnergy * 0.24)
      : mood === "alert"
        ? Math.min(1, 0.34 + memoryEnergy * 0.22)
        : Math.min(1, energy * 0.4 + memoryEnergy * 0.25);

  return {
    mood,
    label,
    pulseSeconds,
    pulseScale,
    floatOffset,
    palette: {
      shell:
        mood === "alert"
          ? mixColor("#fffdf9", "#fff0d8", warmth)
          : mixColor("#fffdf9", "#ffcfd2", warmth),
      shellShade:
        mood === "alert"
          ? mixColor("#f0dbc8", "#f4c987", warmth)
          : mixColor("#f0dbc8", "#ffb39a", warmth),
      blush:
        mood === "alert"
          ? mixColor("#f3baa6", "#f7b267", flush)
          : mixColor("#f3baa6", "#ff8c8c", flush),
      accent:
        mood === "alert"
          ? mixColor("#4f4033", "#8a5a18", Math.min(1, warmth * 0.75 + flush * 0.1))
          : mixColor("#4f4033", "#7d1d1d", Math.min(1, warmth * 0.82 + flush * 0.18)),
    },
    energy,
    codexActivity: codexStatus.activity,
    codexDetail: codexStatus.detail,
  };
}
