# harness-eval: output schema

Authoritative JSON Schema: `schemas/eval.schema.json`.

Status values: `OK` / `INSUFFICIENT_EVIDENCE` / `ERROR` / `BLOCKED`.

## Case score

```
{
  "case": "agents-md-exists",
  "score": 1.0,
  "max": 1,
  "notes": "AGENTS.md exists, 412 bytes"
}
```

## Diff from previous

Only present when a prior `eval.json` exists.

```
{
  "previous_run_id": "uuid",
  "golden_suite_score_delta": 0.20,
  "regressions": ["agent-files-exist"],
  "improvements": ["portable-frontmatter"]
}
```

## Iteration

`propose.json` reads `eval.json.diff_from_previous.regressions` on the next
run. Each regression entry spawns a candidate new skill/agent.

## Thresholds for `BLOCKED`

- `golden_suite_score < 0.5`
- any case scored `0` on a previously-passing case
