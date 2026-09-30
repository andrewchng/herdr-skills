import { join } from "node:path";
import { mkdirSync } from "node:fs";

/**
 * The orchestrator's squad: one child per worktree, each with its own agent.
 *
 * `squad.json` lives under the plugin state directory and is the authoritative
 * registry of children the orchestrator spawned. Live agent status is enriched
 * from `herdr agent list` at read time; this file stores the durable mapping.
 */
export interface Child {
  task_id: string;
  branch: string;
  label: string;
  workspace_id: string;
  root_pane_id: string;
  agent: string;
  kind: string;
  task: string;
  status: string;
  created_at: string;
}

export interface Squad {
  parent_workspace_id?: string;
  parent_repo_key?: string;
  children: Child[];
}

/** One task the orchestrator wants a child to own. */
export interface TaskSpec {
  id?: string;
  branch?: string;
  label?: string;
  kind?: string;
  task: string;
}

export interface PluginDirs {
  /** User-editable config (tasks.json, orchestrator.toml). */
  config: string;
  /** Plugin-owned runtime state (squad.json). */
  state: string;
}

/** Resolve the plugin config and state directories from the injected env. */
export function pluginDirs(): PluginDirs {
  const root = process.env.HERDR_PLUGIN_ROOT ?? ".";
  const config = process.env.HERDR_PLUGIN_CONFIG_DIR ?? join(root, "config");
  const state = process.env.HERDR_PLUGIN_STATE_DIR ?? join(root, "state");
  return { config, state };
}

export async function loadSquad(stateDir: string): Promise<Squad> {
  const path = join(stateDir, "squad.json");
  try {
    const raw = await Bun.file(path).text();
    const parsed = JSON.parse(raw) as Squad;
    parsed.children ??= [];
    return parsed;
  } catch {
    return { children: [] };
  }
}

export async function saveSquad(
  stateDir: string,
  squad: Squad,
): Promise<void> {
  mkdirSync(stateDir, { recursive: true });
  await Bun.file(join(stateDir, "squad.json")).write(
    JSON.stringify(squad, null, 2),
  );
}

/** Load tasks.json from the config dir. Returns null when absent/invalid. */
export async function loadTasks(configDir: string): Promise<TaskSpec[] | null> {
  const path = join(configDir, "tasks.json");
  try {
    const raw = await Bun.file(path).text();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as TaskSpec[];
  } catch {
    return null;
  }
}

/**
 * Turn a task id into a valid live agent name.
 * Herdr requires names to match `[a-z][a-z0-9_-]{0,31}`.
 */
export function agentName(taskId: string, index: number): string {
  const slug = (taskId || `child-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const base = slug || `child-${index + 1}`;
  const named = /^[a-z]/.test(base) ? base : `c-${base}`;
  return named.slice(0, 32);
}
