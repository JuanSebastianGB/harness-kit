# harness-eval: edge cases

## First run (no prior eval)

Emit `status: OK` with `diff_from_previous` omitted. The current run
becomes the baseline.

## Empty suite

The suite is a fixed list; it cannot be empty by construction. The CI
schema fields reject empty arrays.

## Diagonal regression

If a case that previously scored `1.0` now scores `0.0`, drop
`status` to `BLOCKED` regardless of total score.

## Unscorable

If `analyze.status` is `INSUFFICIENT_EVIDENCE` or `ERROR`, eval emits
`status: ERROR` with `scores: []` (per `SKILL.md#suitability-for-insufficient-evidence-upstream`).
The unscorable path is NOT a scored-0 case; it short-circuits eval.

For a single case that fails to evaluate against an otherwise healthy
upstream, score it `0` with `notes: "case-evaluator error: <reason>"`.

## Diff with prior but prior is older version

If the prior eval has a different `contract_version` and isn't backported,
omit `diff_from_previous` and add `notes: "prior eval contract_version
incompatible"`.
