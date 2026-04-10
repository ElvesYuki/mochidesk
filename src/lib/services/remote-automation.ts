import { invoke } from "@tauri-apps/api/core";
import type { LanMochiController } from "$lib/services/lan-mochi";
import { createDefaultLanMessage } from "$lib/services/lan-mochi";
import type { RemoteSkillRequestPayload } from "$lib/models/remote-skill";
import type { RemoteSkillProfile } from "$lib/models/remote-skill";
import type {
  OutboundSkillConfig,
  RemoteAutomationState,
  RemoteSkillTrigger,
} from "$lib/models/remote-automation";
import type { TaskRun } from "$lib/models/task-runner";
import { isTauriRuntime } from "$lib/services/pet-window";

function createDefaultState(): RemoteAutomationState {
  return {
    outboundSkillConfigs: [
      {
        configId: "deploy-mochidesk-windows",
        label: "Deploy MochiDesk to Windows runner",
        enabled: true,
        skillId: "deploy-project",
        projectId: "mochidesk",
        targetMachineId: "windows-runner-01",
        branch: "main",
        serviceName: "mochidesk",
        token: "change-me",
      },
    ],
    triggers: [
      {
        triggerId: "push-main-then-deploy",
        label: "Push main then deploy",
        enabled: true,
        type: "task-success",
        skillConfigId: "deploy-mochidesk-windows",
        taskId: "git_push_project",
        fireOnStatus: "success",
        lastTriggeredAt: null,
      },
      {
        triggerId: "manual-deploy-mochidesk",
        label: "Manual deploy trigger",
        enabled: true,
        type: "manual",
        skillConfigId: "deploy-mochidesk-windows",
        taskId: null,
        fireOnStatus: "success",
        lastTriggeredAt: null,
      },
    ],
  };
}

export async function loadRemoteAutomationState(): Promise<RemoteAutomationState> {
  if (!isTauriRuntime()) {
    return createDefaultState();
  }

  return invoke<RemoteAutomationState>("get_remote_automation_config");
}

export async function getRemoteAutomationConfigPath(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return invoke<string>("get_remote_automation_config_path");
}

export async function revealRemoteAutomationConfig(revealParent = false): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("reveal_remote_automation_config", { revealParent });
}

export async function saveRemoteAutomationState(state: RemoteAutomationState): Promise<RemoteAutomationState> {
  if (!isTauriRuntime()) {
    return state;
  }

  return invoke<RemoteAutomationState>("update_remote_automation_config", { payload: state });
}

export function createRemoteSkillRequest(
  config: OutboundSkillConfig,
  requestId = `${config.skillId}-${Date.now()}`
): RemoteSkillRequestPayload {
  return {
    requestId,
    skillId: config.skillId,
    projectId: config.projectId,
    targetMachineId: config.targetMachineId,
    branch: config.branch,
    commit: "local-head",
    serviceName: config.serviceName,
    token: config.token,
  };
}

export async function sendOutboundSkill(
  lanMochi: LanMochiController,
  identity: { senderId: string; senderName: string },
  config: OutboundSkillConfig,
  port?: number,
) {
  const payload = createRemoteSkillRequest(config);
  await lanMochi.broadcastMessage(
    createDefaultLanMessage("deploy_announce", identity.senderId, identity.senderName, {
      ...payload,
    }),
    port,
  );
  return payload;
}

export async function handleTaskSuccessTriggers(params: {
  state: RemoteAutomationState;
  taskRun: TaskRun;
  lanMochi: LanMochiController;
  identity: { senderId: string; senderName: string };
  port?: number;
}): Promise<RemoteAutomationState> {
  const { state, taskRun, lanMochi, identity, port } = params;
  let nextState = state;

  for (const trigger of state.triggers) {
    if (!trigger.enabled || trigger.type !== "task-success") {
      continue;
    }

    if (trigger.taskId !== taskRun.taskId || trigger.fireOnStatus !== taskRun.status) {
      continue;
    }

    const config = state.outboundSkillConfigs.find((item) => item.configId === trigger.skillConfigId);
    if (!config || !config.enabled) {
      continue;
    }

    await sendOutboundSkill(lanMochi, identity, config, port);
    nextState = {
      ...nextState,
      triggers: nextState.triggers.map((item) =>
        item.triggerId === trigger.triggerId
          ? { ...item, lastTriggeredAt: Date.now() }
          : item,
      ),
    };
  }

  return nextState;
}

export async function fireManualTrigger(params: {
  state: RemoteAutomationState;
  trigger: RemoteSkillTrigger;
  lanMochi: LanMochiController;
  identity: { senderId: string; senderName: string };
  port?: number;
}): Promise<RemoteAutomationState> {
  const { state, trigger, lanMochi, identity, port } = params;
  const config = state.outboundSkillConfigs.find((item) => item.configId === trigger.skillConfigId);

  if (!trigger.enabled || trigger.type !== "manual" || !config || !config.enabled) {
    return state;
  }

  await sendOutboundSkill(lanMochi, identity, config, port);
  return {
    ...state,
    triggers: state.triggers.map((item) =>
      item.triggerId === trigger.triggerId ? { ...item, lastTriggeredAt: Date.now() } : item,
    ),
  };
}

export function getOutboundSkillPreflightIssues(params: {
  config: OutboundSkillConfig;
  profiles: RemoteSkillProfile[];
}): string[] {
  const { config, profiles } = params;
  const issues: string[] = [];

  if (!config.enabled) {
    issues.push("outbound config is disabled");
  }

  if (!config.skillId.trim()) issues.push("skillId is empty");
  if (!config.projectId.trim()) issues.push("projectId is empty");
  if (!config.targetMachineId.trim()) issues.push("target machine is empty");
  if (!config.branch.trim()) issues.push("branch is empty");
  if (!config.token.trim()) issues.push("token is empty");

  const targetProfile = profiles.find(
    (profile) =>
      profile.projectId === config.projectId && profile.machineId === config.targetMachineId,
  );

  if (!targetProfile) {
    issues.push("no matching receiver profile");
    return issues;
  }

  if (targetProfile.enabled === false) {
    issues.push("receiver profile is disabled");
  }

  if (targetProfile.branch !== config.branch) {
    issues.push("branch does not match receiver profile");
  }

  if (targetProfile.sharedToken !== config.token) {
    issues.push("token does not match receiver profile");
  }

  if (!targetProfile.paths.repoRoot.trim()) {
    issues.push("receiver repo root is empty");
  }

  return issues;
}
