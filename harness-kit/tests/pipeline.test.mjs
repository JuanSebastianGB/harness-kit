#!/usr/bin/env bun
// harness-kit CI: end-to-end pipeline simulator + schema validation.
// Run with: bun tests/pipeline.test.mjs
//
// Each test owns its own temp dir (bun:test runs tests concurrently).

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { test, expect } from "bun:test";
import { compile } from "./validator.mjs";

const KIT = join(import.meta.dir, "..");
const SCHEMAS = join(KIT, "schemas");

const schemas = {};
for (const s of ["analyze", "propose", "render", "review", "eval"]) {
  schemas[s] = compile(JSON.parse(readFileSync(join(SCHEMAS, `${s}.schema.json`), "utf8")));
}

function uuid() {
  return crypto.randomUUID();
}

function envelope(stage, data, opts = {}) {
  const env = {
    $schema: `${stage}.schema.json#/$defs/output`,
    contract_version: "0.1.0",
    run_id: uuid(),
    stage,
    produced_at: new Date().toISOString(),
    data,
  };
  if (opts.previous_run_id) env.previous_run_id = opts.previous_run_id;
  return env;
}

function freshTarget() {
  const t = mkdtempSync(join(tmpdir(), "harness-kit-target-"));
  mkdirSync(join(t, ".harness-kit"), { recursive: true });
  writeFileSync(
    join(t, "package.json"),
    JSON.stringify({ name: "ci-target", version: "0.0.0", scripts: { dev: "bun run src/index.ts", test: "bun test" } }, null, 2),
  );
  writeFileSync(join(t, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
  mkdirSync(join(t, "src"), { recursive: true });
  writeFileSync(join(t, "src", "index.ts"), "export const x = 1;\n");
  return t;
}

function writeState(target, stage, body) {
  writeFileSync(join(target, ".harness-kit", `${stage}.json`), JSON.stringify(body, null, 2));
}

test("analyze detects typescript from package.json", () => {
  const target = freshTarget();
  try {
    const a = envelope("analyze", {
      status: "OK",
      stack: { languages: ["typescript"], package_manager: "bun", framework: null },
      entry_points: [{ name: "dev", command: "bun run src/index.ts" }],
      existing_harness: { agents_md: false, skills: [], agents: [] },
      conventions: { formatter: null, linter: null, test_runner: "bun test" },
      shape: "single",
      conflicts: [],
      coverage: {
        evidence_paths: ["package.json", "tsconfig.json", "src/index.ts"],
        evidence_redacted_paths: [],
        absolute_paths_checked: [target, join(target, "src")],
      },
    });
    expect(schemas.analyze(a).ok).toBe(true);
    writeState(target, "analyze", a);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("propose picks ts-reviewer + run-target-explainer, sets previous_run_id", () => {
  const target = freshTarget();
  try {
    const a = envelope("analyze", {
      status: "OK",
      stack: { languages: ["typescript"], package_manager: "bun", framework: null },
      entry_points: [{ name: "dev", command: "bun run src/index.ts" }],
      existing_harness: { agents_md: false, skills: [], agents: [] },
      conventions: { formatter: null, linter: null, test_runner: "bun test" },
      shape: "single",
      conflicts: [],
      coverage: { evidence_paths: [], evidence_redacted_paths: [], absolute_paths_checked: [] },
    });
    writeState(target, "analyze", a);
    const p = envelope(
      "propose",
      {
        status: "OK",
        agents: [
          {
            name: "ts-reviewer",
            purpose: "Review TypeScript files against tsconfig + project conventions",
            tools: ["Read", "Grep", "Glob"],
            prompt_path: "agents/ts-reviewer.md",
          },
        ],
        skills: [
          {
            name: "run-target-explainer",
            purpose: "Explain what an npm/bun script does before running it",
            triggers: ["explain run"],
          },
        ],
        rejected_proposals: [],
      },
      { previous_run_id: a.run_id },
    );
    expect(schemas.propose(p).ok).toBe(true);
    expect(p.previous_run_id).toBe(a.run_id);
    writeState(target, "propose", p);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("render applies refuse collision policy by default", () => {
  const target = freshTarget();
  try {
    const r = envelope("render", {
      status: "OK",
      target_file: "AGENTS.md",
      files: [
        { path: "AGENTS.md", action: "created", sha256_preview: "abcdef0123456789" },
        { path: "agents/ts-reviewer.md", action: "created", sha256_preview: "fedcba9876543210" },
      ],
      collision_policy: "refuse",
    });
    expect(schemas.render(r).ok).toBe(true);
    expect(r.data.collision_policy).toBe("refuse");
    writeState(target, "render", r);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("review verdict approve with zero issues", () => {
  const rv = envelope("review", {
    status: "OK",
    verdict: "approve",
    issues: [],
    severity_counts: { blocker: 0, critical: 0, warning: 0, suggestion: 0 },
    reviewed_file: "AGENTS.md",
  });
  expect(schemas.review(rv).ok).toBe(true);
  expect(rv.data.verdict).toBe("approve");
  expect(rv.data.severity_counts.blocker).toBe(0);
});

test("eval golden suite v0.1.0 scores 1.0 across all 5 cases", () => {
  const e = envelope("eval", {
    status: "OK",
    suite: "v0.1.0",
    golden_suite_score: 1.0,
    scores: [
      { case: "agents-md-exists", score: 1.0, max: 1 },
      { case: "covers-detected-conventions", score: 1.0, max: 1 },
      { case: "portable-frontmatter", score: 1.0, max: 1 },
      { case: "agent-files-exist", score: 1.0, max: 1 },
      { case: "skill-files-exist", score: 1.0, max: 1 },
    ],
  });
  expect(schemas.eval(e).ok).toBe(true);
  expect(e.data.suite).toBe("v0.1.0");
  expect(e.data.scores).toHaveLength(5);
  expect(e.data.golden_suite_score).toBe(1.0);
});

test("loop-back: second eval populates diff_from_previous and previous_run_id", () => {
  const first = envelope("eval", {
    status: "OK",
    suite: "v0.1.0",
    golden_suite_score: 1.0,
    scores: [{ case: "agents-md-exists", score: 1.0, max: 1 }],
  });
  const second = envelope(
    "eval",
    {
      status: "OK",
      suite: "v0.1.0",
      golden_suite_score: 1.0,
      scores: first.data.scores,
      diff_from_previous: {
        previous_run_id: first.run_id,
        golden_suite_score_delta: 0.0,
        regressions: [],
        improvements: [],
      },
    },
    { previous_run_id: first.run_id },
  );
  expect(schemas.eval(second).ok).toBe(true);
  expect(second.data.diff_from_previous.previous_run_id).toBe(first.run_id);
  expect(second.previous_run_id).toBe(first.run_id);
});

test("envelope fields (contract_version, stage, run_id) are valid UUIDs and match stage", () => {
  for (const stage of ["analyze", "propose", "render", "review", "eval"]) {
    const j = envelope(stage, { placeholder: true });
    expect(j.contract_version).toBe("0.1.0");
    expect(j.stage).toBe(stage);
    expect(j.run_id).toMatch(/^[0-9a-f-]{36}$/);
  }
});
