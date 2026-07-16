# harness-generator

A workspace for designing and shipping **harness-kit** — a 6-stage pipeline that builds AI agent harnesses for any target repo, iteratively and with deterministic validation.

## What's here

| Path | What it is |
|------|------------|
| `harness-kit/` | The shipped product. v0.3.0 — 6 SKILL.md stages that analyze, propose, render, emit code, review, and eval a harness. |
| `prototypes/v030-emit-code/` | Input/output fixtures from prototype runs of the v0.3.0 emit-code pipeline. |
| `AGENTS.md` | Engineering guidelines for AI agents working in this workspace. |

## Quickstart

**Prerequisites:** [bun](https://bun.sh) ≥ 1.3.

```bash
# Enter the kit
cd harness-kit

# Read the contract
cat kit-contract.md

# Run the test suite
bun test            # 60 pass / 0 fail / 1 skipped
```

To use the kit on your own repo:

```bash
# Install the skill into your agent (Claude Code, Cursor, OpenCode, etc.)
# The CLI reads SKILL.md directly from the GitHub repo — no npm publish needed.
npx skills add JuanSebastianGB/harness-kit@v0.3.0   # pin to a tag, or omit for HEAD
```

Then invoke the `harness-kit` skill in your agent with the target repo as the path. Full 6-stage workflow is documented in [`harness-kit/README.md`](harness-kit/README.md).

## Project layout

```
harness-generator/
├── harness-kit/                       # v0.3.0 — shipped product
│   ├── harness-analyze/               # stage 1
│   ├── harness-propose/               # stage 2
│   ├── harness-render-agents-md/      # stage 3
│   ├── harness-emit-code/             # stage 4 (NEW in v0.3.0)
│   ├── harness-review/                # stage 5
│   ├── harness-eval/                  # stage 6
│   ├── schemas/                       # JSON Schemas for every stage envelope
│   ├── tests/                         # 12 test files, strict TDD
│   ├── kit-contract.md                # canonical contract
│   └── CHANGELOG.md
├── prototypes/v030-emit-code/         # v0.3.0 prototype fixtures
└── AGENTS.md                          # AI agent engineering guidelines
```

## Status

| Component | Version | State |
|-----------|---------|-------|
| `harness-kit` | v0.3.0 | Shipped — PR #2 merged, tagged, 60/0/192 tests |
| `prototypes/` | snapshot | Reflects the v0.3.0 emit-code run |
| `AGENTS.md` | active | Engineering guidelines for AI agents |

## Contributing

The shipped kit has its own conventions. PRs to `harness-kit/` must:
1. Add or update `SKILL.md` and/or `references/*.md`
2. Add or extend tests in `harness-kit/tests/` (failing tests first for new behavior)
3. Bump `harness-kit/kit-contract.md` and per-stage `references/contract.md` to the next `contract_version`
4. Add a `harness-kit/CHANGELOG.md` entry above the current `latest`

There is no `CONTRIBUTING.md` yet; PR review is the current gate.

## License

[MIT](./harness-kit/LICENSE) — Copyright (c) 2026 Juan Sebastian Gonzalez.
