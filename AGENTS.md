## Agent skill

This repo holds one skill: **delegate**, at `skills/delegate/SKILL.md`. It hands
a self-contained task to a subordinate `pi` agent in a new herdr pane, waits for
it to finish, and reports the summary. See `CONTEXT.md` for the vocabulary
(parent agent / sub-agent / brief / handoff).

To use it, make it discoverable to your agent — symlink or copy
`skills/delegate` into your skills directory. Editing the skill here updates the
linked copy in place.
