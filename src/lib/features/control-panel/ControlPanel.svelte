<script lang="ts">
  import type { CodexActivity } from "$lib/models/codex-status";
  import type { LanPeer } from "$lib/models/lan-peer";
  import type { NetworkEvent } from "$lib/models/lan-message";
  import type { OutboundSkillConfig, RemoteSkillTrigger } from "$lib/models/remote-automation";
  import type { RemoteSkillProfile } from "$lib/models/remote-skill";
  import type { RemoteSkillRun } from "$lib/models/remote-skill-run";
  import type { TaskDefinition, TaskRun } from "$lib/models/task-runner";

  interface Props {
    open: boolean;
    udpListening: boolean;
    udpPort: number;
    networkBusy?: boolean;
    peers?: LanPeer[];
    recentEvents?: NetworkEvent[];
    configPath?: string | null;
    outboundSkillConfigs?: OutboundSkillConfig[];
    triggers?: RemoteSkillTrigger[];
    profiles?: RemoteSkillProfile[];
    remoteSkillRuns?: RemoteSkillRun[];
    tasks?: TaskDefinition[];
    recentTaskRuns?: TaskRun[];
    runningTaskId?: string | null;
    debugCycleEnabled: boolean;
    debugCodexCycleEnabled: boolean;
    debugCycleStage: "idle" | "calm" | "alert" | "busy";
    debugCodexStage: CodexActivity;
    onClose: () => void;
    onToggleSystemDebug: () => void;
    onToggleCodexDebug: () => void;
    onToggleUdpListener: () => void;
    onBroadcastHello: () => void;
    onRefreshNetwork: () => void;
    onRevealConfig: (revealParent: boolean) => void;
    onFireTrigger: (triggerId: string) => void;
    onTestTrigger: (triggerId: string) => void;
    getTriggerIssues: (triggerId: string) => string[];
    onAddSkillConfig: () => void;
    onDeleteSkillConfig: (configId: string) => void;
    onUpdateSkillConfig: (
      configId: string,
      patch: Partial<OutboundSkillConfig>,
    ) => void;
    onAddTrigger: (type: RemoteSkillTrigger["type"]) => void;
    onDeleteTrigger: (triggerId: string) => void;
    onUpdateTrigger: (
      triggerId: string,
      patch: Partial<RemoteSkillTrigger>,
    ) => void;
    onAddProfile: () => void;
    onDeleteProfile: (projectId: string) => void;
    onUpdateProfile: (
      projectId: string,
      patch: Partial<RemoteSkillProfile>,
    ) => void;
    onRunTask: (taskId: string) => void;
    onStopTask: () => void;
  }

  let {
    open,
    udpListening,
    udpPort,
    networkBusy = false,
    peers = [],
    recentEvents = [],
    configPath = null,
    outboundSkillConfigs = [],
    triggers = [],
    profiles = [],
    remoteSkillRuns = [],
    tasks = [],
    recentTaskRuns = [],
    runningTaskId = null,
    debugCycleEnabled,
    debugCodexCycleEnabled,
    debugCycleStage,
    debugCodexStage,
    onClose,
    onToggleSystemDebug,
    onToggleCodexDebug,
    onToggleUdpListener,
    onBroadcastHello,
    onRefreshNetwork,
    onRevealConfig,
    onFireTrigger,
    onTestTrigger,
    getTriggerIssues,
    onAddSkillConfig,
    onDeleteSkillConfig,
    onUpdateSkillConfig,
    onAddTrigger,
    onDeleteTrigger,
    onUpdateTrigger,
    onAddProfile,
    onDeleteProfile,
    onUpdateProfile,
    onRunTask,
    onStopTask,
  }: Props = $props();
  let activeSection = $state<"debug" | "lan" | "skills" | "triggers" | "profiles" | "tasks">("debug");
  let selectedTaskRun = $derived(getSelectedTaskRun());
  let selectedTaskRunId = $state<string | null>(null);

  function formatRelativeTime(timestamp: number): string {
    const delta = Math.max(0, Date.now() - timestamp);

    if (delta < 1_000) {
      return "just now";
    }

    if (delta < 60_000) {
      return `${Math.round(delta / 1_000)}s ago`;
    }

    return `${Math.round(delta / 60_000)}m ago`;
  }

  function getOnlinePeerCount(): number {
    return peers.filter((peer) => peer.status === "online").length;
  }

  function getSelectedTaskRun(): TaskRun | null {
    if (selectedTaskRunId === null) {
      return null;
    }

    return recentTaskRuns.find((run) => run.runId === selectedTaskRunId) ?? null;
  }

  function closeSelectedTaskRun() {
    selectedTaskRunId = null;
  }

  function getTaskStatusLabel(status: TaskRun["status"]): string {
    return status === "running"
      ? "运行中"
      : status === "ready"
        ? "就绪"
      : status === "success"
        ? "成功"
        : status === "stopped"
          ? "已停止"
          : "失败";
  }

  function getTaskOutputPreview(run: TaskRun): string {
    if (run.status === "running") {
      return run.stdout || run.stderr || "任务仍在运行中，输出会持续显示在这里。";
    }

    if (run.status === "ready") {
      return run.stdout || run.stderr || "服务已经就绪，正在等待后续操作。";
    }

    if (run.status === "failed" && run.stderr) {
      return run.stderr;
    }

    return run.stderr || run.stdout || "没有捕获到输出。";
  }

  function getTaskFailureSummary(run: TaskRun): string {
    if (run.status !== "failed") {
      return "";
    }

    const source = run.stderr || run.stdout;

    if (!source) {
      return run.exitCode === null ? "任务失败。" : `任务失败，退出码 ${run.exitCode}。`;
    }

    const [firstLine] = source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!firstLine) {
      return run.exitCode === null ? "任务失败。" : `任务失败，退出码 ${run.exitCode}。`;
    }

    return firstLine;
  }

  function getTaskFinishedAtLabel(run: TaskRun): string {
    if (run.finishedAt === null) {
      return "仍在运行";
    }

    return formatRelativeTime(run.finishedAt);
  }

  function getTaskKindLabel(kind: TaskRun["kind"] | TaskDefinition["kind"]): string {
    return kind === "service" ? "服务" : "检查";
  }

  function getRemoteSkillStageLabel(run: RemoteSkillRun): string {
    return run.stage === "received"
      ? "已入队"
      : run.stage === "running"
        ? "执行中"
      : run.stage === "success"
        ? "成功"
        : "失败";
  }

  function getRemoteSkillCategoryLabel(category: RemoteSkillRun["category"]): string {
    return category === "deployment"
      ? "部署"
      : category === "service-control"
        ? "服务控制"
        : "代码同步";
  }

  function getRemoteSkillSummary(run: RemoteSkillRun): string {
    if (run.currentStep) {
      return `步骤：${run.currentStep}`;
    }

    if (run.stage === "received") {
      return "等待执行";
    }

    return "当前没有活动步骤";
  }

  function getTriggerTypeLabel(type: RemoteSkillTrigger["type"]): string {
    return type === "manual" ? "手动触发" : "任务成功后触发";
  }

  function getTriggerConfigLabel(trigger: RemoteSkillTrigger): string {
    const config = outboundSkillConfigs.find((item) => item.configId === trigger.skillConfigId);
    if (!config) {
      return "未关联发送配置";
    }

    return `${config.skillId} -> ${config.targetMachineId}`;
  }

  function getTriggerStateLabel(triggerId: string): string {
    return getTriggerIssues(triggerId).length > 0 ? "已阻止" : "可发送";
  }

  function getSkillConfigIssues(config: OutboundSkillConfig): string[] {
    const issues: string[] = [];

    if (!config.skillId.trim()) issues.push("missing skillId");
    if (!config.projectId.trim()) issues.push("缺少 projectId");
    if (!config.targetMachineId.trim()) issues.push("缺少目标机器");
    if (!config.branch.trim()) issues.push("缺少分支");
    if (!config.token.trim()) issues.push("缺少 token");

    return issues;
  }

  function getProfileIssues(profile: RemoteSkillProfile): string[] {
    const issues: string[] = [];

    if (!profile.projectId.trim()) issues.push("缺少 projectId");
    if (!profile.machineId.trim()) issues.push("缺少 machineId");
    if (!profile.paths.repoRoot.trim()) issues.push("缺少仓库目录");
    if (!profile.branch.trim()) issues.push("缺少分支");
    if (!profile.sharedToken.trim()) issues.push("缺少 token");
    if (!profile.tasks.fetchTaskId.trim()) issues.push("缺少 fetch 任务");
    if (!profile.tasks.stopServiceTaskId.trim()) issues.push("缺少停止任务");
    if (!profile.tasks.startServiceTaskId.trim()) issues.push("缺少启动任务");

    return issues;
  }
</script>

{#if open}
  <aside class="control-panel" aria-label="MochiDesk control panel">
    <header class="panel-header">
      <div class="title-group">
        <div class="badge-row">
          <p class="eyebrow">MochiDesk 控制台</p>
          <span class="status-pill" class:status-live={udpListening}>
            {udpListening ? "LAN live" : "LAN idle"}
          </span>
        </div>

        <h2>控制面板</h2>
        <p class="hero-copy">
          这里集中管理调试循环、局域网通信、远程技能和本地任务执行。
        </p>
      </div>

      <button type="button" class="icon-button" onclick={onClose}>关闭</button>
    </header>

    <div class="dashboard-layout">
      <nav class="panel-nav" aria-label="Control panel sections">
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "debug"}
          onclick={() => {
            activeSection = "debug";
          }}
        >
          调试
        </button>
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "lan"}
          onclick={() => {
            activeSection = "lan";
          }}
        >
          局域网
        </button>
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "skills"}
          onclick={() => {
            activeSection = "skills";
          }}
        >
          技能
        </button>
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "triggers"}
          onclick={() => {
            activeSection = "triggers";
          }}
        >
          触发器
        </button>
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "profiles"}
          onclick={() => {
            activeSection = "profiles";
          }}
        >
          接收配置
        </button>
        <button
          type="button"
          class="nav-chip"
          class:active={activeSection === "tasks"}
          onclick={() => {
            activeSection = "tasks";
          }}
        >
          任务
        </button>
      </nav>

      <div class="content-column">
        <section class="hero-strip" aria-label="Control panel summary">
          <div class="summary-chip">
            <span class="status-label">系统循环</span>
            <strong>{debugCycleEnabled ? debugCycleStage : "关闭"}</strong>
          </div>

          <div class="summary-chip">
            <span class="status-label">Codex 循环</span>
            <strong>{debugCodexCycleEnabled ? debugCodexStage : "关闭"}</strong>
          </div>

          <div class="summary-chip">
            <span class="status-label">在线设备</span>
            <strong>{getOnlinePeerCount()}/{peers.length}</strong>
          </div>

          <div class="summary-chip" class:summary-chip-live={udpListening}>
            <span class="status-label">局域网</span>
            <strong>{udpListening ? "运行中" : "空闲"}</strong>
          </div>
        </section>

        {#if activeSection === "debug"}
          <section class="panel-section">
            <div class="section-heading">
              <h3>调试控制</h3>
              <p>原来的隐藏快捷手势仍然可用，不过现在建议主要在这个面板里操作。</p>
            </div>

            <div class="button-row">
              <button type="button" class:active={debugCycleEnabled} onclick={onToggleSystemDebug}>
                {debugCycleEnabled ? `停止系统循环（${debugCycleStage}）` : "启动系统循环"}
              </button>
              <button type="button" class:active={debugCodexCycleEnabled} onclick={onToggleCodexDebug}>
                {debugCodexCycleEnabled ? `停止 Codex 循环（${debugCodexStage}）` : "启动 Codex 循环"}
              </button>
            </div>

            <div class="detail-grid">
              <div class="detail-card">
                <span class="status-label">系统情绪</span>
                <strong>{debugCycleEnabled ? debugCycleStage : "关闭"}</strong>
                <p>用于强制切换桌宠在 idle、calm、alert、busy 四种系统状态下的表现。</p>
              </div>

              <div class="detail-card">
                <span class="status-label">Codex 活动</span>
                <strong>{debugCodexCycleEnabled ? debugCodexStage : "关闭"}</strong>
                <p>用于观察不同 Codex 语义状态如何影响动作、注意力和反馈表现。</p>
              </div>
            </div>
          </section>
        {/if}

        {#if activeSection === "lan"}
          <section class="panel-section">
            <div class="section-heading">
              <h3>局域网状态</h3>
              <p>当前是 UDP 发现与消息调试阶段，用于局域网内 Mochi 之间通信。</p>
            </div>

            <div class="status-row">
              <div class="status-card">
                <span class="status-label">监听器</span>
                <strong>{udpListening ? "运行中" : "已停止"}</strong>
              </div>
              <div class="status-card">
                <span class="status-label">端口</span>
                <strong>{udpPort}</strong>
              </div>
              <div class="status-card">
                <span class="status-label">设备</span>
                <strong>{peers.length}</strong>
              </div>
            </div>

            <div class="button-row">
              <button type="button" class:active={udpListening} disabled={networkBusy} onclick={onToggleUdpListener}>
                {udpListening ? "停止 UDP 监听" : "启动 UDP 监听"}
              </button>
              <button type="button" disabled={networkBusy || !udpListening} onclick={onBroadcastHello}>
                广播 hello
              </button>
              <button type="button" disabled={networkBusy} onclick={onRefreshNetwork}>刷新设备列表</button>
            </div>

            <div class="list-grid">
              <div class="panel-list">
                <div class="list-title">已发现设备</div>
                {#if peers.length === 0}
                  <p class="empty-state">暂时还没有发现设备。先启动 UDP，再广播一次 hello。</p>
                {:else}
                  {#each peers as peer}
                    <div class="list-item">
                      <div>
                        <strong>{peer.name}</strong>
                        <div class="meta">{peer.address}:{peer.port}</div>
                      </div>
                      <div class="list-side">
                        <span>{peer.activity}</span>
                        <span class="meta">{formatRelativeTime(peer.lastSeenAt)}</span>
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>

              <div class="panel-list">
                <div class="list-title">最近事件</div>
                {#if recentEvents.length === 0}
                  <p class="empty-state">暂时还没有网络事件。</p>
                {:else}
                  {#each recentEvents.slice().reverse() as event}
                    <div class="list-item">
                      <div>
                        <strong>{event.direction} {event.message.type}</strong>
                        <div class="meta">{event.address}:{event.port}</div>
                      </div>
                      <div class="list-side">
                        <span>{event.message.senderName}</span>
                        <span class="meta">{formatRelativeTime(event.receivedAt)}</span>
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </section>
        {/if}

        {#if activeSection === "skills"}
          <section class="panel-section">
            <div class="section-heading">
              <h3>远程技能</h3>
              <p>查看局域网内远程技能请求的接收、执行进度和最终结果。</p>
            </div>

            <div class="panel-list">
              <div class="list-title">最近执行记录</div>
                {#if remoteSkillRuns.length === 0}
                  <p class="empty-state">暂时还没有远程技能执行记录。</p>
                {:else}
                  {#each remoteSkillRuns as run}
                    <div
                      class="detail-card detail-card-dashed"
                      class:detail-card-running={run.stage === "running" || run.stage === "received"}
                      class:detail-card-success={run.stage === "success"}
                      class:detail-card-failed={run.stage === "failed"}
                    >
                      <div class="skill-run-header">
                        <span
                          class="status-label"
                          class:status-label-running={run.stage === "running" || run.stage === "received"}
                          class:status-label-success={run.stage === "success"}
                          class:status-label-failed={run.stage === "failed"}
                        >
                          {run.skillId} · {getRemoteSkillCategoryLabel(run.category)}
                        </span>
                        <span
                          class="skill-stage-pill"
                          class:skill-stage-pill-running={run.stage === "running" || run.stage === "received"}
                          class:skill-stage-pill-success={run.stage === "success"}
                          class:skill-stage-pill-failed={run.stage === "failed"}
                        >
                          {getRemoteSkillStageLabel(run)}
                        </span>
                      </div>
                      <strong>{run.targetMachineId}</strong>
                      <div class="meta">{run.targetMachineId} · {formatRelativeTime(run.updatedAt)}</div>
                      <div class="meta">{run.projectId} · {getRemoteSkillSummary(run)}</div>
                      <p>{run.detail}</p>
                      <div class="skill-request-id">请求 ID：{run.requestId}</div>
                    </div>
                  {/each}
                {/if}
            </div>
          </section>
        {/if}

        {#if activeSection === "triggers"}
          <section class="panel-section">
            <div class="section-heading">
              <h3>触发器</h3>
              <p>配置这台机器在什么时机自动发送远程技能请求。</p>
            </div>

            <div class="toolbar-row">
              <button type="button" onclick={() => onAddTrigger("manual")}>新增手动触发器</button>
              <button type="button" onclick={() => onAddTrigger("task-success")}>新增任务触发器</button>
              <button type="button" onclick={onAddSkillConfig}>新增发送配置</button>
              <button type="button" onclick={() => onRevealConfig(true)}>打开配置目录</button>
              <button type="button" onclick={() => onRevealConfig(false)}>打开配置文件</button>
            </div>

            {#if configPath}
              <p class="config-path">配置文件：{configPath}</p>
            {/if}

            <div class="detail-grid">
              <div class="panel-list">
                <div class="list-title">触发规则</div>
                {#if triggers.length === 0}
                  <p class="empty-state">暂时还没有触发器配置。</p>
                {:else}
                  {#each triggers as trigger}
                    <div class="detail-card detail-card-dashed">
                      <div class="skill-run-header">
                        <span class="status-label">{trigger.label}</span>
                        <div class="inline-actions">
                          <span class="skill-stage-pill" class:skill-stage-pill-success={trigger.enabled}>
                            {trigger.enabled ? "启用中" : "已停用"}
                          </span>
                          <button type="button" class="inline-button inline-button-danger" onclick={() => onDeleteTrigger(trigger.triggerId)}>
                            删除
                          </button>
                        </div>
                      </div>
                      <strong>{getTriggerTypeLabel(trigger.type)}</strong>
                      <div
                        class="trigger-state-pill"
                        class:trigger-state-pill-ready={getTriggerIssues(trigger.triggerId).length === 0}
                        class:trigger-state-pill-blocked={getTriggerIssues(trigger.triggerId).length > 0}
                      >
                        {getTriggerStateLabel(trigger.triggerId)}
                      </div>
                      {#if getTriggerIssues(trigger.triggerId).length > 0}
                        <div class="issue-badge">{getTriggerIssues(trigger.triggerId).join(" · ")}</div>
                      {/if}
                      <div class="meta">{getTriggerConfigLabel(trigger)}</div>
                      <label class="form-field">
                        <span class="status-label">Enabled</span>
                        <input
                          type="checkbox"
                          checked={trigger.enabled}
                          onchange={(event) =>
                            onUpdateTrigger(trigger.triggerId, {
                              enabled: (event.currentTarget as HTMLInputElement).checked,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Label</span>
                        <input
                          type="text"
                          value={trigger.label}
                          oninput={(event) =>
                            onUpdateTrigger(trigger.triggerId, {
                              label: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Linked config</span>
                        <select
                          value={trigger.skillConfigId}
                          onchange={(event) =>
                            onUpdateTrigger(trigger.triggerId, {
                              skillConfigId: (event.currentTarget as HTMLSelectElement).value,
                            })}
                        >
                          {#each outboundSkillConfigs as config}
                            <option value={config.configId}>{config.label}</option>
                          {/each}
                        </select>
                      </label>
                      <label class="form-field">
                        <span class="status-label">Task binding</span>
                        <input
                          type="text"
                          value={trigger.taskId ?? ""}
                          placeholder="git_push_project"
                          disabled={trigger.type !== "task-success"}
                          oninput={(event) =>
                            onUpdateTrigger(trigger.triggerId, {
                              taskId: (event.currentTarget as HTMLInputElement).value || null,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Fire on status</span>
                        <select
                          value={trigger.fireOnStatus}
                          disabled={trigger.type !== "task-success"}
                          onchange={(event) =>
                            onUpdateTrigger(trigger.triggerId, {
                              fireOnStatus: (event.currentTarget as HTMLSelectElement).value as
                                | "success"
                                | "ready",
                            })}
                        >
                          <option value="success">success</option>
                          <option value="ready">ready</option>
                        </select>
                      </label>
                      <div class="meta">
                        {trigger.lastTriggeredAt === null
                          ? "尚未触发过"
                          : `最近触发：${formatRelativeTime(trigger.lastTriggeredAt)}`}
                      </div>
                      <div class="toolbar-row">
                        <button
                          type="button"
                          disabled={networkBusy || getTriggerIssues(trigger.triggerId).length > 0}
                          onclick={() => onTestTrigger(trigger.triggerId)}
                        >
                          测试触发器
                        </button>
                        {#if trigger.type === "manual"}
                          <button
                            type="button"
                            disabled={networkBusy || getTriggerIssues(trigger.triggerId).length > 0}
                            onclick={() => onFireTrigger(trigger.triggerId)}
                          >
                            立即发送
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>

              <div class="panel-list">
                <div class="list-title">发送配置</div>
                {#if outboundSkillConfigs.length === 0}
                  <p class="empty-state">暂时还没有发送配置。</p>
                {:else}
                  {#each outboundSkillConfigs as config}
                    <div class="detail-card detail-card-dashed">
                      <div class="skill-run-header">
                        <span class="status-label">{config.label}</span>
                        <button type="button" class="inline-button inline-button-danger" onclick={() => onDeleteSkillConfig(config.configId)}>
                          删除
                        </button>
                      </div>
                      <strong>{config.skillId}</strong>
                      {#if getSkillConfigIssues(config).length > 0}
                        <div class="issue-badge">{getSkillConfigIssues(config).join(" · ")}</div>
                      {/if}
                      <label class="form-field">
                        <span class="status-label">Enabled</span>
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onchange={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              enabled: (event.currentTarget as HTMLInputElement).checked,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Label</span>
                        <input
                          type="text"
                          value={config.label}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              label: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Skill ID</span>
                        <input
                          type="text"
                          value={config.skillId}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              skillId: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Project ID</span>
                        <input
                          type="text"
                          value={config.projectId}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              projectId: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Target machine</span>
                        <input
                          type="text"
                          value={config.targetMachineId}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              targetMachineId: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Branch</span>
                        <input
                          type="text"
                          value={config.branch}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              branch: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Service name</span>
                        <input
                          type="text"
                          value={config.serviceName}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              serviceName: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                      <label class="form-field">
                        <span class="status-label">Shared token</span>
                        <input
                          type="text"
                          value={config.token}
                          oninput={(event) =>
                            onUpdateSkillConfig(config.configId, {
                              token: (event.currentTarget as HTMLInputElement).value,
                            })}
                        />
                      </label>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </section>
        {/if}

        {#if activeSection === "profiles"}
          <section class="panel-section">
            <div class="section-heading">
              <h3>接收端配置</h3>
              <p>配置这台机器收到远程技能请求后允许执行什么，以及在哪个目录执行。</p>
            </div>

            <div class="toolbar-row">
              <button type="button" onclick={onAddProfile}>新增接收配置</button>
            </div>

            <div class="panel-list">
              <div class="list-title">本机执行配置</div>
              {#if profiles.length === 0}
                <p class="empty-state">暂时还没有接收端配置。</p>
              {:else}
                {#each profiles as profile}
                  <div class="detail-card detail-card-dashed">
                    <div class="skill-run-header">
                      <span class="status-label">{profile.projectId}</span>
                      <button type="button" class="inline-button inline-button-danger" onclick={() => onDeleteProfile(profile.projectId)}>
                        删除
                      </button>
                    </div>
                    <strong>{profile.machineId}</strong>
                    {#if getProfileIssues(profile).length > 0}
                      <div class="issue-badge">{getProfileIssues(profile).join(" · ")}</div>
                    {/if}

                    <label class="form-field">
                      <span class="status-label">Enabled</span>
                      <input
                        type="checkbox"
                        checked={profile.enabled ?? true}
                        onchange={(event) =>
                          onUpdateProfile(profile.projectId, {
                            enabled: (event.currentTarget as HTMLInputElement).checked,
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Project ID</span>
                      <input
                        type="text"
                        value={profile.projectId}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            projectId: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Machine ID</span>
                      <input
                        type="text"
                        value={profile.machineId}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            machineId: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Repo root</span>
                      <input
                        type="text"
                        value={profile.paths.repoRoot}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            paths: {
                              ...profile.paths,
                              repoRoot: (event.currentTarget as HTMLInputElement).value,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Tauri root</span>
                      <input
                        type="text"
                        value={profile.paths.tauriRoot ?? ""}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            paths: {
                              ...profile.paths,
                              tauriRoot: (event.currentTarget as HTMLInputElement).value || undefined,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Service root</span>
                      <input
                        type="text"
                        value={profile.paths.serviceRoot ?? ""}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            paths: {
                              ...profile.paths,
                              serviceRoot: (event.currentTarget as HTMLInputElement).value || undefined,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Branch</span>
                      <input
                        type="text"
                        value={profile.branch}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            branch: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Shared token</span>
                      <input
                        type="text"
                        value={profile.sharedToken}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            sharedToken: (event.currentTarget as HTMLInputElement).value,
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Update mode</span>
                      <select
                        value={profile.updateMode}
                        onchange={(event) =>
                          onUpdateProfile(profile.projectId, {
                            updateMode: (event.currentTarget as HTMLSelectElement).value as
                              | "ff_only"
                              | "reset_hard",
                          })}
                      >
                        <option value="ff_only">ff_only</option>
                        <option value="reset_hard">reset_hard</option>
                      </select>
                    </label>

                    <label class="form-field">
                      <span class="status-label">Fetch task</span>
                      <input
                        type="text"
                        value={profile.tasks.fetchTaskId}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            tasks: {
                              ...profile.tasks,
                              fetchTaskId: (event.currentTarget as HTMLInputElement).value,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Pull task</span>
                      <input
                        type="text"
                        value={profile.tasks.pullTaskId ?? ""}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            tasks: {
                              ...profile.tasks,
                              pullTaskId: (event.currentTarget as HTMLInputElement).value || undefined,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Reset task</span>
                      <input
                        type="text"
                        value={profile.tasks.resetTaskId ?? ""}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            tasks: {
                              ...profile.tasks,
                              resetTaskId: (event.currentTarget as HTMLInputElement).value || undefined,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Stop service task</span>
                      <input
                        type="text"
                        value={profile.tasks.stopServiceTaskId}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            tasks: {
                              ...profile.tasks,
                              stopServiceTaskId: (event.currentTarget as HTMLInputElement).value,
                            },
                          })}
                      />
                    </label>

                    <label class="form-field">
                      <span class="status-label">Start service task</span>
                      <input
                        type="text"
                        value={profile.tasks.startServiceTaskId}
                        oninput={(event) =>
                          onUpdateProfile(profile.projectId, {
                            tasks: {
                              ...profile.tasks,
                              startServiceTaskId: (event.currentTarget as HTMLInputElement).value,
                            },
                          })}
                      />
                    </label>
                  </div>
                {/each}
              {/if}
            </div>
          </section>
        {/if}

        {#if activeSection === "tasks"}
          <section class="panel-section panel-section-muted">
            <div class="section-heading">
              <h3>任务</h3>
              <p>在不离开控制面板的情况下执行一组受控的本地开发任务。</p>
            </div>

            <div class="detail-grid">
              <div class="panel-list">
                <div class="list-title">可用任务</div>
                {#if runningTaskId !== null}
                  <div class="task-running-banner">
                    <span class="task-running-dot" aria-hidden="true"></span>
                    <span>当前有任务正在运行，如有需要可以在这里停止。</span>
                    <button type="button" class="task-stop-button" onclick={onStopTask}>停止任务</button>
                  </div>
                {/if}
                {#if tasks.length === 0}
                  <p class="empty-state">暂时还没有可用任务。</p>
                {:else}
                  {#each tasks as task}
                  <div class="task-item">
                      <div>
                        <strong>{task.label}</strong>
                        <div class="meta task-kind">{getTaskKindLabel(task.kind)}</div>
                        <div class="meta">{task.commandPreview}</div>
                        <div class="meta task-cwd">{task.cwd}</div>
                      </div>

                      <button
                        type="button"
                        disabled={runningTaskId !== null}
                        class:loading={runningTaskId === task.id}
                        onclick={() => onRunTask(task.id)}
                      >
                        {#if runningTaskId === task.id}
                          运行中...
                        {:else if runningTaskId !== null}
                          忙碌
                        {:else}
                          运行
                        {/if}
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>

              <div class="panel-list">
                <div class="list-title">最近运行</div>
                {#if recentTaskRuns.length === 0}
                  <p class="empty-state">暂时还没有从这个面板运行过任务。</p>
                {:else}
                  {#each recentTaskRuns.slice().reverse() as run}
                    <button
                      type="button"
                      class="detail-card detail-card-dashed detail-card-button"
                      class:detail-card-running={run.status === "running"}
                      class:detail-card-ready={run.status === "ready"}
                      class:detail-card-success={run.status === "success"}
                      class:detail-card-failed={run.status === "failed"}
                      onclick={() => {
                        selectedTaskRunId = run.runId;
                      }}
                    >
                      <span
                        class="status-label"
                        class:status-label-running={run.status === "running"}
                        class:status-label-ready={run.status === "ready"}
                        class:status-label-success={run.status === "success"}
                        class:status-label-stopped={run.status === "stopped"}
                        class:status-label-failed={run.status === "failed"}
                      >
                        {run.label} · {getTaskKindLabel(run.kind)}
                      </span>
                      <strong
                        class:status-text-running={run.status === "running"}
                        class:status-text-ready={run.status === "ready"}
                        class:status-text-success={run.status === "success"}
                        class:status-text-stopped={run.status === "stopped"}
                        class:status-text-failed={run.status === "failed"}
                      >
                        {getTaskStatusLabel(run.status)} {run.exitCode === null ? "" : `(exit ${run.exitCode})`}
                      </strong>
                      <div class="meta">{getTaskFinishedAtLabel(run)}</div>
                      {#if run.status === "failed"}
                        <div class="task-failure-badge">
                          <span class="task-failure-badge-mark" aria-hidden="true">!</span>
                          <span>{getTaskFailureSummary(run)}</span>
                        </div>
                      {/if}
                      <p class:task-preview-failed={run.status === "failed"}>
                        {getTaskOutputPreview(run)}
                      </p>
                    </button>
                  {/each}
                {/if}
              </div>
            </div>
          </section>
        {/if}
      </div>
    </div>

    {#if selectedTaskRun}
      <div
        class="task-run-modal-backdrop"
        role="presentation"
        onclick={closeSelectedTaskRun}
      >
        <div
          class="task-run-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Task output details"
          onclick={(event) => {
            event.stopPropagation();
          }}
          onkeydown={(event) => {
            if (event.key === "Escape") {
              closeSelectedTaskRun();
            }
          }}
          tabindex="0"
        >
          <header class="task-run-modal-header">
            <div>
              <p class="eyebrow">任务输出</p>
              <h3>{selectedTaskRun.label}</h3>
            </div>

            <button
              type="button"
              class="icon-button"
              onclick={closeSelectedTaskRun}
            >
              关闭
            </button>
          </header>

          <div class="task-run-meta">
            <div
              class="status-card"
              class:status-card-running={selectedTaskRun.status === "running"}
              class:status-card-ready={selectedTaskRun.status === "ready"}
              class:status-card-success={selectedTaskRun.status === "success"}
              class:status-card-failed={selectedTaskRun.status === "failed"}
            >
              <span
                class="status-label"
                class:status-label-running={selectedTaskRun.status === "running"}
                class:status-label-ready={selectedTaskRun.status === "ready"}
                class:status-label-success={selectedTaskRun.status === "success"}
                class:status-label-stopped={selectedTaskRun.status === "stopped"}
                class:status-label-failed={selectedTaskRun.status === "failed"}
              >
                Status
              </span>
              <strong
                class:status-text-running={selectedTaskRun.status === "running"}
                class:status-text-ready={selectedTaskRun.status === "ready"}
                class:status-text-success={selectedTaskRun.status === "success"}
                class:status-text-stopped={selectedTaskRun.status === "stopped"}
                class:status-text-failed={selectedTaskRun.status === "failed"}
              >
                {getTaskStatusLabel(selectedTaskRun.status)}
              </strong>
            </div>
            <div class="status-card">
              <span class="status-label">Exit code</span>
              <strong>{selectedTaskRun.exitCode === null ? "-" : selectedTaskRun.exitCode}</strong>
            </div>
          </div>

          <div class="task-run-output-grid">
            <section class="task-run-output">
              <div class="list-title">stdout</div>
              <pre>{selectedTaskRun.stdout || "No stdout captured."}</pre>
            </section>

            <section
              class="task-run-output"
              class:task-run-output-failed={selectedTaskRun.status === "failed" && Boolean(selectedTaskRun.stderr)}
            >
              <div class="list-title">stderr</div>
              <pre>{selectedTaskRun.stderr || "No stderr captured."}</pre>
            </section>
          </div>
        </div>
      </div>
    {/if}
  </aside>
{/if}

<style>
  .control-panel {
    width: min(980px, calc(100vw - 24px));
    min-height: min(720px, calc(100vh - 24px));
    max-height: calc(100vh - 24px);
    display: grid;
    gap: 18px;
    padding: 22px;
    box-sizing: border-box;
    overflow: auto;
    border-radius: 32px;
    background:
      radial-gradient(circle at top left, rgb(255 239 211 / 0.9), transparent 28%),
      radial-gradient(circle at bottom right, rgb(241 210 172 / 0.5), transparent 26%),
      linear-gradient(180deg, rgb(255 251 244 / 0.98), rgb(243 230 211 / 0.95));
    border: 1px solid rgb(177 131 84 / 0.22);
    box-shadow:
      0 30px 70px rgb(69 40 15 / 0.22),
      inset 0 1px 0 rgb(255 255 255 / 0.72);
    backdrop-filter: blur(14px);
    color: #38281c;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .title-group {
    display: grid;
    gap: 8px;
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .eyebrow {
    margin: 0;
    color: #8f6441;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .panel-header h2,
  .section-heading h3,
  .list-title,
  .list-item strong {
    margin: 0;
  }

  .panel-header h2 {
    font-size: 34px;
    line-height: 0.98;
  }

  .hero-copy {
    margin: 0;
    max-width: 58ch;
    color: #6a4a31;
    font-size: 14px;
    line-height: 1.5;
  }

  .dashboard-layout {
    display: grid;
    grid-template-columns: 148px minmax(0, 1fr);
    gap: 18px;
    min-height: 0;
  }

  .panel-nav {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .nav-chip {
    border: 0;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgb(255 252 247 / 0.64);
    border: 1px solid rgb(192 154 117 / 0.16);
    color: #7a5739;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .nav-chip:hover {
    transform: translateY(-1px);
  }

  .nav-chip.active {
    background: linear-gradient(180deg, #8a5e39, #6f4527);
    color: #fff7ef;
    box-shadow: 0 12px 24px rgb(102 60 29 / 0.18);
  }

  .content-column {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .hero-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-chip {
    display: grid;
    gap: 3px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgb(255 253 249 / 0.84), rgb(248 238 223 / 0.76));
    border: 1px solid rgb(191 149 104 / 0.14);
  }

  .summary-chip strong {
    font-size: 18px;
    line-height: 1;
  }

  .summary-chip-live {
    background:
      radial-gradient(circle at top right, rgb(255 208 157 / 0.22), transparent 40%),
      linear-gradient(180deg, rgb(255 249 240 / 0.9), rgb(246 229 206 / 0.82));
  }

  .panel-section {
    display: grid;
    gap: 14px;
    padding: 18px;
    border-radius: 24px;
    background: linear-gradient(180deg, rgb(255 251 245 / 0.82), rgb(251 243 231 / 0.76));
    border: 1px solid rgb(188 146 101 / 0.16);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.68);
  }

  .panel-section-muted {
    background: linear-gradient(180deg, rgb(249 241 230 / 0.8), rgb(243 231 214 / 0.72));
  }

  .section-heading {
    display: grid;
    gap: 5px;
  }

  .section-heading h3 {
    font-size: 20px;
  }

  .section-heading p,
  .empty-state {
    margin: 0;
    color: #76563b;
    font-size: 13px;
    line-height: 1.45;
  }

  .status-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .button-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }

  .panel-header .icon-button {
    align-self: flex-start;
    white-space: nowrap;
  }

  .list-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .status-card,
  .detail-card {
    min-width: 0;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgb(255 255 255 / 0.62);
    border: 1px solid rgb(191 149 104 / 0.16);
  }

  .status-card-success {
    background: linear-gradient(180deg, rgb(241 255 246 / 0.94), rgb(225 246 232 / 0.86));
    border-color: rgb(104 168 120 / 0.28);
  }

  .status-card-running {
    background: linear-gradient(180deg, rgb(245 248 255 / 0.96), rgb(229 237 250 / 0.86));
    border-color: rgb(105 132 188 / 0.24);
  }

  .status-card-ready {
    background: linear-gradient(180deg, rgb(241 252 247 / 0.96), rgb(223 242 231 / 0.88));
    border-color: rgb(88 159 121 / 0.24);
  }

  .status-card-failed {
    background: linear-gradient(180deg, rgb(255 243 241 / 0.96), rgb(249 225 219 / 0.84));
    border-color: rgb(191 102 90 / 0.28);
  }

  .detail-card {
    display: grid;
    gap: 6px;
  }

  .detail-card-button {
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  .detail-card-button:hover {
    transform: translateY(-1px);
    border-color: rgb(173 124 82 / 0.28);
    box-shadow: 0 10px 24px rgb(95 58 28 / 0.08);
  }

  .detail-card strong {
    font-size: 18px;
    line-height: 1.15;
  }

  .detail-card p {
    margin: 0;
    color: #6f5138;
    font-size: 13px;
    line-height: 1.45;
  }

  .skill-run-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .skill-stage-pill {
    flex: none;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgb(143 100 65 / 0.12);
    color: #7e5840;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .skill-stage-pill-running {
    background: rgb(106 132 190 / 0.16);
    color: #48649a;
  }

  .skill-stage-pill-success {
    background: rgb(98 165 114 / 0.16);
    color: #447b52;
  }

  .skill-stage-pill-failed {
    background: rgb(197 100 85 / 0.16);
    color: #9f4033;
  }

  .skill-request-id {
    color: #8f6441;
    font-size: 12px;
    line-height: 1.35;
    word-break: break-all;
  }

  .form-field {
    display: grid;
    gap: 6px;
  }

  .toolbar-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .inline-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .inline-button {
    border: 1px solid rgb(188 146 101 / 0.24);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.8);
    color: #6f5138;
    padding: 6px 10px;
    font: inherit;
    cursor: pointer;
  }

  .inline-button-danger {
    color: #9f4033;
    border-color: rgb(197 100 85 / 0.24);
    background: rgb(255 244 242 / 0.92);
  }

  .config-path {
    margin: 0;
    color: #76563b;
    font-size: 12px;
    line-height: 1.45;
    word-break: break-all;
  }

  .issue-badge {
    width: fit-content;
    max-width: 100%;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgb(193 145 62 / 0.14);
    color: #8a5b10;
    font-size: 12px;
    line-height: 1.35;
  }

  .trigger-state-pill {
    width: fit-content;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 700;
  }

  .trigger-state-pill-ready {
    background: rgb(98 165 114 / 0.14);
    color: #447b52;
  }

  .trigger-state-pill-blocked {
    background: rgb(197 100 85 / 0.14);
    color: #9f4033;
  }

  .form-field input,
  .form-field select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid rgb(188 146 101 / 0.24);
    border-radius: 12px;
    background: rgb(255 255 255 / 0.82);
    color: #4c3524;
    padding: 9px 11px;
    font: inherit;
  }

  .form-field input[type="checkbox"] {
    width: 18px;
    height: 18px;
    padding: 0;
  }

  .form-field input:disabled,
  .form-field select:disabled {
    opacity: 0.55;
  }

  .task-preview-failed {
    color: #7e3c33;
  }

  .task-failure-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    max-width: 100%;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgb(193 95 80 / 0.12);
    color: #9f3528;
    font-size: 12px;
    line-height: 1.35;
  }

  .task-failure-badge span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-failure-badge-mark {
    flex: none;
    width: 18px;
    height: 18px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    background: rgb(193 95 80 / 0.18);
    font-size: 12px;
    font-weight: 700;
  }

  .detail-card-dashed {
    border-style: dashed;
    background: rgb(255 249 241 / 0.58);
  }

  .detail-card-success {
    background: linear-gradient(180deg, rgb(241 255 246 / 0.9), rgb(226 246 233 / 0.82));
    border-color: rgb(104 168 120 / 0.28);
    box-shadow:
      inset 4px 0 0 #62a572,
      0 10px 24px rgb(68 124 83 / 0.06);
  }

  .detail-card-running {
    background: linear-gradient(180deg, rgb(244 248 255 / 0.94), rgb(230 237 250 / 0.84));
    border-color: rgb(105 132 188 / 0.24);
    box-shadow:
      inset 4px 0 0 #6a84be,
      0 10px 24px rgb(84 107 156 / 0.08);
  }

  .detail-card-ready {
    background: linear-gradient(180deg, rgb(241 252 247 / 0.94), rgb(224 242 232 / 0.84));
    border-color: rgb(88 159 121 / 0.24);
    box-shadow:
      inset 4px 0 0 #5da57d,
      0 10px 24px rgb(71 128 97 / 0.08);
  }

  .detail-card-failed {
    background: linear-gradient(180deg, rgb(255 243 241 / 0.92), rgb(249 225 219 / 0.82));
    border-color: rgb(191 102 90 / 0.28);
    box-shadow:
      inset 4px 0 0 #c56455,
      0 10px 24px rgb(148 75 63 / 0.08);
  }

  .status-label {
    display: block;
    margin-bottom: 4px;
    color: #8f6441;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-label-success {
    color: #4c8a5a;
  }

  .status-label-ready {
    color: #4b8f67;
  }

  .status-label-running {
    color: #5c76ac;
  }

  .status-label-failed {
    color: #b14d3e;
  }

  .status-label-stopped {
    color: #8b6741;
  }

  .status-text-success {
    color: #2f6e3f;
  }

  .status-text-ready {
    color: #31704b;
  }

  .status-text-running {
    color: #425f9d;
  }

  .status-text-failed {
    color: #9f3528;
  }

  .status-text-stopped {
    color: #785632;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 12px 15px;
    background: linear-gradient(180deg, #8b5f39, #724729);
    color: #fff9f4;
    font: inherit;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      opacity 0.18s ease;
    box-shadow: 0 10px 18px rgb(103 58 22 / 0.18);
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:disabled {
    opacity: 0.52;
    cursor: not-allowed;
    box-shadow: none;
  }

  button.active {
    background: linear-gradient(180deg, #b15431, #8f3f22);
  }

  .icon-button {
    padding-inline: 12px;
    background: rgb(111 74 42 / 0.12);
    color: #6d4427;
    box-shadow: none;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 5px 9px;
    background: rgb(109 76 50 / 0.12);
    color: #6d4d34;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-pill.status-live {
    background: rgb(182 88 43 / 0.16);
    color: #934a26;
  }

  .panel-list {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .list-title {
    font-size: 13px;
    color: #8f6441;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgb(255 255 255 / 0.62);
    border: 1px solid rgb(191 149 104 / 0.14);
  }

  .list-side {
    display: grid;
    justify-items: end;
    gap: 4px;
    text-align: right;
  }

  .meta {
    color: #8f6441;
    font-size: 12px;
  }

  .task-item {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: start;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgb(255 255 255 / 0.62);
    border: 1px solid rgb(191 149 104 / 0.14);
  }

  .task-running-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgb(244 248 255 / 0.96), rgb(230 237 250 / 0.9));
    border: 1px solid rgb(105 132 188 / 0.22);
    color: #425f9d;
    font-size: 13px;
    line-height: 1.4;
  }

  .task-running-dot {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: 999px;
    background: #6a84be;
    box-shadow: 0 0 0 4px rgb(106 132 190 / 0.14);
  }

  .task-stop-button {
    margin-left: auto;
    padding-inline: 14px;
    background: linear-gradient(180deg, #b15431, #8f3f22);
  }

  .task-item button {
    min-width: 84px;
  }

  .task-item button.loading {
    background: linear-gradient(180deg, #b15431, #8f3f22);
  }

  .task-run-modal-backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 28px;
    background: rgb(57 36 20 / 0.18);
    backdrop-filter: blur(8px);
  }

  .task-run-modal {
    width: min(880px, calc(100vw - 56px));
    max-height: calc(100vh - 56px);
    display: grid;
    gap: 14px;
    padding: 20px;
    overflow: auto;
    border-radius: 26px;
    background:
      radial-gradient(circle at top left, rgb(255 244 222 / 0.92), transparent 30%),
      linear-gradient(180deg, rgb(255 251 244 / 0.98), rgb(243 230 211 / 0.95));
    border: 1px solid rgb(177 131 84 / 0.2);
    box-shadow: 0 32px 80px rgb(67 41 19 / 0.26);
  }

  .task-run-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 16px;
  }

  .task-run-modal-header h3 {
    margin: 0;
    font-size: 24px;
    line-height: 1.1;
  }

  .task-run-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .task-run-output-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .task-run-output {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 14px;
    border-radius: 18px;
    background: rgb(255 255 255 / 0.62);
    border: 1px solid rgb(191 149 104 / 0.14);
  }

  .task-run-output-failed {
    background: linear-gradient(180deg, rgb(255 245 243 / 0.96), rgb(250 231 226 / 0.9));
    border-color: rgb(191 102 90 / 0.22);
  }

  .task-run-output pre {
    margin: 0;
    max-height: 340px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: #4a3527;
    font-size: 12px;
    line-height: 1.45;
    font-family: "SFMono-Regular", "SF Mono", "Menlo", "Consolas", monospace;
  }

  .task-cwd {
    margin-top: 4px;
    word-break: break-all;
  }

  .task-kind {
    margin-top: 4px;
    color: #6c5e46;
    font-weight: 600;
  }

  @media (max-width: 860px) {
    .control-panel {
      width: calc(100vw - 12px);
      min-height: calc(100vh - 12px);
      max-height: calc(100vh - 12px);
      padding: 16px;
      border-radius: 24px;
    }

    .dashboard-layout,
    .hero-strip,
    .status-row,
    .list-grid,
    .detail-grid,
    .task-run-meta,
    .task-run-output-grid {
      grid-template-columns: 1fr;
    }

    .panel-nav {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .nav-chip {
      text-align: center;
    }

    .panel-header {
      align-items: stretch;
      flex-direction: column;
    }

    .panel-header h2 {
      font-size: 26px;
    }
  }
</style>
