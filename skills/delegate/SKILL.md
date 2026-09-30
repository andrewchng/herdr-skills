---
name: delegate
description: Hand a self-contained coding task to a subordinate agent in a new herdr pane, wait for it to finish, and report its summary. Defaults to a locally-hosted pi agent; the harness and model are set in one editable Defaults block. Use when the user says "delegate", "spawn an agent for this", "have another agent/pane take this", or otherwise wants a task built by a subordinate agent.
---

# Delegate — subordinate agent in a herdr pane

Requires running inside herdr (`HERDR_ENV=1`); otherwise say so and stop. Raw pane commands and ids live in the herdr skill — this file is only the delegation loop.

The loop: **brief → spawn → collect → close**. It is harness-agnostic: the harness appears only in the Defaults block and the launch line, plus how you read the transcript.

## Defaults

Edit these to retarget the skill; the rest of it uses them. `pi` on a local model is the default — free, offline, fast.

```bash
AGENT=pi
AGENT_MODEL=local-ds4/deepseek-v4-flash
```

`$AGENT_MODEL` is the model the sub-agent runs on (pi resolves local providers from `~/.pi/agent/models.json`). Use whatever model the user names. For another harness or model, change the two values and the launch line in [Spawn](#2-spawn) — see [Other harnesses](#other-harnesses).

## 1. Write the brief

The brief is the sub-agent's entire interface — it sees nothing of this conversation. Write it to `$TMPDIR/delegate-<task>.md`, never inside the repo. It becomes the sub-agent's first prompt, so it must be self-contained:

- goal plus a solution sketch: files to touch, the shape of the change
- repo conventions the environment doesn't already confess (test runner, lint/format commands)
- one checkable completion criterion: the exact verify command that must pass
- the reporting rule: do not commit; summarize what changed when done

## 2. Spawn

Find your own pane in `herdr pane list` — the one with `"focused": true` — split off it without stealing focus, and parse the new pane id. Then launch the sub-agent with the brief as its initial prompt:

```bash
NEW_PANE=$(herdr pane split <your-pane-id> --direction right --no-focus \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "$AGENT --model $AGENT_MODEL --name '<task>' @<absolute brief path>"
```

The launch line is the one harness-specific part in this step: `--model`, `--name`, and `@file` are pi's spelling. pi expands the `@file` into the session's first prompt and submits it via `session.prompt` before the TUI loop runs — so there is no welcome screen to dismiss and no second keystroke to send; don't launch bare and type the brief in afterward. For another CLI, swap the flags and the initial-prompt argument for its own (see [Other harnesses](#other-harnesses)). If the launch fails, `herdr pane read "$NEW_PANE"` shows the error.

## 3. Close the loop

There is no `wait agent-status` in herdr 0.9.x — poll the pane's `agent_status` until the turn ends:

```bash
while true; do
  STATUS=$(herdr pane get "$NEW_PANE" | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["agent_status"])')
  [ "$STATUS" != "working" ] && break
  sleep 15
done
```

- **done / idle** — the sub-agent finished. Small panes collapse the transcript, so read the summary from the session file, not the pane: `herdr pane get` carries `agent_session.value` (a path to the harness's transcript) — tail it and print the last thing the agent said. Then close the pane — the summary now lives in the session file, so the pane has nothing left to show:

```bash
herdr pane close "$NEW_PANE"
```

Grab `agent_session.value` before closing; after the pane is gone the session is still on disk but no longer discoverable via herdr. If the user may want to watch the sub-agent work, keep the pane until they've seen the summary — closing is the default, not a rule.
- **blocked** — the sub-agent asked something: its last message is a question in the session tail. Get the answer from the user, `herdr pane run` it back, poll again.
- **still working after ~10 min** — tail the session file, report progress from the last message, poll again.

## Other harnesses

Only two things change; the loop above is unchanged.

**Launch.** Give the harness its own initial-prompt form. Examples — flags drift, so confirm with `<cli> --help`:

| Harness | launch with the brief as the first prompt |
| --- | --- |
| `pi` (default) | `pi --model M @brief.md` (file include) |
| `claude` | `claude --model M "<brief>"` |
| `codex` | `codex -m M "<brief>"` |
| `copilot` | `copilot --model M -i "<brief>"` |
| `opencode` | `opencode -m M --prompt "<brief>"` |

Where the harness has no file include, pass the brief inline or as a one-line pointer to its path (`Read /abs/brief.md — your full task brief. Carry it out exactly. Do not commit; report a summary when done.`). Herdr also knows how to launch supported kinds itself: `herdr agent start <name> --kind <kind> --pane <pane>`, then `herdr agent prompt <name> "<brief or pointer>"`.

**Transcript.** `agent_status` and `agent_session` are supplied by herdr, so readiness and discovery are harness-neutral; only the parse differs. pi writes `.jsonl` records with `role`/`content` — for another harness, tail whatever `agent_session.value` points at and take the last message.
