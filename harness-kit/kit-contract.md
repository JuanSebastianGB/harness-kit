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

### Schema: `schemas/code-emission-manifest.schema.json`

| Field | Required | Description |
|-------|----------|-------------|
| `manifest_version` | ✅ | Semver string matching `^[0-9]+\.[0-9]+\.[0-9]+$` |
| `target_stack` | ✅ | Unified language/runtime/framework detection (inherited from analyze) |
| `files[]` | ✅ | Every file the render stage produced: `path`, `kind`, `description`, `intent` |
| `constraints_inherited` | ✅ | Aggregated sensors and sandbox constraints from all agent proposals |
| `exports` | ❌ | Global exports the manifest's code base should expose |
| `stack_extensions` | ❌ | Per-stack extension data, keyed by stack name |

### Required fields

- **`target_stack`** — describes the project's language (`typescript | python
  | go | ruby | rust | unknown`), runtime, framework, and lockfile-derived
  confidence score. Inherited from the analyze phase.
- **`files[]`** — ordered list of file descriptors. Each entry has:
  - `path` — relative from repo root, no `..` segments
  - `kind` — enum: `source | test | config | tool-implementation`
  - `description` (optional) — human-readable summary
  - `intent` (optional) — why this file was generated
  - `exports` (optional) — named exports this file exposes
  - `sandbox_inherits_from_propose` (optional) — whether sandbox applies
- **`constraints_inherited`** — carries forward `sensors[]` and `sandbox{}`
  from the propose phase, so the emit-code stage can enforce them.

### Optional fields

- **`exports`** — top-level named exports that the aggregated code base
  should expose. Each entry has `name`, `kind`, and `type`.
- **`stack_extensions`** — hybrid extension point for per-stack metadata.
  The core manifest is stack-agnostic; stacks add their own keys here.

### Backward compat

The manifest is OPTIONAL — if no analyze output exists, the render stage
skips it. Downstream emit-code gracefully handles absence (no-op with
`no_manifest_skip_emit` log). v0.2.0 fixtures without manifest are still
valid.

### Hybrid pattern

The manifest follows a **core-agnostic + stack_extensions** pattern: the
required fields are language-agnostic, while `stack_extensions.<stack>`
carries per-stack details (e.g. TypeScript's `tsconfig` path, Python's
`requirements.txt` entries). This keeps the manifest unified while allowing
each adapter to read its own extensions without parsing foreign keys.

## Pipeline

```
harness-analyze -> harness-propose -> harness-render-agents-md -> harness-emit-code -> harness-review -> harness-eval
        |                                                                                |
        +------------------ feedback to harness-propose on next run ---------------------+
                                                              |
                                                         [manifest.json]
                                                              |
                                                emitted code files on disk
```

The loop closes: `harness-eval` writes an output whose `diff_from_previous`
is a valid input signal for `harness-propose` on the next iteration.
`harness-review` emits a `verdict: request-changes` whose `issues[]` feed
back into `harness-propose` as well.

Starting from v0.3.0, the render stage additionally produces a `manifest.json`
artifact alongside AGENTS.md in the output directory. This manifest is consumed
by the `emit-code` stage, which writes generated code files to disk. The
emit-code stage replaces `emit_import_resolve` from earlier prototypes.

## emit-code stage

**Name:** `harness-emit-code`
**Contract version:** 0.3.0
**Depends on:** `harness-render-agents-md` (for `manifest.json`)

The emit-code stage transforms the render stage's manifest into actual code
files on disk. It is the bridge between the planning pipeline and the target
project's codebase.

### Input

- `<repo-root>/manifest.json` — code emission manifest conforming to
  `schemas/code-emission-manifest.schema.json`. Produced by the render stage
  alongside AGENTS.md.

### Output

- Generated code files written to the paths declared in
  `manifest.files[].path`, resolved under `<repo-root>`.

### Dispatch

The stage selects a **code generator adapter** based on
`manifest.target_stack.language`. If no adapter exists for the declared
language, the stage logs `manifest_present_no_adapter` (warn) and is a no-op.

### Validation

| Tier | Scope | Check |
|------|-------|-------|
| 1 | Per-file | File exists, non-empty, required exports present |
| 2 | Project-level | Language compile check (e.g. `tsc --noEmit` for TypeScript) |

Tier-2 is advisory in v0.3.0 — it logs failures but does not block the pipeline.

### Backward compat

If `<repo-root>/manifest.json` does not exist (pre-v0.3.0), emit-code logs
`no_manifest_skip_emit` (info) and is a no-op. v0.2.0 fixtures without manifest
are supported gracefully.

### Per-stage contract

Full details: [`harness-emit-code/references/contract.md`](./harness-emit-code/references/contract.md)

---

## Adapter System

Adapters are per-stack code generation templates that the emit-code stage
dispatches to. Each adapter knows how to translate the abstract file
descriptions in `manifest.files[]` into idiomatic code for its target
language.

### Dispatch

```
manifest.target_stack.language → adapter lookup → adapter execution
```

| Language | Adapter | v0.3.0 status |
|----------|---------|---------------|
| TypeScript | `harness-emit-code/references/adapters/typescript.md` | ✅ supported |
| Python | — | ⏳ planned |
| Go | — | ⏳ planned |
| Ruby | — | ⏳ planned |
| Rust | — | ⏳ planned |
| unknown | — | ⚠️ warn and skip |

### How to add a new adapter

1. Create `<adapter-name>.md` in `harness-emit-code/references/adapters/`
2. Add a dispatch entry in the emit-code stage that maps `language` to the
   adapter path
3. Register the language in the manifest schema's `target_stack.language`
   enum
4. Add the adapter to the table above

Adapters are self-contained: they receive the manifest's `files[]` and
`target_stack` and emit file contents on disk. They do not depend on other
stages' internals.

---

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
state directory. Downstream emit-code reads it from the repo root.

The emit-code stage writes generated code files directly to paths declared in
the manifest — these are regular project files, not stage artifacts.

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
envelope — it writes artifacts directly to disk (described in its own section
above). The envelope model applies to the JSON-based stages only.

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

The `harness-kit/SKILL.md` parent orchestrator documents the 6-stage loop.
Each `<stage>/SKILL.md` is independently installable for users who only want
a subset.

`kit-contract.md` at repo root is **not** shipped to the agent. Each skill
embeds a copy at `<stage>/references/contract.md`. The root file is the
canonical human index.

## License

MIT. See `LICENSE`. **Disclaimer:** `contract_version: 0.3.0` is unstable.
Breaking changes without a migration path are possible until `1.0.0`.
