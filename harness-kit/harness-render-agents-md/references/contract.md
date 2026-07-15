# Harness Kit Contract

`contract_version: 0.2.0` — unstable, expected to break before 1.0.

This document is the human-readable index of the contract. The machine-readable
schemas live in `schemas/` as one JSON Schema per pipeline stage:

- `schemas/analyze.schema.json`
- `schemas/propose.schema.json`
- `schemas/render.schema.json`
- `schemas/review.schema.json`
- `schemas/eval.schema.json`

Each stage of the kit produces a single JSON file consumed by the next stage.

## Pipeline

```
harness-analyze -> harness-propose -> harness-render-agents-md -> harness-review -> harness-eval
        |                                                              |
        +------------ feedback to harness-propose on next run ---------+
```

The loop closes: `harness-eval` writes an output whose `diff_from_previous`
is a valid input signal for `harness-propose` on the next iteration.
`harness-review` emits a `verdict: request-changes` whose `issues[]` feed
back into `harness-propose` as well.

## Transport

Every stage writes its output to:

```
<repo-root>/.harness-kit/<stage>.json
```

`<repo-root>` is the directory the user supplied as the project being analyzed.
Output is gitignored. The `.harness-kit/` directory is the only state shared
between stages.

## Sandbox & Sensors

v0.2.0 adds two OPTIONAL first-class fields to `agent-proposal` that describe
the agent's perception surface and action perimeter:

- **`sensors`** (`string[]`, optional, max 32). Read-only perception tools
  (file reads, HTTP GET, env queries). Each item must match
  `^[a-z0-9][a-z0-9._-]*$`. Sorted lexicographically at render time for
  determinism.

- **`sandbox`** (`object`, optional) with four optional sub-fields:
  - `allowed_paths` (`string[]`, max 32) — relative-path patterns.
  - `denied_commands` (`string[]`, max 64) — exact-match substrings.
  - `network_access` (enum: `"none" | "read_only" | "full"`).
  - `requires_approval` (`string[]`, max 32).

**Canonicalization rules (determinism invariant):**
- `sensors[]`: sort entries with `localeCompare`.
- `sandbox{}` sub-arrays: sort every string array with `localeCompare`.
- `sandbox{}` key order: `allowed_paths`, `denied_commands`, `network_access`,
  `requires_approval`.
- Three consecutive runs on the same input produce byte-identical output.

**Migration:** v0.1.0 fixtures without `sensors` or `sandbox` continue to
validate. Both fields are optional. Downstream users who want the new behavior
must bump their kit pin to `@v0.2.0` (or `@latest`).

## Envelope

Every JSON output is wrapped in a common envelope:

```json
{
  "$schema": "<stage>.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "<uuid>",
  "stage": "<one of: analyze | propose | render | review | eval>",
  "produced_at": "<iso-8601>",
  "data": { ...stage-specific fields... }
}
```

`stage` is a single value, not a union. The five values are pinned by each
schema's `stage` `const`. Consumers MUST refuse to proceed if
`contract_version` is outside their supported range. Patch updates are
assumed compatible; minor updates break.

## Status

Each `data` object carries a `status` field:

- `OK` — proceed
- `INSUFFICIENT_EVIDENCE` — required fields could not be filled; downstream
  skills MUST stop and surface to the user
- `ERROR` — unrecoverable; downstream skills MUST stop and surface
- `BLOCKED` — a blocking conflict was detected; downstream skills MUST stop

## Iteration

- `run_id` is generated per stage. `harness-propose` writes
  `previous_run_id` at the envelope level (sibling of `run_id`). Eval
  writes `diff_from_previous` inside `data`. Both are visible to the next
  stage's consumer without coupling the envelope to stage-specific shape.
- A re-run with no input change is allowed; output is byte-identical only if
  the underlying deterministic checks agree.

## Compatibility with `skills` loader

This kit is published as a single Git repo. Installed via:

```
npx skills add <owner>/harness-kit
```

The `harness-kit/SKILL.md` parent orchestrator documents the 5-stage loop.
Each `<stage>/SKILL.md` is independently installable for users who only want
a subset.

`kit-contract.md` at repo root is **not** shipped to the agent. Each skill
embeds a copy at `<stage>/references/contract.md`. The root file is the
canonical human index.

## License

MIT. See `LICENSE`. **Disclaimer:** `contract_version: 0.2.0` is unstable.
Breaking changes without a migration path are possible until `1.0.0`.
