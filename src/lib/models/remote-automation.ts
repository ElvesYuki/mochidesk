export interface OutboundSkillConfig {
  configId: string;
  label: string;
  enabled: boolean;
  skillId: string;
  projectId: string;
  targetMachineId: string;
  branch: string;
  serviceName: string;
  token: string;
}

export interface RemoteSkillTrigger {
  triggerId: string;
  label: string;
  enabled: boolean;
  type: "manual" | "task-success";
  skillConfigId: string;
  taskId: string | null;
  fireOnStatus: "success" | "ready";
  lastTriggeredAt: number | null;
}

export interface RemoteAutomationState {
  outboundSkillConfigs: OutboundSkillConfig[];
  triggers: RemoteSkillTrigger[];
  profiles?: {
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
  }[];
}
