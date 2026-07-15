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
