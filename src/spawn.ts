import { join } from "node:path";
import { Herdr } from "./client/herdr.ts";
import {
  agentName,
  loadSquad,
  loadTasks,
  pluginDirs,
  saveSquad,
  type Child,
} from "./squad.ts";

interface WorktreeCreateResult {
  result?: {
    workspace?: { workspace_id?: string };
    tab?: { tab_id?: string };
    root_pane?: { pane_id?: string };
    worktree?: { path?: string; checkout_path?: string };
  };
}

interface ContextJson {
  workspace_id?: string;
  workspace?: { workspace_id?: string };
}

/** Resolve the repo_key of a workspace so we can scope children to its repo. */
async function parentRepoKey(herdr: Herdr, workspaceId: string) {
  const list = await herdr.json<any>(["worktree", "list", "--workspace", workspaceId]);
  return list?.result?.source?.repo_key;
}

/** Read the invocation context (workspace/tab/pane) Herdr injects. */
function invocationContext(): ContextJson {
  const raw = process.env.HERDR_PLUGIN_CONTEXT_JSON;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ContextJson;
  } catch {
    return {};
  }
}

async function main(): Promise<number> {
  const herdr = new Herdr();
  const { config, state } = pluginDirs();

  const context = invocationContext();
  const contextWorkspace = context.workspace_id ?? context.workspace?.workspace_id;

  const squad = await loadSquad(state);
  const parentWorkspace = contextWorkspace ?? squad.parent_workspace_id;
  if (!parentWorkspace) {
    console.error(
      `Orchestrator: no parent workspace. Run spawn from the orchestrator ` +
        `workspace, or write orchestrator.toml with parent_workspace_id.`,
    );
    return 1;
  }

  const tasks = await loadTasks(config);
  if (!tasks) {
    console.error(
      `Orchestrator: no tasks found. Write tasks.json to ${join(config, "tasks.json")} ` +
        `as an array of { task, id?, branch?, label?, kind? }, then retry.`,
    );
    return 1;
  }

  squad.parent_workspace_id = parentWorkspace;
  squad.parent_repo_key = (await parentRepoKey(herdr, parentWorkspace)) ?? squad.parent_repo_key;
  squad.children ??= [];

  const spawned: Child[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const spec = tasks[i];
    const taskId = spec.id ?? `child-${i + 1}`;
    const branch = spec.branch ?? `orchestrator/${taskId}`;
    const label = spec.label ?? taskId;
    const kind = spec.kind ?? "pi";
    const name = agentName(taskId, i);

    // 1. Create a worktree workspace for this task.
    const create = await herdr.json<WorktreeCreateResult>([
      "worktree", "create",
      "--workspace", parentWorkspace,
      "--branch", branch,
      "--label", label,
      "--no-focus",
    ]);
    const workspaceId = create?.result?.workspace?.workspace_id;
    const rootPane = create?.result?.root_pane?.pane_id;
    if (!workspaceId || !rootPane) {
      console.error(`Orchestrator: worktree create for ${taskId} returned no workspace/pane.`);
      continue;
    }

    // 2. Start the child agent in the worktree's root pane.
    await herdr.run(["agent", "start", name, "--kind", kind, "--pane", rootPane]);

    // 3. Submit the task. No --wait: the child runs on its own; the parent
    //    monitors it later with `agent wait` / `agent list`.
    await herdr.run(["agent", "prompt", name, spec.task]);

    const child: Child = {
      task_id: taskId,
      branch,
      label,
      workspace_id: workspaceId,
      root_pane_id: rootPane,
      agent: name,
      kind,
      task: spec.task,
      status: "working",
      created_at: new Date().toISOString(),
    };
    squad.children.push(child);
    spawned.push(child);
  }

  await saveSquad(state, squad);

  console.log(
    JSON.stringify(
      {
        ok: true,
        parent_workspace_id: parentWorkspace,
        spawned: spawned.map((c) => ({
          task_id: c.task_id,
          workspace_id: c.workspace_id,
          root_pane_id: c.root_pane_id,
          agent: c.agent,
          branch: c.branch,
        })),
      },
      null,
      2,
    ),
  );
  return 0;
}

if (import.meta.main) {
  main()
    .then((code) => {
      if (code !== 0) process.exit(code);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
