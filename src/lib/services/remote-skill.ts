import { invoke } from "@tauri-apps/api/core";
import type {
  RemoteSkillDefinition,
  RemoteSkillProfile,
  RemoteSkillProfileUpdate,
  RemoteSkillRequestPayload,
} from "$lib/models/remote-skill";
import type { RemoteSkillRun } from "$lib/models/remote-skill-run";
import { isTauriRuntime } from "$lib/services/pet-window";

export interface RemoteSkillController {
  getDefinitions: () => Promise<RemoteSkillDefinition[]>;
  getProfiles: () => Promise<RemoteSkillProfile[]>;
  updateProfile: (payload: RemoteSkillProfileUpdate) => Promise<RemoteSkillProfile[]>;
  runRemoteSkill: (payload: RemoteSkillRequestPayload) => Promise<unknown>;
  dequeueRemoteSkillRequest: () => Promise<RemoteSkillRequestPayload | null>;
  getRecentRuns: () => Promise<RemoteSkillRun[]>;
}

export function createRemoteSkillController(): RemoteSkillController {
  if (!isTauriRuntime()) {
    return {
      async getDefinitions() {
        return [];
      },
      async getProfiles() {
        return [];
      },
      async updateProfile() {
        return [];
      },
      async runRemoteSkill() {},
      async dequeueRemoteSkillRequest() {
        return null;
      },
      async getRecentRuns() {
        return [];
      },
    };
  }

  return {
    getDefinitions() {
      return invoke<RemoteSkillDefinition[]>("get_remote_skill_definitions");
    },
    getProfiles() {
      return invoke<RemoteSkillProfile[]>("get_remote_skill_profiles");
    },
    updateProfile(payload) {
      return invoke<RemoteSkillProfile[]>("update_remote_skill_profile", { payload });
    },
    runRemoteSkill(payload) {
      return invoke("run_remote_skill", { payload });
    },
    dequeueRemoteSkillRequest() {
      return invoke<RemoteSkillRequestPayload | null>("dequeue_remote_skill_request");
    },
    getRecentRuns() {
      return invoke<RemoteSkillRun[]>("get_recent_remote_skill_runs");
    },
  };
}
