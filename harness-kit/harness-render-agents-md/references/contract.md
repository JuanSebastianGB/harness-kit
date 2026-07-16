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

Each stage of the kit produces JSON files consumed by the next stage. Most
stages produce one file; the render stage produces TWO outputs.

## Manifest (v0.3.0)

Starting from v0.3.0, the `harness-render-agents-md` stage emits a
`manifest.json` alongside AGENTS.md (same output directory) in addition to its
internal envelope at `.harness-kit/render.json`. The manifest is consumed by
the `emit-code` stage and conforms to
`schemas/code-emission-manifest.schema.json`.

The manifest describes:
- `target_stack`: the project's language, framework, and runtime (inherited
  from the analyze phase)
- `files[]`: every file the render stage produced, with its path, kind, and
  intent
- `constraints_inherited`: aggregated sensors and sandbox constraints from all
  agent proposals (passed through from the propose phase)

The manifest is OPTIONAL — if no analyze output exists, the render stage
skips it. Downstream stages (emit-code) gracefully handle its absence.

## Pipeline

```
harness-analyze -> harness-propose -> harness-render-agents-md -> harness-review -> harness-eval
        |                                                              |
        +------------ feedback to harness-propose on next run ---------+
                                          |
                                     [manifest.json]
                                          |
                                     harness-emit-code  (v0.3.0+)
```

The loop closes: `harness-eval` writes an output whose `diff_from_previous`
is a valid input signal for `harness-propose` on the next iteration.
`harness-review` emits a `verdict: request-changes` whose `issues[]` feed
back into `harness-propose` as well.

Starting from v0.3.0, the render stage additionally produces a `manifest.json`
artifact alongside AGENTS.md in the output directory. This manifest is consumed
by the `emit-code` stage (which replaces `emit_import_resolve` in v0.3.0).

## Transport

Every stage writes its internal output to:

```
<repo-root>/.harness-kit/<stage>.json
```

`<repo-root>` is the directory the user supplied as the project being analyzed.
Output is gitignored. The `.harness-kit/` directory is the primary state shared
between stages.

The render stage (v0.3.0+) produces an additional public artifact:

```
<repo-root>/manifest.json
```

This file is written alongside AGENTS.md in the target project root, NOT inside
`.harness-kit/`. It is the only stage output that lives outside the internal
state directory. Downstream stages (emit-code) read it from the repo root.

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
