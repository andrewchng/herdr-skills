## Agent skills

This repo holds agent skills that drive the `herdr` CLI for multi-agent work.
One directory per skill under `skills/<name>/`, each with a `SKILL.md`. See
`CONTEXT.md` for the shared vocabulary.

To use a skill, make it discoverable to your agent — symlink or copy
`skills/<name>` into your skills directory. Editing the skill here updates the
linked copy in place.

Current skills:

- `skills/delegate` — hand one self-contained task to a subordinate `pi` agent,
  wait for it, and report the summary.
