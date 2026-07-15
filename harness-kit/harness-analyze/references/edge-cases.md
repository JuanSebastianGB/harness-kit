# harness-analyze: edge cases

## Empty repository

If marker file is found at root but the directory is otherwise empty, emit
`status: INSUFFICIENT_EVIDENCE`. Stack and conventions will all be empty;
the rest of the pipeline will refuse to run.

## Monorepo

Detected by `package.json.workspaces`, `pnpm-workspace.yaml`, `Cargo.toml
[workspace]`, `pyproject.toml [tool.uv.workspace]`. Set `shape: monorepo`
and recurse one level into each workspace, emitting one `data.entry_points`
per workspace. Aggregate `stack.languages` across workspaces.

If both monorepo and single-project shapes match, emit
`conflicts[]` with `severity: warn`. Default to `monorepo` only when a
workspace config file is present.

## Conflicting package manager

When both `pnpm-lock.yaml` and `package-lock.json` are present, emit:

```
{
  "field": "stack.package_manager",
  "values": [...],
  "severity": "warn"
}
```

`harness-propose` decides per project policy. `severity: block` only when
two repos are nested (one as a subdir of the other) and they disagree on
language.

## Path traversal in user input

Reject paths that:

- resolve to a system path the user clearly did not mean (`/etc`, `/var`,
  `$HOME/.ssh`, `$HOME/.aws`) unless a marker file is found there
- contain `..` after normalization that escapes the marker-file check
- are symlink loops (detect via stat)

## LLM JSON emission failure

If the first parse of the JSON envelope fails:

1. retry once with instruction: "emit ONLY the JSON, no markdown fences,
   no commentary"
2. if second parse fails, emit `status: ERROR` with `notes` describing
   the parse error and halt

## Re-run idempotency

`run_id` is generated per stage via `crypto.randomUUID()`. Output is NOT
guaranteed byte-identical across runs because `coverage.absolute_paths_checked`
contains host-environment values. The following fields MUST agree across
runs of the same model against the same repo at the same commit
(modulo detection-rule updates):

- `data.stack.*`
- `data.entry_points`
- `data.existing_harness.*`
- `data.conventions.*`
- `data.shape`
- `data.conflicts[]`
- `data.coverage.evidence_paths`
- `data.coverage.evidence_redacted_paths`
