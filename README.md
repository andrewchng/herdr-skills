# delegate

A single agent skill: hand one self-contained coding task to a subordinate `pi`
agent running in a new [herdr](https://herdr.dev) pane, wait for it to finish,
and report its summary back.

The playbook lives at [`skills/delegate/SKILL.md`](skills/delegate/SKILL.md).

## Why

A task can be handed off end to end: write a self-contained brief, spawn a
subordinate agent on a (usually local) model in a sibling pane, hand it the
brief, poll until it settles, then read its summary from the session file and
close the pane. The sub-agent sees nothing of the parent's conversation, so the
brief is its entire interface.

## Requirements

- Running inside herdr (`HERDR_ENV=1`).
- `herdr` on `PATH` (0.9.x).
- `pi` available, with whatever models the brief names — see
  `~/.pi/agent/models.json`.

## Install

The skill is a plain directory; point your agent's skills directory at it:

```bash
npx skills add ./skills/delegate

# or symlink it yourself:
ln -s "$PWD/skills/delegate" ~/.pi/agent/skills/delegate
```

## The loop

**brief → spawn → hand off → close.** Full detail is in the skill: the exact
`herdr pane` commands, how to detect the handoff took, the blocked-pane path,
and where the summary lives (`agent_session.value`).

## Layout

```
skills/delegate/SKILL.md   the delegation playbook
```
