# harness-analyze: detectors

Each detector lists the file(s) to read, the field it populates, and the
confidence floor. Confidence defaults to 0.8 if not stated.

## Stack

| Detector | File | Field | Confidence |
|---|---|---|---|
| Language: TypeScript | `package.json` | `stack.languages[] += "typescript"` | 0.9 |
| Language: JavaScript | `package.json` (no typescript dep) | `stack.languages[] += "javascript"` | 0.7 |
| Language: Python | `pyproject.toml`, `requirements.txt`, `setup.py` | `stack.languages[] += "python"` | 0.9 |
| Language: Rust | `Cargo.toml` | `stack.languages[] += "rust"` | 0.9 |
| Language: Go | `go.mod` | `stack.languages[] += "go"` | 0.9 |
| Package manager: pnpm | `pnpm-lock.yaml` | `stack.package_manager = "pnpm"` | 0.95 |
| Package manager: bun | `bun.lock` | `stack.package_manager = "bun"` | 0.95 |
| Package manager: npm | `package-lock.json` | `stack.package_manager = "npm"` | 0.95 |
| Package manager: yarn | `yarn.lock` | `stack.package_manager = "yarn"` | 0.95 |
| Package manager: poetry | `poetry.lock` | `stack.package_manager = "poetry"` | 0.95 |
| Package manager: uv | `uv.lock` | `stack.package_manager = "uv"` | 0.95 |
| Framework: Next.js | `package.json.dependencies["next"]` | `stack.framework = "next"` | 0.85 |
| Framework: React | `package.json.dependencies["react"]` | `stack.framework = "react"` | 0.85 |
| Framework: FastAPI | `pyproject.toml` or imports | `stack.framework = "fastapi"` | 0.7 |

## Existing harness

| Detector | File / Dir | Field |
|---|---|---|
| `AGENTS.md` | `AGENTS.md` at root | `existing_harness.agents_md = true` |
| Project skills | `.agents/skills/`, `.claude/skills/`, `skills/` | `existing_harness.skills[]` |
| Project agents | `.agents/agents/`, `agents/*.md` | `existing_harness.agents[]` |

## Conventions

| Detector | File | Field |
|---|---|---|
| Prettier | `.prettierrc*`, `"prettier"` key in package.json | `conventions.formatter = "prettier"` |
| Biome | `biome.json`, `biome.jsonc` | `conventions.formatter = "biome"` |
| Ruff | `ruff.toml`, `[tool.ruff]` in pyproject | `conventions.linter = "ruff"` |
| ESLint | `.eslintrc*`, `"eslintConfig"` key in package.json | `conventions.linter = "eslint"` |
| vitest/bun test/jest | `vitest.config.ts`, `bun.lock` w/ test script | `conventions.test_runner` |
| cargo test | `Cargo.toml` w/ `[lib]` | `conventions.test_runner = "cargo-test"` |
| pytest | `pytest.ini`, `pyproject.toml [tool.pytest]` | `conventions.test_runner = "pytest"` |
| go test | `go.mod` present | `conventions.test_runner = "go-test"` |

## Entry points

Read `package.json.scripts`, `pyproject.toml [project.scripts]`, `Makefile`
targets, `justfile` recipes. Emit `entry_points[]` with `{name, command}`.

## Denylist

Path globs that are NOT read at any depth. The leading `**` is REQUIRED
so depth-N matches are honored; `*.pem` (no leading `**`) would only match
the repo root and miss nested files.

```
**/.git/
**/node_modules/
**/vendor/
**/dist/
**/build/
**/.next/
**/.nuxt/
**/target/
**/.env
**/.env.*
**/secrets/
**/*.pem
**/*.key
**/*.crt
**/*.p12
```

Use these literals as-is; SKILL.md does NOT redeclare the list.

## Secret scrubbing

If a file under inspection contains a string matching one of:

- `(?i)(api[_-]?key|token|secret|password|bearer)[\"'\\s:=]+[\\w\\-\\.~+/]+=*`
- high-entropy `^[A-Za-z0-9+/]{40,}={0,2}$`
- `-----BEGIN .* PRIVATE KEY-----`

Replace the value with `<REDACTED:env:NAME>` (where `NAME` is the matched key
when present) in any output. Never include raw secret bytes.
