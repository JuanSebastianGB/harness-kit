# harness-propose: output schema

Authoritative JSON Schema: `schemas/propose.schema.json`.

Status values: `OK` / `INSUFFICIENT_EVIDENCE` / `ERROR` / `BLOCKED`.

## Agent proposal

```
{
  "name": "py-reviewer",
  "purpose": "Review Python files using ruff and the project's conventions",
  "tools": ["Read", "Grep", "Glob"],
  "prompt_path": "agents/py-reviewer.md"
}
```

## Skill proposal

```
{
  "name": "run-target-explainer",
  "purpose": "Explain what an npm/bun/poetry script does before running it",
  "triggers": ["explain run", "what does this script do", "show script"]
}
```

## Rejected proposals

```
{
  "name": "infra-deployer",
  "reason": "Requires Bash(*) which is not in the agent's allow list"
}
```

## Iteration

When the prior `eval.json.diff_from_previous.regressions` is non-empty, every
regression becomes a candidate new entry. When `review.json.issues` is
non-empty, every `severity: blocker|critical` becomes a candidate new entry.
