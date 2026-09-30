---
name: delegate
description: Hand a self-contained coding task to a subordinate pi agent running on a local model in a new herdr pane, wait for it to finish, and report its summary. Use when the user says "delegate", "spawn an agent for this", "have another agent/pane take this", or otherwise wants a task built by a subordinate pi instance.
---

# Delegate — subordinate pi agent in a herdr pane

Requires running inside herdr (`HERDR_ENV=1`); otherwise say so and stop. Raw pane commands and ids live in the herdr skill — this file is only the delegation loop.

The loop: **brief → spawn → hand off → close**.

## 1. Write the brief

The brief is the sub-agent's entire interface — it sees nothing of this conversation. Write it to `$TMPDIR/delegate-<task>.md`, never inside the repo:

- goal plus a solution sketch: files to touch, the shape of the change
- repo conventions the environment doesn't already confess (test runner, lint/format commands)
- one checkable completion criterion: the exact verify command that must pass
- the reporting rule: do not commit; summarize what changed when done

## 2. Spawn

Local models by default: `local-ds4/deepseek-v4-flash` (other local providers in `~/.pi/agent/models.json`); use whatever model the user names. Find your own pane in `herdr pane list` — the one with `"focused": true` — split off it without stealing focus, and parse the new pane id:

```bash
NEW_PANE=$(herdr pane split <your-pane-id> --direction right --no-focus \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "pi --model local-ds4/deepseek-v4-flash --name '<task>'"
```

## 3. Hand off

Wait for pi's welcome screen, then send the pointer — the handoff keystrokes double as the keypress that dismisses the welcome and lands in the prompt:

```bash
herdr pane wait-output "$NEW_PANE" --match "Press any key" --timeout 30000 || true
herdr pane run "$NEW_PANE" "Read <absolute brief path> — it is your full task brief. Carry it out exactly. <verify command> must pass before you finish. Do not commit. Report a summary of what changed when done."
```

Verify the handoff took: `herdr pane read` and look for the `↳ Read` echo of the brief path. If the prompt is still empty, resend.

## 4. Close the loop

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
