---
name: harness-analyze
description: Analyze an existing repository to detect stack, conventions and existing harness. Use when starting a harness-kit run on a project, or when re-running after the repo changed. Produces a deterministic JSON envelope under .harness-kit/. Stack-agnostic — nothing is assumed, only observed in the repo.
---

## When

Activate when the user says "analyze this repo", "start the harness pipeline", or invokes the kit entry point. Also useful when re-running after the repo changed (new manifest, new conventions).

## Inputs

None. The skill reads the repository rooted at the supplied path.

## Steps

1. **Resolve and contain the path.** Normalize to absolute. Reject if no marker file (`.git`, `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `composer.json`, `deno.json`, `bun.lock` (text), `*.csproj`) is found within depth 4. Reject symlink loops. **Do not use binary markers** (e.g. `bun.lockb`); prefer text markers that detectors can parse.
2. **Walk the tree under the denylist.** Skip every glob in
   `references/detectors.md#denylist`. SKILL.md does NOT redeclare the
   denylist; references is the single source of truth.
3. **Detect stack signals.** Per `references/detectors.md`. Map each detector to a confidence value (0.0-1.0).
4. **Detect existing harness.** Look for `AGENTS.md`, `.agents/`, `.claude/`, `skills/`, `agents/` directories.
5. **Detect entry points.** Scripts from `package.json`, `pyproject.toml`, `Makefile`, `justfile`, etc.
6. **Detect conventions.** Formatter (prettier/biome/black/gofmt/rustfmt), linter (eslint/ruff/golangci), test runner.
7. **Record coverage.** `coverage.absolute_paths_checked`, `coverage.evidence_paths`, `coverage.evidence_redacted_paths`.
8. **Compute conflicts.** For each field with >1 inference, build a `conflict-entry` per `references/edge-cases.md#conflicts`. Set `severity: block` when the conflict would change downstream prose (e.g. conflicting language); `warn` for soft preferences; `info` otherwise.
9. **Compute status.** `INSUFFICIENT_EVIDENCE` if `data.stack.languages` is empty or null after confidence threshold; `BLOCKED` if any `conflict-entry.severity == block`; otherwise `OK`.
10. **Write envelope.** `<repo-root>/.harness-kit/analyze.json` per `references/contract.md`.

## Output

`references/output-schema.md` (this file is a pointer, not a copy).

## Stop conditions

Stop and surface to user when:

- path is outside marker-file containment
- status would be `ERROR` or `BLOCKED`
- a secret-like string is detected; redact to `<REDACTED:env:NAME>` and continue
- all detectors return null and minimum-coverage gate fails

## Permissions

Allowed tools: read-only on the supplied path and `<repo>/.harness-kit/`. Never request network or write outside `.harness-kit/`.
