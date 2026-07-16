# Changelog

## [0.3.0] — 2026-07-15

### INCOMPATIBLE CHANGES
- None — manifest is optional, v0.2.0 fixtures without it remain valid

### Migration
- None — no breaking changes

### Added
- `harness-emit-code/` — 6th pipeline stage for executable code generation
  - `SKILL.md` — orchestrator prompt with dispatch logic and validation tiers
  - `references/contract.md` — stage contract with inputs, outputs, backward compat
  - `references/detectors.md` — 6 failure detection patterns
  - `references/edge-cases.md` — 10 edge cases with handling guidance
  - `references/adapters/typescript.md` — TypeScript adapter with assertSandbox pattern
- `schemas/code-emission-manifest.schema.json` — JSON Schema for emit-code manifest
- `harness-analyze/` — target_stack detection (language, runtime, framework, confidence)
- `harness-render-agents-md/` — manifest.json emission alongside AGENTS.md
- `harness-review/` — emit-code review lens (warnings only, never gates)
- `harness-eval/` — Tier-1 (surface) and Tier-2 (compile) eval for emitted code

### Changed
- Pipeline: 5-stage → 6-stage (analyze→propose→render→emit-code→review→eval)
- `kit-contract.md`: full v0.3.0 sync — §emit-code, §Adapter System, §Manifest expanded
- All 6 per-stage `references/contract.md`: version bumped to 0.3.0, pipeline diagrams updated

### Added tests
- `tests/manifest-schema.test.mjs` — 7 tests: manifest validation, backward compat
- `tests/emit-code-roundtrip.test.mjs` — 5 tests: manifest roundtrip, path traversal
- `tests/adapter-presence.test.mjs` — 3 tests: adapter file existence, frontmatter
- `tests/tsc-no-emit.test.mjs` — 2 tests: inline assertSandbox fixture, tsc compile gate
- `tests/emit-import-resolve.test.mjs` — 3 tests: output directory, file existence, import resolve
- `tests/diff_check_contract_sync.test.mjs` — +2 tests: schema ref in contracts

## 0.2.0 — sensors and sandbox

### INCOMPATIBLE CHANGES

- `propose.schema.json` adds optional `sensors[]` and `sandbox{}` to
  `agent-proposal`.
- Old v0.1.0 kits without these fields still validate (both optional).
- Downstream users who want the new behavior MUST bump their kit pin to
  `@v0.2.0` (or `@latest`).
- The `network_access` field is now a strict enum:
  `none | read_only | full`. Free-form strings are no longer accepted.

### Migration

**Before (v0.1.0 agent):**
```json
{
  "name": "ts-reviewer",
  "purpose": "Reviews TypeScript files for style and correctness",
  "prompt_path": "agents/ts-reviewer.md",
  "tools": ["Read", "Glob", "Grep"]
}
```

**After (v0.2.0 agent, same identity, sensors/sandbox added):**
```json
{
  "name": "ts-reviewer",
  "purpose": "Reviews TypeScript files for style and correctness",
  "prompt_path": "agents/ts-reviewer.md",
  "tools": ["Read", "Glob", "Grep"],
  "sensors": ["file.read", "glob.list", "grep.regex"],
  "sandbox": {
    "allowed_paths": ["src/", "tests/"],
    "denied_commands": ["rm -rf", "sudo"],
    "network_access": "none",
    "requires_approval": ["package.publish"]
  }
}
```

### Added

- Optional `sensors[]` and `sandbox{}` on `agent-proposal`.
- `## Sensors & Sandbox` section in rendered AGENTS.md when fields are
  non-empty.
- `severity: "warning"` review rules for missing sandbox on write-capable
  agents and insufficient sensors.
- Golden-suite sandbox-respect + determinism cases in `harness-eval`.

### Added tests

- 5 tests in `tests/propose-v020.test.mjs` (see Spec 1).
- 2 tests in `tests/diff_check_contract_sync.test.mjs` (see Spec 3).

## 0.1.0 — initial

- 6 SKILL.md files: `harness-kit` (orchestrator) + `harness-analyze`,
  `harness-propose`, `harness-render-agents-md`, `harness-review`,
  `harness-eval`
- 5 JSON Schemas under `schemas/` (one per stage)
- Contract documented in `kit-contract.md`
- Reference docs (`detectors.md`, `output-schema.md`, `edge-cases.md`)
  per skill
- Golden suite for `harness-eval`
- Collision policy: `refuse` default for `harness-render-agents-md`
