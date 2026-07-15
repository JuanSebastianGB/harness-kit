# harness-review: detection lenses

## Lens: completeness

For each entry in `propose.data.agents` referenced by name, check that
`render.json.files` includes a path matching `prompt_path`. Missing → issue.

For each entry in `propose.data.skills`, check the same for the skill
mirror path. Missing → issue.

## Lens: portability

Scan AGENTS.md and each rendered prompt for vendor-locked syntax:

- `claude:` prefixes, `codex:` prefixes, etc.
- `<system>` XML-style tags
- agent-specific magic like `${CLAUDE.md}`

Any hit → `warning: suggestion` unless the file is the optional fenced
`<!-- agent-specific -->` block (the renderer's opt-in escape hatch for
loader-specific syntax).

## Lens: convention adherence

For each field in `analyze.data.conventions` with non-null value, check that
the rendered harness mentions the same tool. Missing → `warning`.

## Lens: drift

For each `render.json.files[i]` with `action: updated | created`,
sha256 the current on-disk content. Mismatch → `critical` (the file was
modified between render and review).

## Lens: secrets

Re-run the secret-detection rules from `harness-analyze/references/detectors.md#secret-scrubbing`
against the rendered content. Any hit → `blocker`.

## Severity escalation

- `secret leaked` → `blocker`
- `proposal not rendered` → `critical`
- `vendor-locked syntax` → `warning`
- `convention mismatch` → `warning`
- minor (`comment spacing`, etc.) → `suggestion`
