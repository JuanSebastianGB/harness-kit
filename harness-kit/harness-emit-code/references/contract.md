# Harness Kit Contract — emit-code stage

`contract_version: 0.3.0` — unstable, expected to break before 1.0.

This is the per-stage copy of the kit contract for the harness-emit-code stage.
The canonical human index is `kit-contract.md` at repo root.

## Inputs

- `<repo-root>/manifest.json` — code emission manifest conforming to
  `schemas/code-emission-manifest.schema.json`. Produced by the render stage
  alongside AGENTS.md.
- `<repo-root>/AGENTS.md` — rendered AGENTS.md for reference context.

## Outputs

- Generated code files written to the paths declared in `manifest.files[].path`,
  resolved under `<repo-root>`.

## Stage contract

| Field | Value |
|-------|-------|
| Stage type | code emission |
| Input envelope | `manifest.json` (standalone, NOT wrapped in `.harness-kit/` envelope) |
| Output medium | Files on disk |
| Contract version | 0.3.0 |
| Depends on | `harness-render-agents-md` (for manifest emission) |

## Backward compat

If `<repo-root>/manifest.json` does not exist (pre-v0.3.0 behavior), the
emit-code stage is a **no-op**:

- Log `no_manifest_skip_emit` (info severity)
- Do not write any files
- Do not fail — the pipeline continues normally

v0.2.0 fixtures (without manifest) are supported gracefully.

## Adapter selection

The emit-code stage selects an adapter based on
`manifest.target_stack.language`:

| language | adapter | status in v0.3.0 |
|----------|---------|------------------|
| `typescript` | `references/adapters/typescript.md` | ✅ supported |
| `unknown` | n/a | ⚠️ warn and skip |
| `python` | n/a | ⏳ planned |
| `go` | n/a | ⏳ planned |
| `ruby` | n/a | ⏳ planned |
| `rust` | n/a | ⏳ planned |

When no matching adapter exists, emit `manifest_present_no_adapter` (warn
severity) and skip emit.

## Validation tiers

**Tier 1** (per-file, synchronous):
- File exists after write
- File is non-empty
- Required exports present (when `files[].exports[]` is declared)

**Tier 2** (post-write, project-level):
- TypeScript: `tsc --noEmit` on the target project
- Other languages: language-specific compile check (planned)

## Sandbox enforcement

Every emitted function that accesses the filesystem must call
`assertSandbox(path)` at the top. The function checks that `path` is within
`constraints_inherited.sandbox.allowed_paths`. If the constraint is missing,
proceed with no sandbox restrictions logged.

## License

MIT. `contract_version: 0.3.0` is unstable.
