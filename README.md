# herdr-skills

Agent skills for multi-agent work on top of [herdr](https://herdr.dev): drive
the `herdr` CLI to spawn, brief, and collect subordinate agents.

Each skill is a directory under `skills/<name>/` with its own `SKILL.md`.

## Skills

| Skill | What it does |
| --- | --- |
| [`delegate`](skills/delegate/SKILL.md) | Hand one self-contained task to a subordinate agent (a locally-hosted `pi` by default) in a new herdr pane, wait for it to finish, and report its summary. The harness and model sit in one editable Defaults block. |

## Requirements

- Running inside herdr (`HERDR_ENV=1`).
- `herdr` on `PATH` (0.9.x).
- An agent CLI for the harness you name (default: `pi`) — for `pi`, whatever
  models a skill names, from `~/.pi/agent/models.json`.

## Install

Install a skill from GitHub with the [skills CLI](https://skills.sh):

```bash
# one skill, installed globally
npx skills add andrewchng/herdr-skills --skill delegate -g -y

# or every skill in this repo
npx skills add andrewchng/herdr-skills --all
```

Or install from a local checkout:

```bash
npx skills add ./skills/delegate

# manual symlink equivalent:
ln -s "$PWD/skills/delegate" ~/.pi/agent/skills/delegate
```

Repeat per skill. Editing a skill in a local checkout updates the linked copy in
place.

## Layout

```
skills/
  delegate/SKILL.md   hand one task to a subordinate agent
```

New skills go under `skills/<name>/SKILL.md`.
