---
name: orchestrator
description: "Run a parent workspace as an orchestrator: spawn child Git worktree agents, watch their state, drive them when they block, collect results, and tear the squad down. Use when the user wants to fan out a task across multiple agents, run parallel worktree agents, or coordinate a squad from one pane."
---

# orchestrator — agent skill

before using this skill, check that `HERDR_ENV=1`. if it is not set to `1`, say you are not running inside a herdr-managed pane and stop.

this skill turns **your workspace into the orchestrator**. you spawn child agents, each in its own Git worktree, and you see and drive all of them from this one pane. herdr gives you the substrate — worktrees, agents, waits, reads — and this skill gives you the playbook for coordinating a squad.

the `orchestrator` plugin makes the bulk parts one call: a `spawn` action (create worktrees + agents from `tasks.json`) and a `board` pane (live squad status). everything else is plain `herdr` CLI, which you can run directly for fine-grained control.

## roles

- **orchestrator (you)** — the parent workspace agent. you decide the task list, spawn children, and coordinate. you live in the parent workspace.
- **child** — one worktree workspace per task, each with its own agent running in the worktree's root pane. children do the work; you supervise.
- **squad** — the set of children you spawned. the plugin records it in `squad.json` under the plugin state dir, so the board and `spawn` can scope to it.

the sidebar already shows every agent across every workspace — `working`, `blocked`, `done`, `idle`. the orchestrator's job is deciding what each child should do and responding when one stops.

## ids

workspace ids look like `w4P`, pane ids like `w4P:p1`, tab ids like `w4P:t1`. these are compact public ids for the current live session. **ids can compact when workspaces, tabs, or panes close.** never trust a stored id across a close — re-read ids from `workspace list`, `tab list`, `pane list`, `worktree list`, or create/split responses when you need a current id. agent names (not ids) are stable while the agent lives.

## discover

see your workspace and its repo:

```bash
herdr workspace list
herdr worktree list --workspace w4P
```

see the whole herd — every agent, its pane, workspace, and state:

```bash
herdr agent list
```

see the squad the plugin already knows about (durable registry):

```bash
herdr plugin action invoke orchestrator.spawn   # (see spawn below)
```

open the live squad board as a pane:

```bash
herdr plugin pane open --plugin orchestrator --entrypoint board
```

## plan

write a task list as JSON in the plugin config dir. get the dir first:

```bash
CONFIG_DIR=$(herdr plugin config-dir orchestrator)
```

```bash
cat > "$CONFIG_DIR/tasks.json" <<'EOF'
[
  { "id": "auth",    "task": "Implement the auth middleware. Write tests. Keep it focused.", "kind": "pi" },
  { "id": "logging", "task": "Add structured request logging. Wire the middleware.", "kind": "pi" },
  { "id": "schema",  "task": "Design the DB schema for the new feature. Open a PR.", "kind": "pi" }
]
EOF
```

each entry supports `id`, `branch` (default `orchestrator/<id>`), `label` (default `<id>`), `kind` (default `pi`), and `task`. ids become agent names and branch names, so keep them short, lowercase, and unique. one task per child — parallel work is the point.

## spawn

bulk-create the squad (worktree + agent + initial task per entry):

```bash
herdr plugin action invoke orchestrator.spawn
```

that runs, for each task: `worktree create --workspace <parent> --branch <branch> --label <label>`, `agent start <name> --kind <kind> --pane <root_pane>`, then `agent prompt <name> "<task>"`. the action's JSON (each child's `workspace_id`, `root_pane_id`, `agent`, `branch`) lands in the plugin log, not back in your terminal: read it with `herdr plugin log list --plugin orchestrator --limit 5`. the authoritative view is herdr itself:

```bash
herdr agent list
herdr worktree list --workspace w4P
```

for fine-grained control (different agent per task, custom branch, staged prompts), run the primitives yourself per task:

```bash
# 1. create the child worktree workspace
herdr worktree create --workspace w4P --branch orchestrator/auth --label auth --no-focus
# -> result.workspace.workspace_id, result.root_pane.pane_id

# 2. start the child agent in its root pane (the pane must be at a shell prompt)
herdr agent start auth --kind pi --pane w1M:p3

# 3. give it its task
herdr agent prompt auth "Implement the auth middleware."
```

## drive

watch the squad:

```bash
herdr agent list
```

wait for one child to reach a settled state (returns immediately if already there):

```bash
herdr agent wait auth --until blocked --timeout 600000
herdr agent wait auth --until done --timeout 600000
```

submit input to a child **and wait** in one request — this avoids the race between submitting and starting a wait:

```bash
herdr agent prompt auth "Add a test for the token expiry path." --wait --until blocked --timeout 600000
```

read a child's recent output (unwrapped is best for logs):

```bash
herdr pane read w1M:p3 --source recent-unwrapped --lines 60
```

read the focused child's screen for UI feedback:

```bash
herdr agent read auth --source visible --lines 40
```

## handle a blocked child

`blocked` means herdr recognized an approval or question UI — the child is **waiting for input from you or a human**, not that its work failed. when a child is blocked:

1. read what it's asking for: `herdr pane read <pane> --source recent-unwrapped --lines 60`
2. decide:
   - **answer it** — `herdr agent prompt <child> "<answer>" --wait --until blocked` (submit + wait in one)
   - **escalate to the human** — `herdr notification show "<child> blocked: <branch>" --body "<what it needs>" --sound request`
   - **close it** — `herdr pane close <pane>` then `herdr worktree remove --workspace <child>`
3. if a child is `done`, it finished but you haven't looked yet — read it, then mark seen with `herdr agent focus <child>` or just read.

## collect

when a child reaches `done`, read its output, then fold the result into the squad's `squad.json` (`result` field) or your notes. merge PRs with `gh` in the repo. keep the parent's summary as the single source of truth for what the squad produced.

## teardown

close a child's worktree workspace. `worktree remove` deletes the checkout but never the branch:

```bash
herdr worktree remove --workspace w1M
herdr workspace close w1M
```

closing a primary workspace while linked-worktree workspaces are open requires the group flag:

```bash
herdr workspace close w4P --group
```

## recipes

### fan out a task list and wait for everyone

```bash
CONFIG_DIR=$(herdr plugin config-dir orchestrator)
# write tasks.json (see plan)
herdr plugin action invoke orchestrator.spawn
herdr plugin pane open --plugin orchestrator --entrypoint board   # watch live
# later, wait on each child
herdr agent wait auth --until done --timeout 3600000
herdr agent wait logging --until done --timeout 3600000
```

### drive one child to completion

```bash
herdr agent prompt auth "Do the auth middleware now." --wait --until blocked --timeout 600000
# while it works, poll
herdr agent wait auth --until blocked --timeout 600000
herdr pane read w1M:p3 --source recent-unwrapped --lines 60
# answer what it needs
herdr agent prompt auth "Yes, proceed." --wait --until blocked
```

### check what every child is doing

```bash
herdr agent list
herdr pane read w1M:p3 --source recent-unwrapped --lines 40
herdr pane read w2W:p2 --source recent-unwrapped --lines 40
```

## notes

- `spawn` and `board` need the `orchestrator` plugin **linked and enabled**. `herdr plugin link <repo>` to author locally; `herdr plugin install andrewchng/herdr-orchestrator` to share.
- `done` and `idle` both mean ready for input. `done` is idle but not yet seen; reads do not mark seen, `agent focus` does. `blocked` means an approval/question UI. `unknown` means herdr can't classify confidently — not that work succeeded.
- `agent start` requires the pane's interactive shell to own the foreground, with no foreground command running. a fresh worktree root pane qualifies. names must match `[a-z][a-z0-9_-]{0,31}`.
- `agent prompt --wait` waits for the first settled state after submission, and returns `agent_blocked` without sending input if the child is already blocked. a non-working prompt that shows no activity within 5s returns `agent_prompt_stalled`.
- `worktree create` with an existing local branch checks it out; otherwise it creates the branch from `--base` or `HEAD`. `worktree remove` never deletes the branch and needs `--force` for dirty checkouts.
- the plugin records spawned children in `squad.json` under its state dir; live status comes from `herdr agent list` at read time. children created outside `spawn` won't appear on the board.
