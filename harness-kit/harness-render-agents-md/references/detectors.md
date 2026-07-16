# harness-render-agents-md: render templates

## AGENTS.md template

```
# <project name from analyze or propose>

<one-line purpose>

## Conventions

| Aspect | Value |
|---|---|
| Formatter | <from analyze> |
| Linter    | <from analyze> |
| Tests     | <from analyze> |
| Language  | <from analyze> |

## Sub-agents

<each agent from propose.data.agents, one per line + brief purpose>

## Skills

<each skill from propose.data.skills, one per line + brief purpose>

## How to iterate

Run harness-eval after changes; feed eval output back into harness-propose.
```

## Agent prompt template

The template emits a portable agentskills.io-spec `SKILL.md`-shaped file.
Per-target tool declarations are dropped by default because `allowed-tools`
is Anthropic-Claude-specific; some loaders ignore unknown fields while
others reject. To opt in, set `collision_policy: force` and add
`<!-- agent-specific -->` fenced content with per-loader syntax.

```
---
name: <agent.name>
description: <agent.purpose, max 1024 chars>
---

# <agent.name>

<purpose>

## Inputs

<what the agent reads>

## Steps

1. <numbered list>
```

## Skill mirror

For each `skills[]` entry, write the canonical skill skeleton. The
fallback Steps block is **deterministic** (no inference): it dispatches to
the kit contract via `references/contract.md`.

```
---
name: <skill.name>
description: <skill.purpose>
---

## When

<triggers joined with OR>

## Steps

1. Activate on a trigger listed above.
2. Read `references/contract.md` for the kit contract you must obey.
3. Read `references/output-schema.md` (in the calling skill) for the
   expected JSON shape.
4. If the calling skill's `data.status` is `BLOCKED` or
   `INSUFFICIENT_EVIDENCE`, halt and surface to the user.
```

All output MUST stay portable across the 70+ agents the `skills` loader
targets. Stack-specific content goes only inside fenced
`<!-- agent-specific -->` blocks at the bottom of `AGENTS.md`, omitted by
default.

## Detectors

Detectors are patterns to watch for during rendering. When triggered, emit a
note in `render.json` output and surface to the user as appropriate.

### manifest_emission_failed

| Aspect | Detail |
|--------|--------|
| Trigger | `manifest.json` generation encounters an unrecoverable error (disk full, permission denied, JSON serialization failure after schema validation passes) |
| Emit | `{ "detector": "manifest_emission_failed", "path": "manifest.json", "reason": "<error details>" }` |
| Severity | `warn` |
| Recovery | The render itself succeeded (AGENTS.md + prompts were written). The manifest is optional; downstream emit-code will detect its absence and can re-derive what it needs. Surface to user: "manifest.json could not be written: <reason>. The emit-code stage may need manual configuration." |

### manifest_skipped

| Aspect | Detail |
|--------|--------|
| Trigger | No `<repo-root>/.harness-kit/analyze.json` exists, or it has `data.status != "OK"`, or `data.stack.languages` is empty/unmappable to the manifest schema's language enum |
| Emit | `{ "detector": "manifest_skipped", "reason": "analyze output unavailable — target_stack cannot be determined" }` |
| Severity | `info` |
| Recovery | None needed. Downstream stages (emit-code) gracefully handle a missing manifest by prompting the user for the missing stack information or using a default. |

### constraints_mismatch

| Aspect | Detail |
|--------|--------|
| Trigger | The aggregated `constraints_inherited` in the manifest differs from what the propose phase declared for individual agents (e.g. a sensor present in the manifest was not declared in any agent proposal, or a sandbox rule in a proposal was dropped during aggregation) |
| Emit | `{ "detector": "constraints_mismatch", "field": "<field path>", "expected": <propose value>, "got": <manifest value> }` |
| Severity | `warn` |
| Recovery | Verify the aggregation logic: sensors should be the union of all per-agent sensors, sandbox should be the most restrictive union. If the mismatch is caused by an empty propose (no constraints declared), emit `constraints_mismatch` only if the manifest carries non-empty constraints that have no corresponding proposal. In all other cases, the render logic is correct by construction — this detector exists to catch coding mistakes in the render implementation. |
