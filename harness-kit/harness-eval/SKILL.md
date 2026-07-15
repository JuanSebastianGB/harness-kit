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
5. **Compute `diff_from_previous`** if a prior eval exists.
6. **Write envelope.** `<repo-root>/.harness-kit/eval.json`.

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
