# harness-eval: golden suite + scoring

## Golden suite

The suite is intentionally tiny. It validates the harness's structural
guarantees, not its quality on a real project. The suite is **versioned
via the `suite` field** on the eval output (e.g. `suite: "v0.1.0"`). A
suite bump is a `contract_version` minor bump on `eval.schema.json`.

### case: agents-md-exists

A harness is good if the rendered AGENTS.md exists and is non-empty.

### case: covers-detected-conventions

The harness mentions every non-null field in `analyze.data.conventions`.

### case: portable-frontmatter

Frontmatter uses only the agentskills.io spec fields (`name`, `description`).

### case: agent-files-exist

Every `propose.data.agents[i].prompt_path` resolves to a real file after
render.

### case: skill-files-exist

Every `propose.data.skills[i].name` has a corresponding mirror file under
the user's repo.

## Scoring rubric

For each case:

- `1.0` — case passes
- `0.5` — case passes after a single fix during render
- `0.0` — case fails (file missing, content wrong, etc.)

`golden_suite_score = (sum of scores) / (number of cases)`

`golden_suite_score` is capped at `0.0` when:
- `analyze.status` is `ERROR` or `INSUFFICIENT_EVIDENCE`
- any BLOCKED review issue exists
