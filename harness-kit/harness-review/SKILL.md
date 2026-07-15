---
name: harness-review
description: Review the rendered AGENTS.md and per-agent files for completeness, correctness, portability, and convention adherence. Use after harness-render-agents-md produces files. Default verdict is request-changes when any blocker or critical issue is found. Read-only; never modifies files in place.
---

## When

Activate after `<repo-root>/.harness-kit/render.json` exists with
`status: OK` and the user asks "review the harness", "is this harness
any good", or similar.

## Inputs

- `<repo-root>/.harness-kit/render.json` (required)

## Steps

1. **Validate envelope.** Confirm contract version.
2. **Read the rendered files.** Open each path recorded in `render.json`.
3. **Run lens checks.** Per `references/detectors.md`. Each lens emits zero
   or more issues.
4. **Compute severity counts.** `blocker | critical | warning | suggestion`.
5. **Set verdict.** `approve` if zero blockers AND zero criticals; otherwise
   `request-changes`.
6. **Set status.** `BLOCKED` if any `blocker` OR the BLOCKED-escalation
   rule in `references/edge-cases.md#files-referenced-but-missing-on-disk`
   fires; otherwise `OK`. (Critical findings alone do NOT escalate to
   `BLOCKED`.)
7. **Write envelope.** `<repo-root>/.harness-kit/review.json`.

## Lenses

- **Completeness**: every proposed agent and skill has a corresponding file
- **Portability**: no agent- or vendor-specific syntax in shared content
- **Convention adherence**: detected conventions are reflected in the
  harness (e.g. if project uses ruff, the harness references ruff)
- **Drift**: files referenced in `prompt_path` exist with non-trivial content

## Output

See `references/output-schema.md`. JSON Schema at `schemas/review.schema.json`.

## Stop conditions

- envelope missing or invalid
- upstream `render.json.status` not `OK`

## Permissions

Read access to the rendered files and `.harness-kit/*.json`. Never writes
back into the user's repo.
