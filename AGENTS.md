## Agent skills

### Orchestrator

This repo is the orchestration layer for Herdr. The orchestrating agent's playbook lives at `skills/orchestrator/SKILL.md`; the single-child delegation loop lives at `skills/delegate/SKILL.md`. The `orchestrator` plugin (`herdr-plugin.toml`) provides the `spawn` action and `board` pane. See `CONTEXT.md` for the vocabulary (orchestrator / parent workspace / child / squad).

### Issue tracker

Issues and specs live as GitHub issues, driven through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map 1:1 to label strings `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
