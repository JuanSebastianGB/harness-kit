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

### Sensor hints

Scan the following signals to detect existing read-only perception tools.
Each match populates `existing_harness.constraints.read_only_tools[]`:

| Signal | Look in | Example match | Confidence |
|---|---|---|---|
| Env-var reference to sensor data | `CLAUDE.md`, `AGENTS.md`, `.env`, `docker-compose.yml` | `TEMPERATURE_API_KEY`, `HUMIDITY_ENDPOINT`, `IO_BUS` | 0.8 |
| Tool/function declared as read-only | `AGENTS.md`, `skills/*.md`, prompt files | description containing "reads", "fetches", "queries", "lists" with no write verbs | 0.7 |
| Sensor capability request | Agent `purpose` or prompt file | "monitor temperature", "poll sensor", "observe metrics" | 0.7 |
| HTTP GET / file-read tool declaration | `.claude/settings.json`, `CLAUDE.md` | `tool: Read`, `tool: glob`, `tool: Grep`, `"http.get"`, `"file.read"` | 0.85 |

### Sandbox hints

Scan for existing action-perimeter constraints. Each match populates
`existing_harness.constraints.sandbox_signals[]`:

| Signal | Look in | Example match | Confidence |
|---|---|---|---|
| Bash exec scope restriction | `CLAUDE.md`, `AGENTS.md`, config files | `allowedCommands`, `blockedCommands`, `denylist`, `exec: none` | 0.8 |
| File-write allowlist | `CLAUDE.md`, `skills/*.md` | `allowedPaths`, `writeScope: ["src/"]`, `"only write to tests/"` | 0.8 |
| Network egress rules | `.claude/settings.json`, `CLAUDE.md` | `networkAccess: none`, `"no internet"`, `egress: deny`, `offline` | 0.85 |
| Approval-gated actions | `AGENTS.md`, prompt files | `requiresApproval`, `"ask before"`, `confirmSteps`, `human-in-the-loop` | 0.75 |

## Target stack

Detectors for the `target_stack` field (language, runtime, framework). Rules are
evaluated in priority order; the first match populates `target_stack`. If multiple
lockfiles contradict, emit a conflict-entry.

| Detector | File(s) / Signal | `target_stack` fields | Confidence |
|---|---|---|---|
| Bun stack | `bun.lock` or `bun.lockb` | language: typescript, runtime: bun | 0.9 |
| Yarn + TypeScript stack | `yarn.lock` + `tsconfig.json` | language: typescript, runtime: node | 0.8 |
| npm + TypeScript stack | `package-lock.json` + `tsconfig.json` | language: typescript, runtime: node | 0.7 |
| Go stack | `go.mod` | language: go, runtime: null | 0.9 |
| Rust stack | `Cargo.toml` | language: rust, runtime: null | 0.9 |
| Python stack | `requirements.txt` or `pyproject.toml` | language: python, runtime: null | 0.8 |
| Ruby stack | `Gemfile` | language: ruby, runtime: null | 0.7 |
| Unknown stack | No lockfile or marker detected | language: unknown, runtime: null | 0.2 |

`target_stack.framework` is copied from `stack.framework` if non-null. The
`target_stack` field is emitted alongside `stack`, not replacing it.

### Target stack issues

| Detector | Trigger | Severity | Description |
|---|---|---|---|
| unable to detect project language | No lockfile or marker found at depth 4 | warn | Cannot determine target language — downstream emit-code cannot select adapters. Verify the project is supported or add a lockfile. |
| ambiguous runtime | Multiple lockfile types detected (e.g. `bun.lock` + `package-lock.json`) | warn | Conflicting runtime signals found. The first-match rule applies but may be incorrect. |
| low_confidence_stack_detection | Final confidence < 0.5 | info | Target stack detection confidence is low. Adapter selection may be unreliable. |
| high_confidence_stack_detected | Final confidence >= 0.8 | info | Target stack detected with high confidence. Adapter selection can proceed. |

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
