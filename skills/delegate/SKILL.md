---
name: delegate
description: Hand a self-contained coding task to a subordinate pi agent running on a local model in a new herdr pane, wait for it to finish, and report its summary. Use when the user says "delegate", "spawn an agent for this", "have another agent/pane take this", or otherwise wants a task built by a subordinate pi instance.
---

# Delegate — subordinate pi agent in a herdr pane

Requires running inside herdr (`HERDR_ENV=1`); otherwise say so and stop. Raw pane commands and ids live in the herdr skill — this file is only the delegation loop.

The loop: **brief → spawn → collect → close**.

## 1. Write the brief

The brief is the sub-agent's entire interface — it sees nothing of this conversation. Write it to `$TMPDIR/delegate-<task>.md`, never inside the repo. It becomes the sub-agent's first prompt (passed via `@file`), so it must be self-contained:

- goal plus a solution sketch: files to touch, the shape of the change
- repo conventions the environment doesn't already confess (test runner, lint/format commands)
- one checkable completion criterion: the exact verify command that must pass
- the reporting rule: do not commit; summarize what changed when done

## 2. Spawn

Local models by default: `local-ds4/deepseek-v4-flash` (other local providers in `~/.pi/agent/models.json`); use whatever model the user names. Find your own pane in `herdr pane list` — the one with `"focused": true` — split off it without stealing focus, and parse the new pane id. Pass the brief as pi's initial prompt with `@<absolute brief path>`:

```bash
NEW_PANE=$(herdr pane split <your-pane-id> --direction right --no-focus \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "pi --model local-ds4/deepseek-v4-flash --name '<task>' @<absolute brief path>"
```

pi expands the `@file` into the session's first prompt and submits it via `session.prompt` before the TUI loop runs — so there is no welcome screen to dismiss and no second keystroke to send. Don't launch bare `pi` and type the brief in afterward. If the path is wrong, pi prints `Error: File not found` and exits; `herdr pane read "$NEW_PANE"` shows it.

## 3. Close the loop

There is no `wait agent-status` in herdr 0.9.x — poll the pane's `agent_status` until the turn ends:

```bash
while true; do
  STATUS=$(herdr pane get "$NEW_PANE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["agent_status"])')
  [ "$STATUS" != "working" ] && break
  sleep 15
done
```

- **done / idle** — the sub-agent finished. Small panes collapse pi's transcript, so read the summary from the session file, not the pane: `herdr pane get` carries `agent_session.value` (a `.jsonl` path) — tail it and print the last assistant message with text. Then close the pane — the summary now lives in the session file, so the pane has nothing left to show:

```bash
herdr pane close "$NEW_PANE"
```

Grab `agent_session.value` before closing; after the pane is gone the session is still on disk but no longer discoverable via herdr. If the user may want to watch the sub-agent work, keep the pane until they've seen the summary — closing is the default, not a rule.
- **blocked** — the sub-agent asked something: its last message is a question in the session tail. Get the answer from the user, `herdr pane run` it back, poll again.
- **still working after ~10 min** — tail the session file, report progress from the last assistant message, poll again.
