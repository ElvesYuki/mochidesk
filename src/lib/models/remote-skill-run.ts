export interface RemoteSkillRun {
  requestId: string;
  skillId: string;
  category: "deployment" | "service-control" | "repo-sync";
  projectId: string;
  targetMachineId: string;
  stage: "received" | "running" | "success" | "failed";
  currentStep: string | null;
  detail: string;
  success: boolean;
  updatedAt: number;
}
