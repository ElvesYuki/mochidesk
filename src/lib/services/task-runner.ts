import { invoke } from "@tauri-apps/api/core";
import type { TaskDefinition, TaskRun, TaskStreamSnapshot } from "$lib/models/task-runner";
import { isTauriRuntime } from "$lib/services/pet-window";

export interface TaskRunnerController {
  listTasks: () => Promise<TaskDefinition[]>;
  runTask: (taskId: string) => Promise<TaskRun>;
  getRuns: () => Promise<TaskRun[]>;
  stopTask: (runId: string) => Promise<TaskRun>;
  getTaskSnapshot: () => Promise<TaskStreamSnapshot>;
}

export function createTaskRunnerController(): TaskRunnerController {
  if (!isTauriRuntime()) {
    return {
      async listTasks() {
        return [];
      },
      async runTask(taskId) {
        return {
          runId: `preview-${taskId}`,
          taskId,
          label: taskId,
          kind: taskId.includes("dev") ? "service" : "check",
          status: taskId.includes("dev") ? "ready" : "success",
          startedAt: Date.now(),
          finishedAt: Date.now(),
          exitCode: 0,
          stdout: "Task runner is only available in the Tauri desktop runtime.",
          stderr: "",
        };
      },
      async getRuns() {
        return [];
      },
      async stopTask(runId) {
        return {
          runId,
          taskId: runId,
          label: runId,
          kind: "check",
          status: "stopped",
          startedAt: Date.now(),
          finishedAt: Date.now(),
          exitCode: null,
          stdout: "",
          stderr: "Task runner is only available in the Tauri desktop runtime.",
        };
      },
      async getTaskSnapshot() {
        return { runs: [] };
      },
    };
  }

  return {
    listTasks() {
      return invoke<TaskDefinition[]>("list_available_tasks");
    },
    runTask(taskId) {
      return invoke<TaskRun>("run_task", { taskId });
    },
    getRuns() {
      return invoke<TaskRun[]>("get_task_runs");
    },
    stopTask(runId) {
      return invoke<TaskRun>("stop_task_run", { runId });
    },
    getTaskSnapshot() {
      return invoke<TaskStreamSnapshot>("get_task_snapshot");
    },
  };
}
