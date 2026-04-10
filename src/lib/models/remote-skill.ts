export interface RemoteSkillDefinition {
  skillId: string;
  label: string;
  kind: "atomic" | "composed";
  category: "deployment" | "service-control" | "repo-sync";
  steps: string[];
}

export interface RemoteSkillProfile {
  projectId: string;
  machineId: string;
  enabled?: boolean;
  paths: {
    repoRoot: string;
    tauriRoot?: string;
    serviceRoot?: string;
  };
  branch: string;
  sharedToken: string;
  updateMode: "ff_only" | "reset_hard";
  tasks: {
    fetchTaskId: string;
    pullTaskId?: string;
    resetTaskId?: string;
    stopServiceTaskId: string;
    startServiceTaskId: string;
  };
}

export interface RemoteSkillProfileUpdate {
  projectId: string;
  machineId: string;
  enabled?: boolean;
  paths: {
    repoRoot: string;
    tauriRoot?: string;
    serviceRoot?: string;
  };
  branch: string;
  sharedToken: string;
  updateMode: "ff_only" | "reset_hard";
  tasks: {
    fetchTaskId: string;
    pullTaskId?: string;
    resetTaskId?: string;
    stopServiceTaskId: string;
    startServiceTaskId: string;
  };
}

export interface RemoteSkillRequestPayload {
  requestId: string;
  skillId: string;
  projectId: string;
  targetMachineId: string;
  branch: string;
  commit: string;
  serviceName: string;
  token: string;
}

export interface RemoteSkillResultPayload {
  requestId: string;
  skillId: string;
  category: "deployment" | "service-control" | "repo-sync";
  projectId: string;
  targetMachineId: string;
  success: boolean;
  stage: string;
  currentStep?: string | null;
  detail: string;
}
