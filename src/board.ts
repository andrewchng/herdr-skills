import { Herdr } from "./client/herdr.ts";
import { loadSquad, pluginDirs, type Child } from "./squad.ts";

interface AgentListResult {
  result?: {
    agents?: Array<{
      pane_id?: string;
      agent_status?: string;
      agent?: string;
      terminal_title_stripped?: string;
    }>;
  };
}

interface ChildRow {
  child: Child;
  status: string;
  title: string;
}

async function buildRows(
  herdr: Herdr,
  stateDir: string,
): Promise<ChildRow[]> {
  const squad = await loadSquad(stateDir);
  const agents = await herdr.json<AgentListResult>(["agent", "list"]);

  const byPane = new Map<string, { status: string; title: string }>();
  for (const a of agents?.result?.agents ?? []) {
    if (!a.pane_id) continue;
    byPane.set(a.pane_id, {
      status: a.agent_status ?? "unknown",
      title: a.terminal_title_stripped ?? a.agent ?? "",
    });
  }

  const rows: ChildRow[] = [];
  for (const child of squad.children) {
    const live = byPane.get(child.root_pane_id);
    rows.push({
      child,
      status: live?.status ?? child.status ?? "unknown",
      title: live?.title ?? "",
    });
  }
  return rows;
}

async function readPreview(herdr: Herdr, paneId: string): Promise<string> {
  try {
    const out = await herdr.run([
      "pane", "read", paneId,
      "--source", "recent-unwrapped", "--lines", "3",
    ]);
    const trimmed = out.trim().split("\n").slice(-3).join(" ");
    return trimmed.slice(0, 120);
  } catch {
    return "";
  }
}

function render(rows: ChildRow[], previews: Map<string, string>): string {
  const lines: string[] = [];
  lines.push("Orchestrator squad — refresh every 5s · Ctrl+C to close");
  lines.push("");
  if (rows.length === 0) {
    lines.push("  (no children yet. Spawn a squad from the orchestrator workspace.)");
  }
  for (const { child, status, title } of rows) {
    lines.push(`  ${child.task_id.padEnd(16)} ${status.padEnd(9)} ${child.branch}`);
    if (title) lines.push(`    ${title}`);
    const preview = previews.get(child.root_pane_id);
    if (preview) lines.push(`    ${preview}`);
  }
  lines.push("");
  lines.push("Children are worktree workspaces with their own agent. The parent");
  lines.push("sees them here and drives them via agent prompt --wait / agent wait.");
  return "\x1b[2J\x1b[H" + lines.join("\n") + "\n";
}

async function main(): Promise<number> {
  const herdr = new Herdr();
  const { state } = pluginDirs();

  let rows: ChildRow[] = [];
  let previews = new Map<string, string>();

  while (true) {
    rows = await buildRows(herdr, state);

    // Read short output previews only for children that need attention.
    previews = new Map<string, string>();
    for (const { child, status } of rows) {
      if (status === "blocked" || status === "done") {
        const preview = await readPreview(herdr, child.root_pane_id);
        if (preview) previews.set(child.root_pane_id, preview);
      }
    }

    process.stdout.write(render(rows, previews));
    await Bun.sleep(5000);
  }
}

process.on("SIGINT", () => process.exit(0));

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
