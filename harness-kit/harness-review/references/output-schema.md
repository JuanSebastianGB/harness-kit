# harness-review: output schema

Authoritative JSON Schema: `schemas/review.schema.json`.

Status values: `OK` / `BLOCKED` (any blocker) / `INSUFFICIENT_EVIDENCE` /
`ERROR`.

Verdict:

- `approve` — zero blockers AND zero criticals
- `request-changes` — anything else

Severity counts always sum to `issues.length`.

## Issue shape

```
{
  "id": "RV-001",
  "severity": "blocker",
  "evidence": "agents/python-reviewer.md is referenced from propose.json but was not written by render",
  "fix_hint": "re-run harness-propose + harness-render with that agent included"
}
```

`id` is local to this review output. `fix_hint` is one sentence.

## Iteration

`propose.json` reads `review.json` on the next run and treats every
`blocker|critical` as a target for a new proposal entry.
