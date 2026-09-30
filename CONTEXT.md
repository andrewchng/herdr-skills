# Context — herdr-skills

Single-context repo. One `CONTEXT.md` at the root; ADRs under `docs/adr/` only
if a decision is ever worth recording.

## What this is

A collection of agent skills that drive the `herdr` CLI for **multi-agent
work**: spawning, briefing, and collecting subordinate agents from one parent
pane. Herdr supplies the substrate (panes, agents, worktrees, waits, reads);
these skills supply the playbooks. Each skill lives in `skills/<name>/`.

First skill: **delegate** — one parent hands one self-contained task to a
subordinate `pi` agent, waits for it, and reports the summary.

## Glossary

Terms used across the skills. Add to this list as skills are added; keep every
term to something the repo actually uses.

- **Parent agent** — the agent driving a skill. Owns the conversation.
- **Sub-agent** — a subordinate agent instance in its own pane. Sees nothing of
  the parent's conversation.
- **Brief** — a sub-agent's entire interface: goal, solution sketch, repo
  conventions, one checkable completion criterion, and the reporting rule.
  Written to `$TMPDIR`, never inside the repo.
- **Handoff** — the single message that points a sub-agent at its brief.
- **Completion criterion** — the exact verify command that must pass before a
  sub-agent reports done.
- **Blocked** — a sub-agent asked a question; the parent answers it or escalates
  to the human.
- **Session file** — pi's `.jsonl` transcript for a sub-agent, exposed by
  `herdr pane get` as `agent_session.value`. Small panes collapse pi's
  transcript, so summaries are read from here, not the pane.

## Layout

- `skills/delegate/SKILL.md` — the delegation playbook.
- `skills/<name>/SKILL.md` — one directory per skill.
