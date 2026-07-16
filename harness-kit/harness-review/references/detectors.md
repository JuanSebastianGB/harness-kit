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

## Lens: sandbox-sensor warnings

Two hardcoded advisory rules that emit `severity: "warning"` under the
existing review schema. No new statuses or verdicts are introduced.

| Rule | Condition | Issue ID | Severity |
|---|---|---|---|
| Missing sandbox on write-capable agent | `tools[]` contains a write verb (`Write`, `Edit`, `Create`, `Patch`, `Delete`) AND `sandbox{}` is absent or empty | `missing-sandbox-write` | `warning` |
| Insufficient sensors for perception purpose | `purpose` mentions perception verbs (`read`, `glob`, `grep`, `inspect`, `query`, `monitor`, `poll`, `observe`) AND `sensors` is absent or empty | `insufficient-sensors` | `warning` |

## Lens: emit-code

Advisory-only checks that warn about emitted code quality and consistency.
Never gate — findings do not contribute `blocker` or `critical` severity.

| Name | Trigger | Severity | Description |
|------|---------|----------|-------------|
| emit_missing_sandbox | Emitted function accesses filesystem without assertSandbox | warn | Every I/O function must call assertSandbox() |
| emit_exports_mismatch | Emitted module exports don't match manifest.exports | warn | The module interface diverges from what manifest promises |
| emit_sandbox_drift | Code accesses paths beyond allowed_paths | warn | Potential sandbox escape |
| emit_no_review_needed | No manifest.json found | info | v0.2.0 compat — no emitted code to review |
| emit_file_overwrite | Emitted files overwrote existing hand-written files | warn | Manual changes may be lost |

## Severity escalation

- `secret leaked` → `blocker`
- `proposal not rendered` → `critical`
- `vendor-locked syntax` → `warning`
- `convention mismatch` → `warning`
- minor (`comment spacing`, etc.) → `suggestion`
