# Context — herdr-orchestrator

Single-context repo. One `CONTEXT.md` at the root; ADRs under `docs/adr/` when a decision is worth recording.

## What this is

Herdr is a terminal-native agent multiplexer: a background server owns real terminal processes, and coding agents run inside panes with detected state (`working`, `blocked`, `done`, `idle`, `unknown`). Herdr already gives us worktrees, agent spawning/prompting/waits, a CLI, and a plugin surface. This repo supplies the **orchestration layer** Herdr doesn't: a way to fan work out across child agents and coordinate them from one parent.

## Glossary

Use these terms. Don't drift to synonyms.

- **Orchestrator** — the agent running in the parent workspace. Decides the task list, spawns children, and coordinates. The brain.
- **Parent workspace** — the workspace the orchestrator runs in. Usually the repo root workspace.
- **Child** — one worktree workspace per task, each with its own agent running in the worktree's root pane. Does the work.
- **Squad** — the set of children the orchestrator spawned. Durable registry in `squad.json` (plugin state dir).
- **Spawn** — create a child (worktree + agent + initial task). The plugin's `spawn` action, or the raw CLI primitives.
- **Drive** — submit input to a child and/or wait on it (`agent prompt --wait`, `agent wait`).
- **Blocked** — Herdr recognized an approval/question UI; the child is waiting for input. Not a failure.
- **Done** — idle but not yet seen. Distinct from `idle` (seen, ready for input).
- **Worktree** — a Git checkout opened as its own workspace, with `worktree` provenance linking it to the parent repo.

## Plugin surface

- `herdr-plugin.toml` — `orchestrator` plugin. `spawn` action (bulk-create from `tasks.json`), `board` pane (live squad status).
- `src/` — plugin implementation (Bun). Calls Herdr through `HERDR_BIN_PATH` / the CLI.
- `skills/orchestrator/SKILL.md` — the orchestrating agent's playbook (the skill half of this project).
- `skills/delegate/SKILL.md` — the single-child delegation loop (brief, spawn, hand off, collect, close).

## Config and state

- **Config dir** (user-editable): `herdr plugin config-dir orchestrator` → `tasks.json` (the task list), optional `orchestrator.toml` (defaults like `parent_workspace_id`, `kind`).
- **State dir** (plugin-owned): `squad.json` — the authoritative child registry; live status is enriched from `herdr agent list` at read time.

## Rules of thumb

- One task per child; parallel work is the point.
- `spawn` is the bulk convenience; the raw CLI is for fine-grained control. Both share the same primitives.
- Never trust a stored id across a close — re-read current ids.
- The orchestrator answers blocked children, escalates to the human, or closes them. It doesn't silently let a squad sit stuck.
