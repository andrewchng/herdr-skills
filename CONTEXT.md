# Context — delegate

Single-context repo. One `CONTEXT.md` at the root; ADRs under `docs/adr/` only
if a decision is ever worth recording.

## What this is

A single agent skill for **delegation inside herdr**. The parent agent writes a
self-contained brief, spawns a subordinate `pi` agent in a sibling pane, hands
it the brief, waits for the turn to end, and reports the summary. Herdr supplies
the panes; this skill supplies the loop.

## Glossary

Use these terms. Don't drift to synonyms.

- **Parent agent** — the agent running the skill. Owns the conversation and the
  brief.
- **Sub-agent** — the subordinate `pi` instance in its own pane. Sees nothing of
  the parent's conversation.
- **Brief** — the sub-agent's entire interface: goal, solution sketch, repo
  conventions, one checkable completion criterion, and the reporting rule.
  Written to `$TMPDIR`, never inside the repo.
- **Handoff** — the single message that points the sub-agent at the brief; it
  doubles as the keypress that dismisses pi's welcome screen.
- **Completion criterion** — the exact verify command that must pass before the
  sub-agent reports done.
- **Blocked** — the sub-agent asked a question; the parent answers it or
  escalates to the human.
- **Session file** — pi's `.jsonl` transcript for the sub-agent, exposed by
  `herdr pane get` as `agent_session.value`. Small panes collapse pi's
  transcript, so the summary is read from here, not the pane.

## Layout

- `skills/delegate/SKILL.md` — the delegation playbook.
