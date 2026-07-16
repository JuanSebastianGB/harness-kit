---
name: harness-eval
description: Score the reviewed harness against a small golden case suite (built into this skill) and emit a diff from the prior eval run. Use after harness-review. Read-only; never modifies files. Produces .harness-kit/eval.json which is the valid next-run input to harness-propose.
---

## When

Activate after `<repo-root>/.harness-kit/review.json` exists with
`status: OK` (or BLOCKED, see below) and the user wants to know whether
their harness is improving.

## Inputs

- `<repo-root>/.harness-kit/review.json` (required)
- `<repo-root>/.harness-kit/eval.json` (optional, prior eval)

## Steps

1. **Validate envelope.** Confirm contract version.
2. **Load golden suite.** The "Golden suite" section in
   `references/detectors.md` lists the built-in cases. Each case has a
   name, a fixture pointer (description), and a scoring rubric in the
   "Scoring rubric" section of the same file.
3. **Score each case against the reviewed harness.** For each case:
   0, 0.5, or 1. Use the rubric in the "Scoring rubric" section of
   `references/detectors.md`.
4. **Compute `golden_suite_score`.** Sum-of-scores / case-count.
 5. **Run sandbox-respect determinism check.** For the `sandbox-respect` case
    (added in v0.2.0 golden suite), assert byte-identical output across 3
    consecutive re-runs. Scoring follows the rubric in
    `references/detectors.md#Scoring rubric`.
 6. **Evaluate emitted code (v0.3.0).** If `<repo-root>/manifest.json` exists:
    1. **Tier 1 — Surface validation.** Check the following; each uses the
       corresponding detector in `references/detectors.md`:
       - Manifest validates against `schemas/code-emission-manifest.schema.json`
         (detector: `emit_tier1_manifest_invalid`)
       - Every file in `manifest.files[].path` exists on disk
         (detector: `emit_tier1_file_missing`)
       - File contents are non-empty
       - Parsed export statements from each file match the declared exports
         in `manifest.exports` and per-file `exports` (detector:
         `emit_tier1_exports_mismatch`)
    2. **Tier 2 — Compile & resolve.** Only when
       `manifest.target_stack.language === "typescript"`:
       - Run `tsc --noEmit` in the repo root (detector:
         `emit_tier2_compile_error`)
       - Attempt dynamic `import()` of emitted files and verify export shape
         (detector: `emit_tier2_import_resolve_fail`)

    **Scoring (emit-code penalty):**
    - No manifest found → skip emit-code eval entirely (v0.2.0 compat).
      Detector `emit_tier1_manifest_missing` fires at `warn`.
    - Tier-1 any fail → `emit_code_penalty = -20`
    - Tier-2 any fail → cumulative `emit_code_penalty = -50` (adds -30)
    - All pass → `emit_code_penalty = 0`

    Record `emit_code_penalty` as a dedicated field in the eval output,
    alongside `golden_suite_score`. A negative penalty means the emitted
    code has compliance issues that the golden suite alone does not capture.

 7. **Compute `diff_from_previous`** if a prior eval exists.
 8. **Write envelope.** `<repo-root>/.harness-kit/eval.json`.

## Suitability for BLOCKED review

A BLOCKED review still produces an eval, but each case is scored 0 with
`notes: "BLOCKED at review; treat all cases as failing"`. This guarantees
a regression signal even when downstream is broken.

## Suitability for INSUFFICIENT_EVIDENCE upstream

If `analyze.status` is `INSUFFICIENT_EVIDENCE` or `ERROR`, emit
`status: ERROR` and skip scoring (`scores: []`). Eval cannot meaningfully
score when there is no upstream ground truth.

## Output

`references/output-schema.md`. JSON Schema at `schemas/eval.schema.json`.

## Stop conditions

- envelope missing or invalid

## Permissions

Read-only on `.harness-kit/*.json` and on the rendered files referenced
through review. Never writes outside `.harness-kit/`.
