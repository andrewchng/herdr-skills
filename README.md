# herdr-orchestrator

Orchestrate a squad of child agents from one parent workspace, on top of
[Herdr](https://herdr.dev). The parent agent (the **orchestrator**) fans work
out across **children** — one Git worktree workspace per task, each with its
own agent — then watches, drives, and collects them from a single pane.

This repo holds the skills and plugin for driving herdr:

- **Skill** — `skills/orchestrator/SKILL.md`. The orchestrating agent's
  playbook: plan a task list, spawn children, wait on them, answer blocked
  ones, collect, and tear the squad down.
- **Skill** — `skills/delegate/SKILL.md`. Hand one self-contained task to a
  single subordinate agent in a new pane, poll it to idle, and collect its
  summary. The one-child case of the orchestration loop.
- **Plugin** — `herdr-plugin.toml` + `src/`. The bulk parts as one call:
  a `spawn` action (create worktrees + agents from `tasks.json`) and a `board`
  pane (live squad status).

## Why

Herdr already gives you worktrees, agent spawning, prompting, waits, and a
CLI — but no higher-level orchestration. This repo is that layer: the
judgment lives in the orchestrating agent (the skill), and the deterministic
automation lives in the plugin.

## Setup

```bash
# author locally
herdr plugin link /path/to/herdr-orchestrator
# or share from GitHub
herdr plugin install andrewchng/herdr-orchestrator

# install the skills into your agent (skills CLI)
npx skills add ./skills/orchestrator
npx skills add ./skills/delegate
```

Requires Bun (`bun install`), and Herdr with the plugin surface enabled.

## Quick start

```bash
CONFIG_DIR=$(herdr plugin config-dir orchestrator)
cat > "$CONFIG_DIR/tasks.json" <<'EOF'
[
  { "id": "auth",    "task": "Implement the auth middleware." },
  { "id": "logging", "task": "Add structured request logging." }
]
EOF
herdr plugin action invoke orchestrator.spawn
herdr plugin pane open --plugin orchestrator --entrypoint board
```

The orchestrating agent then coordinates via `herdr agent wait`,
`herdr agent prompt --wait`, and `herdr pane read`. Full playbook:
`skills/orchestrator/SKILL.md`. Domain vocabulary: `CONTEXT.md`.

## Layout

```
herdr-plugin.toml        plugin manifest (spawn action + board pane)
src/
  client/herdr.ts        thin herdr CLI wrapper (HERDR_BIN_PATH)
  squad.ts               squad/squad.json state model
  spawn.ts               spawn action
  board.ts               live board pane
skills/orchestrator/
  SKILL.md               orchestrating agent playbook
skills/delegate/
  SKILL.md               single-child delegation loop
CONTEXT.md               domain glossary
```
