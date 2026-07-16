# harness-kit

Curated kit of 6 `SKILL.md` files for building an AI harness iteratively,
stack-agnostic, JSON-Schema-validated. Designed to be installed once with
`npx skills add` and run anywhere from Claude Code to Cursor to OpenCode.

## Skills

| Skill | Stage | Purpose |
|---|---|---|
| `harness-kit`         | orchestrator | Walks all 5 stages and closes the loop |
| `harness-analyze`     | 1            | Detect stack, conventions, existing harness |
| `harness-propose`     | 2            | Design the harness (agents + skills) |
| `harness-render-agents-md` | 3       | Render AGENTS.md + per-agent files |
| `harness-review`      | 4            | Review the rendered files |
| `harness-eval`        | 5            | Score against a frozen golden suite |

## Install

```
npx skills add JuanSebastianGB/harness-kit
```

## Quick start

1. In your project repo, run `npx skills add <owner>/harness-kit`.
2. Start a session in that agent and invoke the `harness-kit` skill with
   the project path.
3. The pipeline writes state under `<repo>/.harness-kit/*.json`. Add a
   snippet to your `.gitignore`:

```
.harness-kit/
```

4. Iterate: re-invoke `harness-kit` after changes to the repo or after
   reviewing `eval.json` diffs.

## Iterating

`eval.json.diff_from_previous.regressions` feeds back into `propose.json`
on the next run. `review.json.issues` with severity `blocker|critical`
also feed forward. The loop is closed by design.

## Contract

See `kit-contract.md` at the repo root. Each installed skill embeds a
copy at `references/contract.md` for self-validation.

## Pinning

The contract is at `v0.1.0`. Pin installs with `@v0.1.0` to avoid
surprise breakage. Minor and major bumps will be documented in
`CHANGELOG.md`.

## License

MIT. See `LICENSE` for the disclaimer.
