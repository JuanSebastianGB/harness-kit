---
name: harness-propose
description: Design the harness proposal (agents and skills) for a project based on the analyze output. Use after harness-analyze completes with status OK. Produces .harness-kit/propose.json consumed by harness-render-agents-md. Honors previous run diff if present for iteration loops.
---

## When

Activate when `<repo-root>/.harness-kit/analyze.json` exists with
`status: OK` and the user asks "propose the harness", "what agents do I
need", or similar. Also activate when iterating: read the previous
`propose.json` to avoid duplicate proposals.

## Inputs

- `<repo-root>/.harness-kit/analyze.json` (required)
- `<repo-root>/.harness-kit/propose.json` (optional, previous proposal)
- `<repo-root>/.harness-kit/review.json` (optional, prior review)
- `<repo-root>/.harness-kit/eval.json` (optional, prior eval — read
  `data.diff_from_previous` to focus on regressions)

## Steps

1. **Read and validate the envelope.** Confirm `contract_version` matches
   the supported range for this stage. Refuse on mismatch.
2. **Check upstream status.** If `analyze.status ∈ {INSUFFICIENT_EVIDENCE,
   ERROR}`, halt and surface to user.
3. **Resolve conflicts.** Read `conflicts[]` from analyze. For each
   `severity: block`, halt. For each `severity: warn`, prefer the higher
   `confidence` value and note the choice.
4. **Read iteration signals.** If `review.json` or `eval.json` is present,
   pull `issues[]` and `regressions[]`. Each becomes a new skill/agent or
   modifies a prior proposal.
5. **Generate proposals.** Output:
   - `agents[]` — sub-agent definitions
   - `skills[]` — skill proposals
6. **Reject unobtainable proposals.** Anything requiring a tool the agent
   doesn't have access to goes to `rejected_proposals[]` with reason.
7. **Write envelope.** `<repo-root>/.harness-kit/propose.json`.

## Output

See `references/output-schema.md` for the human summary. The JSON Schema is
authoritative at `schemas/propose.schema.json`.

## Stop conditions

- upstream status is `INSUFFICIENT_EVIDENCE`, `ERROR`, or `BLOCKED`
- any `block`-severity conflict
- contract version mismatch

## Permissions

Read access to `.harness-kit/*.json`. Write only to `.harness-kit/propose.json`.
