# harness-emit-code: edge cases

## `target_stack.language === "unknown"`

The manifest targets an unknown language. Emit `manifest_present_no_adapter`
(warn severity). Do not attempt to select an adapter. Note in the output that
the stage was skipped due to unknown language. The pipeline continues — the
emit stage produces no code files.

## `files[]` is empty or not present

The manifest has no files to emit. Log `empty_files_array` (info severity).
The stage is a no-op. This is valid — for example, when the render stage
produced only AGENTS.md and no tool-implementation files are needed.

## `sandbox_inherits_from_propose === false`

The file entry does not inherit sandbox constraints from the propose phase.
```
Sandbox inheritance is scoped per file.
```
When `false`, operate in **audit-only mode**: validate that existing files at
the target path match the manifest expectations (correct exports, correct
kind), but do NOT write new content. If the file doesn't exist, log a warning
and skip.

When `true`, write the file with sandbox enforcement via `assertSandbox(...)`.

## Path traversal in `files[].path`

If `files[].path` contains `..` segments or resolves outside `<repo-root>`,
reject the entry with an error. Do not write the file. Log the path and
`severity: error`. The schema at `schemas/code-emission-manifest.schema.json`
enforces this via pattern `^(?!.*\\.\\.)(?!/).+$`.

## File already exists at target path

If a file already exists at the resolved output path, overwrite it with a
warning. Log the file path and `severity: info`. This is intentional — the
emit-code stage always regenerates from the current manifest.

## `constraints_inherited` missing

If the manifest lacks `constraints_inherited` (field missing or null), proceed
without sandbox enforcement. Emitted code does NOT include `assertSandbox(...)`
calls. Log `severity: info` — the proposal phase did not authorize constraints.

## Manifest `manifest_version` mismatch

If `manifest.manifest_version` does not match the kit's expected version
(e.g., manifest says `"0.2.0"` but kit expects `"0.3.0"`), proceed with a
compatibility note. The stage attempts to emit code using the available
adapters. Log `severity: info` and note the version difference.

## No matching adapter for `files[].kind`

If the selected language adapter does not have a template for a specific
`files[].kind` (e.g., `kind: "config"` in a TS adapter that only handles
`"source"` and `"tool-implementation"`), skip that file entry with a warning.
Log `severity: warn` with the `kind` and file path.

## Tier-1 validation failure (per-file)

If a file is written but Tier-1 validation fails (file is empty, or required
exports are missing):
- Log `severity: error` with the file path and the specific failure
- Do NOT attempt to re-write
- Continue to the next file entry
- The overall stage reports a partial failure

## Tier-2 validation failure (project-level)

If Tier-2 validation fails (e.g., `tsc --noEmit` has errors):
- Log `tsc_compile_error` with `severity: error`
- If the error is in an emitted file, include the file path and compile error
- If the error is in an existing (non-emitted) file, warn but do not block
- The user can fix and re-run Tier-2 manually

## Stage-level error resilience

Individual file writing errors do NOT block the entire stage. The stage
processes all `files[]` entries and reports a cumulative summary. Only
fatal errors (manifest invalid, path traversal) halt the stage immediately.
