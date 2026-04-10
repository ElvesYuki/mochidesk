<script lang="ts">
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import type { ControlPanelSnapshot } from "$lib/models/control-panel";
  import type { LanPeer } from "$lib/models/lan-peer";
  import type { NetworkEvent } from "$lib/models/lan-message";
  import type { RemoteSkillProfile } from "$lib/models/remote-skill";
  import type { RemoteAutomationState } from "$lib/models/remote-automation";
  import type { RemoteSkillRun } from "$lib/models/remote-skill-run";
  import type { TaskDefinition, TaskRun } from "$lib/models/task-runner";
  import ControlPanel from "$lib/features/control-panel/ControlPanel.svelte";
  import {
    createDefaultLanMessage,
    createLanMochiController,
    DEFAULT_LAN_PORT,
  } from "$lib/services/lan-mochi";
  import { createRemoteSkillController } from "$lib/services/remote-skill";
  import {
    fireManualTrigger,
    getRemoteAutomationConfigPath,
    getOutboundSkillPreflightIssues,
    handleTaskSuccessTriggers,
    loadRemoteAutomationState,
    revealRemoteAutomationConfig,
    saveRemoteAutomationState,
  } from "$lib/services/remote-automation";
  import { createTaskRunnerController } from "$lib/services/task-runner";

  const CONTROL_PANEL_EVENT = "mochi://control-panel";

  let snapshot: ControlPanelSnapshot = {
    debugCycleEnabled: false,
    debugCodexCycleEnabled: false,
    debugCycleStage: "idle",
    debugCodexStage: "idle",
  };
  let udpListening = false;
  let udpPort = DEFAULT_LAN_PORT;
  let networkBusy = false;
  let configPath: string | null = null;
  let peers: LanPeer[] = [];
  let recentEvents: NetworkEvent[] = [];
  let remoteSkillRuns: RemoteSkillRun[] = [];
  let profiles: RemoteSkillProfile[] = [];
  let automationState: RemoteAutomationState = {
    outboundSkillConfigs: [],
    triggers: [],
    profiles: [],
  };
  let tasks: TaskDefinition[] = [];
  let recentTaskRuns: TaskRun[] = [];
  let runningTaskId: string | null = null;
  let activeRunId: string | null = null;
  let knownCompletedTaskRunIds = new Set<string>();

  const lanMochi = createLanMochiController();
  const remoteSkill = createRemoteSkillController();
  const taskRunner = createTaskRunnerController();
  let localSenderId = "preview-mochi";
  let localSenderName = "MochiDesk";

  async function emitAction(action: string) {
    await getCurrentWebviewWindow().emitTo("main", CONTROL_PANEL_EVENT, { action });
  }

  async function refreshLanState() {
    if (networkBusy) {
      return;
    }

    networkBusy = true;

    try {
      [peers, recentEvents] = await Promise.all([
        lanMochi.getKnownPeers(),
        lanMochi.getRecentEvents(),
      ]);
      profiles = await remoteSkill.getProfiles();
      remoteSkillRuns = await remoteSkill.getRecentRuns();
    } finally {
      networkBusy = false;
    }
  }

  async function toggleUdpListener() {
    if (networkBusy) {
      return;
    }

    networkBusy = true;

    try {
      if (udpListening) {
        await lanMochi.stopListener();
        udpListening = false;
      } else {
        udpPort = await lanMochi.startListener(udpPort);
        udpListening = true;
      }

      [peers, recentEvents] = await Promise.all([
        lanMochi.getKnownPeers(),
        lanMochi.getRecentEvents(),
      ]);
      profiles = await remoteSkill.getProfiles();
      remoteSkillRuns = await remoteSkill.getRecentRuns();
    } finally {
      networkBusy = false;
    }
  }

  async function broadcastHello() {
    if (!udpListening || networkBusy) {
      return;
    }

    networkBusy = true;

    try {
      await lanMochi.broadcastMessage(
        createDefaultLanMessage("hello", localSenderId, localSenderName, {
          activity: snapshot.debugCodexStage,
          requestedAck: true,
        }),
        udpPort,
      );
      await refreshLanState();
    } finally {
      networkBusy = false;
    }
  }

  async function refreshTaskState() {
    const [nextTasks, snapshot] = await Promise.all([
      taskRunner.listTasks(),
      taskRunner.getTaskSnapshot(),
    ]);
    tasks = nextTasks;
    recentTaskRuns = snapshot.runs;

    const runningRun = recentTaskRuns.find((run) => run.status === "running");
    runningTaskId = runningRun?.taskId ?? null;
    activeRunId = runningRun?.runId ?? null;

    const completedRuns = recentTaskRuns.filter(
      (run) => run.finishedAt !== null && (run.status === "success" || run.status === "ready"),
    );

    for (const run of completedRuns) {
      if (knownCompletedTaskRunIds.has(run.runId)) {
        continue;
      }

      automationState = await handleTaskSuccessTriggers({
        state: automationState,
        taskRun: run,
        lanMochi,
        identity: {
          senderId: localSenderId,
          senderName: localSenderName,
        },
        port: udpPort,
      });
      automationState = await saveRemoteAutomationState(automationState);
      knownCompletedTaskRunIds.add(run.runId);
    }
  }

  async function runTask(taskId: string) {
    if (runningTaskId !== null) {
      return;
    }

    runningTaskId = taskId;

    try {
      await taskRunner.runTask(taskId);
    } finally {
      await refreshTaskState();
    }
  }

  async function stopTask() {
    if (activeRunId === null) {
      return;
    }

    await taskRunner.stopTask(activeRunId);
    await refreshTaskState();
  }

  async function fireTrigger(triggerId: string) {
    const trigger = automationState.triggers.find((item) => item.triggerId === triggerId);
    if (!trigger) {
      return;
    }

    if (getTriggerIssues(triggerId).length > 0) {
      return;
    }

    automationState = await fireManualTrigger({
      state: automationState,
      trigger,
      lanMochi,
      identity: {
        senderId: localSenderId,
        senderName: localSenderName,
      },
      port: udpPort,
    });
    automationState = await saveRemoteAutomationState(automationState);
    await refreshLanState();
  }

  async function testTrigger(triggerId: string) {
    const trigger = automationState.triggers.find((item) => item.triggerId === triggerId);
    if (!trigger) {
      return;
    }

    if (getTriggerIssues(triggerId).length > 0) {
      return;
    }

    const config = automationState.outboundSkillConfigs.find(
      (item) => item.configId === trigger.skillConfigId,
    );
    if (!config) {
      return;
    }

    await lanMochi.broadcastMessage(
      createDefaultLanMessage("deploy_announce", localSenderId, localSenderName, {
        requestId: `${config.skillId}-${Date.now()}`,
        skillId: config.skillId,
        projectId: config.projectId,
        targetMachineId: config.targetMachineId,
        branch: config.branch,
        commit: "local-head",
        serviceName: config.serviceName,
        token: config.token,
      }),
      udpPort,
    );
    await refreshLanState();
  }

  async function revealConfig(revealParent: boolean) {
    await revealRemoteAutomationConfig(revealParent);
  }

  function updateSkillConfig(configId: string, patch: Partial<RemoteAutomationState["outboundSkillConfigs"][number]>) {
    automationState = {
      ...automationState,
      outboundSkillConfigs: automationState.outboundSkillConfigs.map((config) =>
        config.configId === configId ? { ...config, ...patch } : config,
      ),
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  function addSkillConfig() {
    automationState = {
      ...automationState,
      outboundSkillConfigs: [
        ...automationState.outboundSkillConfigs,
        {
          configId: `skill-config-${Date.now()}`,
          label: "New outbound config",
          enabled: true,
          skillId: "deploy-project",
          projectId: "mochidesk",
          targetMachineId: "windows-runner-01",
          branch: "main",
          serviceName: "mochidesk",
          token: "change-me",
        },
      ],
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  function deleteSkillConfig(configId: string) {
    automationState = {
      ...automationState,
      outboundSkillConfigs: automationState.outboundSkillConfigs.filter((config) => config.configId !== configId),
      triggers: automationState.triggers.filter((trigger) => trigger.skillConfigId !== configId),
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  function updateTrigger(triggerId: string, patch: Partial<RemoteAutomationState["triggers"][number]>) {
    automationState = {
      ...automationState,
      triggers: automationState.triggers.map((trigger) =>
        trigger.triggerId === triggerId ? { ...trigger, ...patch } : trigger,
      ),
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  function getTriggerIssues(triggerId: string): string[] {
    const trigger = automationState.triggers.find((item) => item.triggerId === triggerId);
    if (!trigger) {
      return ["trigger not found"];
    }

    if (!trigger.enabled) {
      return [];
    }

    const config = automationState.outboundSkillConfigs.find(
      (item) => item.configId === trigger.skillConfigId,
    );

    if (!config) {
      return ["linked outbound config is missing"];
    }

    const issues = getOutboundSkillPreflightIssues({
      config,
      profiles,
    });

    if (trigger.type === "task-success" && !trigger.taskId) {
      issues.push("task trigger is missing task binding");
    }

    return issues;
  }

  function addTrigger(type: RemoteAutomationState["triggers"][number]["type"]) {
    const fallbackConfigId = automationState.outboundSkillConfigs[0]?.configId ?? "";
    automationState = {
      ...automationState,
      triggers: [
        ...automationState.triggers,
        {
          triggerId: `trigger-${Date.now()}`,
          label: type === "manual" ? "New manual trigger" : "New task trigger",
          enabled: true,
          type,
          skillConfigId: fallbackConfigId,
          taskId: type === "task-success" ? "git_push_project" : null,
          fireOnStatus: "success",
          lastTriggeredAt: null,
        },
      ],
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  function deleteTrigger(triggerId: string) {
    automationState = {
      ...automationState,
      triggers: automationState.triggers.filter((trigger) => trigger.triggerId !== triggerId),
    };
    void saveRemoteAutomationState(automationState).then((nextState) => {
      automationState = nextState;
    });
  }

  async function updateProfile(projectId: string, patch: Partial<RemoteSkillProfile>) {
    const current = profiles.find((profile) => profile.projectId === projectId);
    if (!current) {
      return;
    }

    const nextProfile: RemoteSkillProfile = {
      ...current,
      ...patch,
      paths: {
        ...current.paths,
        ...(patch.paths ?? {}),
      },
      tasks: {
        ...current.tasks,
        ...(patch.tasks ?? {}),
      },
    };

    profiles = await remoteSkill.updateProfile({
      projectId: nextProfile.projectId,
      machineId: nextProfile.machineId,
      enabled: nextProfile.enabled,
      paths: nextProfile.paths,
      branch: nextProfile.branch,
      sharedToken: nextProfile.sharedToken,
      updateMode: nextProfile.updateMode,
      tasks: nextProfile.tasks,
    });
    automationState = {
      ...automationState,
      profiles,
    };
  }

  async function addProfile() {
    const nextProfile: RemoteSkillProfile = {
      projectId: `project-${Date.now()}`,
      machineId: `machine-${Date.now()}`,
      enabled: true,
      paths: {
        repoRoot: "",
      },
      branch: "main",
      sharedToken: "change-me",
      updateMode: "reset_hard",
      tasks: {
        fetchTaskId: "git_pull_project",
        stopServiceTaskId: "pnpm_dev_project",
        startServiceTaskId: "pnpm_dev_project",
      },
    };

    automationState = await saveRemoteAutomationState({
      ...automationState,
      profiles: [...(automationState.profiles ?? []), nextProfile],
    });
    profiles = automationState.profiles ?? [];
  }

  async function deleteProfile(projectId: string) {
    automationState = await saveRemoteAutomationState({
      ...automationState,
      profiles: (automationState.profiles ?? []).filter((profile) => profile.projectId !== projectId),
    });
    profiles = automationState.profiles ?? [];
  }

  onMount(() => {
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const unlistenPromise = listen<{ action?: string; snapshot?: ControlPanelSnapshot }>(
      CONTROL_PANEL_EVENT,
      ({ payload }) => {
        if (payload.snapshot) {
          snapshot = payload.snapshot;
        }
      },
    );

    void refreshLanState();
    void refreshTaskState();
    void loadRemoteAutomationState().then((state) => {
      automationState = state;
      profiles = state.profiles ?? [];
    });
    void getRemoteAutomationConfigPath().then((path) => {
      configPath = path;
    });
    void lanMochi.getLocalIdentity().then((identity) => {
      localSenderId = identity.senderId;
      localSenderName = identity.senderName;
    });
    refreshTimer = setInterval(() => {
      if (udpListening) {
        void refreshLanState();
      }

      if (runningTaskId !== null) {
        void refreshTaskState();
      }
    }, 2000);

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());

      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
    };
  });
</script>

<main class="control-page">
  <ControlPanel
    open={true}
    {udpListening}
    {udpPort}
    {networkBusy}
    {peers}
    recentEvents={recentEvents}
    {configPath}
    outboundSkillConfigs={automationState.outboundSkillConfigs}
    triggers={automationState.triggers}
    {profiles}
    {remoteSkillRuns}
    {tasks}
    {recentTaskRuns}
    {runningTaskId}
    debugCycleEnabled={snapshot.debugCycleEnabled}
    debugCodexCycleEnabled={snapshot.debugCodexCycleEnabled}
    debugCycleStage={snapshot.debugCycleStage}
    debugCodexStage={snapshot.debugCodexStage}
    onClose={() => void getCurrentWebviewWindow().close()}
    onToggleSystemDebug={() => void emitAction("toggle-system-debug")}
    onToggleCodexDebug={() => void emitAction("toggle-codex-debug")}
    onToggleUdpListener={() => void toggleUdpListener()}
    onBroadcastHello={() => void broadcastHello()}
    onRefreshNetwork={() => void refreshLanState()}
    onRevealConfig={(revealParent) => void revealConfig(revealParent)}
    onFireTrigger={(triggerId) => void fireTrigger(triggerId)}
    onTestTrigger={(triggerId) => void testTrigger(triggerId)}
    {getTriggerIssues}
    onAddSkillConfig={() => addSkillConfig()}
    onDeleteSkillConfig={(configId) => deleteSkillConfig(configId)}
    onUpdateSkillConfig={(configId, patch) => updateSkillConfig(configId, patch)}
    onAddTrigger={(type) => addTrigger(type)}
    onDeleteTrigger={(triggerId) => deleteTrigger(triggerId)}
    onUpdateTrigger={(triggerId, patch) => updateTrigger(triggerId, patch)}
    onAddProfile={() => void addProfile()}
    onDeleteProfile={(projectId) => void deleteProfile(projectId)}
    onUpdateProfile={(projectId, patch) => void updateProfile(projectId, patch)}
    onRunTask={(taskId) => void runTask(taskId)}
    onStopTask={() => void stopTask()}
  />
</main>

<style>
  :global(html),
  :global(body) {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, rgb(255 244 223 / 0.9), transparent 35%),
      linear-gradient(180deg, #f6ead8, #ecd5bb);
    color: #38281c;
    font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  }

  .control-page {
    width: 100%;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    display: grid;
    place-items: center;
  }
</style>
