---
name: harness-emit-code
description: Read the manifest.json produced by the render stage, dispatch to the correct language adapter (based on target_stack.language), and generate code files in the target repository. Validates output after generation. Use when the render stage has completed and manifest.json is available at the output directory.
---

## When

Activate when `<repo-root>/manifest.json` exists with a valid `target_stack`
and `files[]` array, and the user asks "emit code", "generate the agent tools",
"write the implementation files", or when the pipeline reaches the emit-code
stage.

## Inputs

- `<repo-root>/manifest.json` — the code emission manifest produced by the
  render stage, conforming to `schemas/code-emission-manifest.schema.json`
- `<repo-root>/AGENTS.md` — the rendered AGENTS.md (used as reference context
  for emitted code)

## Steps

1. **Locate and validate the manifest.** Read `<repo-root>/manifest.json`.
   Validate against `schemas/code-emission-manifest.schema.json`. If validation
   fails or the file is missing, treat as a no-op (v0.2.0 backward compat).

2. **Select adapter by target_stack.language.** Read `manifest.target_stack.language`:
   - `"typescript"` → use the TypeScript adapter
     (`references/adapters/typescript.md`)
   - `"unknown"` → warn and skip emit; log `manifest_present_no_adapter`
   - Any other unrecognized value → warn and skip emit; log
     `manifest_present_no_adapter`

3. **Iterate over files[] entries.** For each entry in `manifest.files[]`:
   1. Resolve the adapter template for the file's `kind` (`source`, `test`,
      `config`, `tool-implementation`).
   2. Hydrate the template using `constraints_inherited` info (sensors,
      sandbox paths, network access, etc.).
   3. Compute the absolute output path by resolving `files[].path` relative to
      `<repo-root>`. Reject path traversal (`..` escapes, absolute paths in
      manifest).
   4. If the file already exists at the target path, overwrite with a warning.
   5. Write the file.
   6. Run Tier-1 validation: file exists, file is non-empty, required exports
      are present (if `files[].exports[]` is non-empty).

4. **Run Tier-2 validation.** After all files are written:
   - **TypeScript targets**: run `tsc --noEmit` on the target project. Expect
     exit code 0. If compile errors exist, emit `tsc_compile_error`.
   - **Other targets**: run the language-specific compile/lint check if an
     adapter provides one.

5. **Report results.** Emit a summary table:

   | File | Status | Validation |
   |------|--------|------------|
   | `tools/rest-get.ts` | written | tsc OK |
   | `tests/rest-get.test.ts` | written | tsc OK |
   | `manifest.json | read | valid |

   Include warnings and errors from detectors:
   - `manifest_present_no_adapter` — if adapter not found
   - `no_manifest_skip_emit` — if manifest missing (no-op)
   - `exports_mismatch` — if module exports don't match manifest
   - `sandbox_drift` — if emitted code uses paths outside
     `constraints_inherited`
   - `empty_files_array` — if `files[]` is empty
   - `tsc_compile_error` — if TypeScript compilation fails

## Output

Generated code files under the target repo's `tools/` and `tests/` directories
(per adapter conventions). The emit-code stage itself does NOT write a JSON
envelope — its output is the written code files.

## Stop conditions

Stop and surface to user when:

- `target_stack.language` is `"unknown"` and user has not explicitly opted in
  to a language override
- Any `files[].path` contains path traversal (`..`)
- Tier-2 validation (`tsc --noEmit` or equivalent) fails with errors
- No files were written and `files[]` was non-empty (all files had errors)

## Detectors

See `references/detectors.md` for the full detector reference.

## Edge cases

See `references/edge-cases.md` for edge case handling.

## Permissions

Read access to `<repo-root>/manifest.json` and `<repo-root>/AGENTS.md`. Write
access to the paths declared in `files[].path` resolved under `<repo-root>`.
Write access can be denied by the user's filesystem permissions.
