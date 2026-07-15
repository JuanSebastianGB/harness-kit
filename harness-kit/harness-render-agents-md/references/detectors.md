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
