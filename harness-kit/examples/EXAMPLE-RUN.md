# End-to-end example

A minimal run against a fictional TypeScript repo, `acme-bot`. The repo
contains `package.json`, an `src/` directory, and nothing else.

## Setup

```bash
mkdir acme-bot && cd acme-bot
echo '{"name":"acme-bot","scripts":{"dev":"bun run dev"}}' > package.json
mkdir src && echo 'console.log("hi")' > src/index.ts
npx skills add <owner>/harness-kit
```

In your agent, invoke the `harness-kit` skill with path `.`.

## What you should see

The agent walks through 5 stages. After each stage, a state file appears
in `.harness-kit/`.

### `.harness-kit/analyze.json` (excerpt)

```json
{
  "$schema": "analyze.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "...",
  "stage": "analyze",
  "produced_at": "...",
  "data": {
    "status": "OK",
    "stack": { "languages": ["typescript"], "package_manager": "bun", "framework": null },
    "entry_points": [{ "name": "dev", "command": "bun run dev" }],
    "existing_harness": { "agents_md": false, "skills": [], "agents": [] },
    "conventions": { "formatter": null, "linter": null, "test_runner": null },
    "shape": "single",
    "conflicts": [],
    "coverage": { "evidence_paths": ["package.json"], "evidence_redacted_paths": [], "absolute_paths_checked": ["..."] }
  }
}
```

### `.harness-kit/propose.json` (excerpt)

```json
{
  "$schema": "propose.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "...",
  "stage": "propose",
  "previous_run_id": null,
  "data": {
    "status": "OK",
    "agents": [
      { "name": "ts-reviewer", "purpose": "Review TypeScript files using the project's conventions", "tools": ["Read", "Grep", "Glob"], "prompt_path": "agents/ts-reviewer.md" }
    ],
    "skills": [
      { "name": "bootstrap-agents-md", "purpose": "Bootstrap a project's AGENTS.md from scratch", "triggers": ["new project", "no agents.md"] }
    ],
    "rejected_proposals": []
  }
}
```

### `.harness-kit/render.json` (excerpt)

```json
{
  "$schema": "render.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "...",
  "stage": "render",
  "data": {
    "status": "OK",
    "target_file": "AGENTS.md",
    "files": [
      { "path": "AGENTS.md", "action": "created", "sha256_preview": "..." },
      { "path": "agents/ts-reviewer.md", "action": "created", "sha256_preview": "..." }
    ],
    "collision_policy": "refuse"
  }
}
```

If `AGENTS.md` already exists with non-empty content, the file shows
`action: "refused"` with a `reason`, and the agent halts with a question.

### `.harness-kit/review.json` (excerpt)

```json
{
  "$schema": "review.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "...",
  "stage": "review",
  "data": {
    "status": "OK",
    "verdict": "approve",
    "issues": [],
    "severity_counts": { "blocker": 0, "critical": 0, "warning": 0, "suggestion": 0 },
    "reviewed_file": "AGENTS.md"
  }
}
```

### `.harness-kit/eval.json` (excerpt)

```json
{
  "$schema": "eval.schema.json#/$defs/output",
  "contract_version": "0.1.0",
  "run_id": "...",
  "stage": "eval",
  "data": {
    "status": "OK",
    "suite": "v0.1.0",
    "golden_suite_score": 0.8,
    "scores": [
      { "case": "agents-md-exists", "score": 1.0, "max": 1 },
      { "case": "covers-detected-conventions", "score": 1.0, "max": 1 },
      { "case": "portable-frontmatter", "score": 1.0, "max": 1 },
      { "case": "agent-files-exist", "score": 1.0, "max": 1 },
      { "case": "skill-files-exist", "score": 0.0, "max": 1, "notes": "skill-files-exist: only one skill mirror needed; check render" }
    ]
  }
}
```

## Iterating

Run the kit again with the project path. `propose.json` reads the
`eval.json` diff from the previous run and adds any regressions as new
proposals. `golden_suite_score` should increase over iterations.
