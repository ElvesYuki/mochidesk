import type { SystemMonitorSnapshot } from "$lib/services/system-monitor";

export type MochiMood = "idle" | "calm" | "busy";

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
}

export function createMotionProfile(snapshot: SystemMonitorSnapshot): MotionProfile {
  if (snapshot.cpuLoad === null) {
    return {
      mood: "idle",
      label: "Idle",
      pulseSeconds: 3.2,
      pulseScale: 1.02,
      floatOffset: 8,
      palette: {
        shell: "#d6a778",
        shellShade: "#b97f4f",
        blush: "#f2b0a5",
        accent: "#7f5637",
      },
      energy: 0.18,
    };
  }

  const energy = Math.min(Math.max(snapshot.cpuLoad, 0), 1);

  const mood: MochiMood = energy >= 0.7 ? "busy" : "calm";
  const label = mood === "busy" ? "Busy" : "Calm";
  const pulseSeconds = 3.1 - energy * 1.7;
  const pulseScale = 1.02 + energy * 0.05;
  const floatOffset = Math.round(8 + energy * 6);

  return {
    mood,
    label,
    pulseSeconds,
    pulseScale,
    floatOffset,
    palette: {
      shell: `color-mix(in srgb, #ddba85 ${Math.round((1 - energy) * 100)}%, #f0aa72 ${Math.round(energy * 100)}%)`,
      shellShade: `color-mix(in srgb, #c48d57 ${Math.round((1 - energy) * 100)}%, #d47545 ${Math.round(energy * 100)}%)`,
      blush: `color-mix(in srgb, #f3baa6 ${Math.round((1 - energy) * 100)}%, #ff9f8f ${Math.round(energy * 100)}%)`,
      accent: `color-mix(in srgb, #785637 ${Math.round((1 - energy) * 100)}%, #884326 ${Math.round(energy * 100)}%)`,
    },
    energy,
  };
}
