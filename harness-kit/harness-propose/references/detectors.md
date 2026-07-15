# harness-propose: proposal templates

This is a library of proposal templates. The skill picks one per detected
condition. Names MUST be lowercase alphanumeric + hyphens.

## Minimal agent template

```
name: <derived from analyze>
purpose: <one-sentence role>
tools: [Read, Grep, Glob]   (optional; portable hint, NOT vendor-specific)
prompt_path: agents/<name>.md
```

`prompt_path` is relative to the user's repo root and is what
`harness-render-agents-md` actually creates. The `tools` field is portable
metadata only; the renderer keeps it inside an opt-in `<!-- agent-specific -->`
fenced block. The kit does not emit `allowed-tools` (Anthropic-specific).

## Minimal skill template

```
name: <derived from analyze>
purpose: <short, max 1024 chars>
triggers: [<keyword>, ...]
```

`triggers` are natural-language cues that indicate when to load the skill.

## Decision rules

| Signal in analyze.data | Skill proposes |
|---|---|
| `stack.languages ∋ "typescript"` AND monorepo `false` | skill `typescript-review` |
| `conventions.linter == "ruff"` | agent `py-reviewer` |
| `existing_harness.agents_md == false` | skill `bootstrap-agents-md` |
| `entry_points.length > 1` | skill `run-target-explainer` |
| `shape == "monorepo"` | agent `workspace-router` |

Each rule MUST cite the field it reads from `references/edge-cases.md` if
the behavior depends on a non-obvious interaction.

## Iteration

If `previous_run_id` is set, every prior `agents[]` and `skills[]` is
preserved unless explicitly removed by `rejected_proposals[]`. New entries
go on top; `diff_from_previous` is computed by the consumer.
