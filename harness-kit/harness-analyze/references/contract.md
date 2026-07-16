# Harness Kit Contract

`contract_version: 0.3.0` — unstable, expected to break before 1.0.

This document is the human-readable index of the contract. The machine-readable
schemas live in `schemas/` as one JSON Schema per pipeline stage:

- `schemas/analyze.schema.json`
- `schemas/propose.schema.json`
- `schemas/render.schema.json`
- `schemas/review.schema.json`
- `schemas/eval.schema.json`
- `schemas/code-emission-manifest.schema.json` (v0.3.0)

Each stage of the kit produces JSON files consumed by the next stage. The
render stage produces TWO outputs: an internal envelope and a public manifest.

## Pipeline

```
harness-analyze -> harness-propose -> harness-render-agents-md -> harness-emit-code -> harness-review -> harness-eval
        |                                                                                |
        +------------------ feedback to harness-propose on next run ---------------------+
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

## Analyze output

v0.3.0 adds a new OPTIONAL field to `data`:

- **`target_stack`** (`object`, optional). Unified language/runtime/framework
  detection for the analyzed project. Downstream emit-code uses this to select
  adapters. v0.2.0 fixtures without `target_stack` continue to validate.
  - `language` (enum: `typescript | python | go | ruby | rust | unknown`).
  - `runtime` (`string`, optional, e.g. `"bun"`, `"node"`).
  - `framework` (`string`, optional, copied from `stack.framework`).
  - `confidence` (`number`, 0-1). Determined by lockfile/marker-file rules in
    `references/detectors.md#Target stack`.

**Detection rules** (first-match wins, conflicts emit a `conflict-entry`):
- `bun.lock` or `bun.lockb` → typescript/bun, 0.9
- `yarn.lock` + `tsconfig.json` → typescript/node, 0.8
- `package-lock.json` + `tsconfig.json` → typescript/node, 0.7
- `go.mod` → go, 0.9
- `Cargo.toml` → rust, 0.9
- `requirements.txt` or `pyproject.toml` → python, 0.8
- `Gemfile` → ruby, 0.7
- No lockfile → unknown, 0.2

**Migration:** v0.2.0 fixtures without `target_stack` continue to validate.
Downstream users who want the new behavior bump their kit pin to `@v0.3.0`.

## Envelope

Every JSON output is wrapped in a common envelope:

```json
{
  "$schema": "<stage>.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "<uuid>",
  "stage": "<one of: analyze | propose | render | emit-code | review | eval>",
  "produced_at": "<iso-8601>",
  "data": { ...stage-specific fields... }
}
```

**Note:** The `emit-code` stage does NOT write a `.harness-kit/emit-code.json`
envelope — it writes artifacts directly to disk (described in its own contract).

`stage` is a single value, not a union. The six values are pinned by each
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

MIT. See `LICENSE`. **Disclaimer:** `contract_version: 0.3.0` is unstable.
Breaking changes without a migration path are possible until `1.0.0`.
