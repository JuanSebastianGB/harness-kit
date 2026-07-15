---
name: harness-kit
description: Orchestrator for the harness-kit pipeline. Walks the 5 stages (analyze -> propose -> render -> review -> eval) and closes the loop. Use to start a fresh harness run, or to iterate after a previous run emitted a regression.
---

## When

Activate when the user says "run the harness pipeline", "iterate the
harness", or invokes this skill directly with no upstream state.

## Inputs

A repository path (`<repo>`). Optionally:

- prior `.harness-kit/analyze.json` and onward (re-runs)
- prior `eval.json` (close the loop)

## Pipeline

```
harness-analyze (required first run)
   v
harness-propose (uses analyze)
   v
harness-render-agents-md (uses propose)
   v
harness-review (uses render)
   v
harness-eval (uses review)
   v
loop back to harness-propose on next run (using eval diff)
```

Each stage reads/writes `<repo>/.harness-kit/<stage>.json`.

## Steps

1. Confirm `<repo>` resolves and contains a marker file.
2. Run `harness-analyze`.
3. If `status: BLOCKED | INSUFFICIENT_EVIDENCE | ERROR`, surface to user and halt.
4. Otherwise, `harness-propose` -> `harness-render-agents-md` ->
   `harness-review` -> `harness-eval`.
5. On any stage returning `BLOCKED`, halt and surface.
6. Print a final summary: each stage's status, the eval score, and the
   diff from previous if present.

## Output

Final summary printed to console. State persists in `.harness-kit/*.json`.

## Permissions

Read on `<repo>`. Write only under `<repo>/.harness-kit/` and (when
`harness-render-agents-md` is invoked) on the AGENTS.md / agent / skill
files it owns, per its collision policy.

See `kit-contract.md` at the repo root for the human index of the contract.
