# harness-eval: golden suite + scoring

## Golden suite

The suite is intentionally tiny. It validates the harness's structural
guarantees, not its quality on a real project. The suite is **versioned
via the `suite` field** on the eval output (e.g. `suite: "v0.1.0"`). A
suite bump is a `contract_version` minor bump on `eval.schema.json`.

### case: agents-md-exists

A harness is good if the rendered AGENTS.md exists and is non-empty.

### case: covers-detected-conventions

The harness mentions every non-null field in `analyze.data.conventions`.

### case: portable-frontmatter

Frontmatter uses only the agentskills.io spec fields (`name`, `description`).

### case: agent-files-exist

Every `propose.data.agents[i].prompt_path` resolves to a real file after
render.

### case: skill-files-exist

Every `propose.data.skills[i].name` has a corresponding mirror file under
the user's repo.

### case: sandbox-respect (v0.2.0)

An agent with `sandbox.allowed_paths: ["src/**"]` attempting to write
outside `src/`. Scores:
- `1.0` — write is blocked / tool respects sandbox bounds
- `0.5` — partially blocked (some writes succeed, some are blocked)
- `0.0` — write succeeds (sandbox not enforced)

Run 3 consecutive times; all 3 outputs MUST be byte-identical (sha256 match).
If any run produces a different result, score is `0.0` regardless of the
individual run score. This enforces the determinism invariant from the
kit contract (v0.2.0, §Sandbox & Sensors).

### case: determinism-re-run (v0.2.0)

Same v0.2.0 eval fixture rendered twice MUST yield byte-identical sha256.
Scores:
- `1.0` — byte-identical across 2 runs
- `0.0` — any divergence (hashes differ)

## Scoring rubric

For each case:

- `1.0` — case passes
- `0.5` — case passes after a single fix during render
- `0.0` — case fails (file missing, content wrong, etc.)

`golden_suite_score = (sum of scores) / (number of cases)`

`golden_suite_score` is capped at `0.0` when:
- `analyze.status` is `ERROR` or `INSUFFICIENT_EVIDENCE`
- any BLOCKED review issue exists

### Sandbox-respect determinism check (v0.2.0)

For the `sandbox-respect` case, the scoring rubric above is extended by
a byte-identical re-run gate. Run the same fixture 3 times; if all 3 sha256
hashes match, keep the per-run score. If any hash diverges, score is `0.0`.
This cross-references the determinism invariant in `kit-contract.md`
(§Sandbox & Sensors — Canonicalization rules).

## Emit-code detectors (v0.3.0)

The following detectors fire during the emit-code evaluation step. They are
not golden-suite cases — they apply penalties that adjust the eval score
when emitted code quality degrades.

| Name | Trigger | Severity | Description |
|------|---------|----------|-------------|
| `emit_tier1_manifest_missing` | manifest.json doesn't exist | warn | Cannot evaluate emitted code. v0.2.0 compat — skip. |
| `emit_tier1_manifest_invalid` | manifest.json fails schema validation | error | Manifest is malformed. Re-emit from render stage. |
| `emit_tier1_file_missing` | A file from manifest.files[] doesn't exist | error | Emit stage skipped or failed silently. |
| `emit_tier1_exports_mismatch` | Exported symbols don't match manifest.exports | warn | Module interface drifts from contract. |
| `emit_tier2_compile_error` | tsc --noEmit returns non-zero | error | Emitted TypeScript doesn't compile. |
| `emit_tier2_import_resolve_fail` | Dynamic import throws | error | Module cannot be loaded at runtime. |

### Emit-code scoring

The emit-code evaluation produces an `emit_code_penalty` that is independent
of the golden suite score:

- No manifest → `penalty = 0` (v0.2.0 compat, detector fires at `warn`)
- All Tier-1 pass → no penalty from Tier-1
- Any Tier-1 fail → `-20`
- All Tier-2 pass (or language is not TypeScript, so Tier-2 is skipped) → no
  penalty from Tier-2
- Any Tier-2 fail → cumulative `-50` (adds `-30` to Tier-1 penalty)
- All checks pass → `penalty = 0`

The penalty is recorded as `emit_code_penalty` in the eval output alongside
`golden_suite_score`. A negative value indicates compliance issues with
the emitted code that the golden suite alone does not surface. The penalty
is always `0` when no manifest exists (pre-v0.3.0 fixtures).
