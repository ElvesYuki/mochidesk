export interface TaskDefinition {
  id: string;
  label: string;
  commandPreview: string;
  cwd: string;
  kind: "check" | "service";
}

export interface TaskRun {
  runId: string;
  taskId: string;
  label: string;
  kind: "check" | "service";
  status: "running" | "ready" | "success" | "failed" | "stopped";
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface TaskStreamSnapshot {
  runs: TaskRun[];
}
