#!/usr/bin/env bun
// harness-kit CI: mock-LLM pipeline test.
// Run with: bun tests/end-to-end-sim.test.mjs
//
// This test simulates an LLM following the SKILL.md instructions by emitting
// the exact JSON envelopes the SKILL bodies instruct. It validates each
// envelope against its schema and writes the state to .harness-kit/.
// This verifies the *contract* is satisfiable end-to-end — not LLM quality.
//
// Unlike the standalone pipeline tests, this one uses a real temp target
// with a small repo fixture.

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { test, expect } from "bun:test";
import { compile } from "./validator.mjs";
import { readFileSync as rfs } from "fs";

const KIT = join(import.meta.dir, "..");
const SCHEMAS = join(KIT, "schemas");

const schemas = {};
for (const s of ["analyze", "propose", "render", "review", "eval"]) {
  schemas[s] = compile(JSON.parse(rfs(join(SCHEMAS, `${s}.schema.json`), "utf8")));
}

function uuid() { return crypto.randomUUID(); }

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

function prepareTarget() {
  const t = mkdtempSync(join(tmpdir(), "harness-endtoend-"));
  mkdirSync(join(t, ".harness-kit"), { recursive: true });
  mkdirSync(join(t, "src"), { recursive: true });
  writeFileSync(join(t, "package.json"), JSON.stringify({
    name: "harness-endtoend-target", version: "0.0.0",
    scripts: { dev: "bun run src/index.ts", test: "bun test", build: "bun build src/index.ts --outdir dist" },
    devDependencies: { typescript: "^5.4.0", "@types/node": "^20.0.0" }
  }, null, 2));
  writeFileSync(join(t, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
  writeFileSync(join(t, "src", "index.ts"), "export const x = 1;\n");
  return t;
}

let target;

test("full cycle: first run + iteration with regression", () => {
  target = prepareTarget();
  // Simulate harness-analyze SKILL.md steps: scan package.json, tsconfig.json, src/
  const analyze = envelope("analyze", {
    status: "OK",
    stack: { languages: ["typescript"], package_manager: "bun", framework: null },
    entry_points: [
      { name: "dev", command: "bun run src/index.ts" },
      { name: "test", command: "bun test" },
      { name: "build", command: "bun build src/index.ts --outdir dist" },
    ],
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
  expect(schemas.analyze(analyze).ok).toBe(true);
  writeFileSync(join(target, ".harness-kit", "analyze.json"), JSON.stringify(analyze, null, 2));

  // Simulate harness-propose: read analyze.json, emit ts-reviewer
  const propose = envelope("propose", {
    status: "OK",
    agents: [
      { name: "ts-reviewer", purpose: "Review TypeScript files against tsconfig + conventions", tools: ["Read", "Grep", "Glob"], prompt_path: "agents/ts-reviewer.md" },
    ],
    skills: [
      { name: "run-target-explainer", purpose: "Explain what an npm/bun script does", triggers: ["explain run"] },
      { name: "type-coverage", purpose: "Report TypeScript strict coverage gaps", triggers: ["type coverage", "typecheck"] },
    ],
    rejected_proposals: [],
    notes: "rules matched: ts + single-repo → ts-reviewer; entry_points > 1 → run-target-explainer; typescript strict → type-coverage",
  }, { previous_run_id: analyze.run_id });
  expect(schemas.propose(propose).ok).toBe(true);
  writeFileSync(join(target, ".harness-kit", "propose.json"), JSON.stringify(propose, null, 2));

  // Simulate harness-render-agents-md: emit AGENTS.md + per-agent files
  const render = envelope("render", {
    status: "OK",
    target_file: "AGENTS.md",
    files: [
      { path: "AGENTS.md", action: "created", sha256_preview: "a1b2c3d4e5f6" },
      { path: "agents/ts-reviewer.md", action: "created", sha256_preview: "b2c3d4e5f6a1" },
    ],
    collision_policy: "refuse",
  });
  expect(schemas.render(render).ok).toBe(true);
  writeFileSync(join(target, ".harness-kit", "render.json"), JSON.stringify(render, null, 2));

  // Simulate harness-review: zero issues, verdict approve
  const review = envelope("review", {
    status: "OK",
    verdict: "approve",
    issues: [],
    severity_counts: { blocker: 0, critical: 0, warning: 0, suggestion: 0 },
    reviewed_file: "AGENTS.md",
  });
  expect(schemas.review(review).ok).toBe(true);
  writeFileSync(join(target, ".harness-kit", "review.json"), JSON.stringify(review, null, 2));

  // Simulate harness-eval: score 1.0, no prior run
  const evalOutput = envelope("eval", {
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
  expect(schemas.eval(evalOutput).ok).toBe(true);
  writeFileSync(join(target, ".harness-kit", "eval.json"), JSON.stringify(evalOutput, null, 2));

  // Verify all 5 files exist
  for (const stage of ["analyze", "propose", "render", "review", "eval"]) {
    const f = join(target, ".harness-kit", `${stage}.json`);
    const j = JSON.parse(readFileSync(f, "utf8"));
    expect(j.contract_version).toBe("0.1.0");
    expect(j.stage).toBe(stage);
  }
  const prevEval = JSON.parse(readFileSync(join(target, ".harness-kit", "eval.json"), "utf8"));

  // Simulate re-running propose after eval. The eval shows all-OK, so no
  // new proposals. But previous_run_id is carried.
  const propose2data = JSON.parse(readFileSync(join(target, ".harness-kit", "propose.json"), "utf8")).data;
  propose2data.notes = "re-run; no regressions detected";
  const propose2 = envelope("propose", propose2data, { previous_run_id: prevEval.run_id });
  expect(schemas.propose(propose2).ok).toBe(true);
  expect(propose2.previous_run_id).toBe(prevEval.run_id);

  // Simulate a regression: second eval shows a regression
  const eval2 = envelope("eval", {
    status: "OK",
    suite: "v0.1.0",
    golden_suite_score: 0.8,
    scores: prevEval.data.scores.map((c, i) => i === 0 ? { ...c, score: 0.0, notes: "regressed since last run" } : c),
    diff_from_previous: {
      previous_run_id: prevEval.run_id,
      golden_suite_score_delta: -0.2,
      regressions: ["agents-md-exists"],
      improvements: [],
    },
  }, { previous_run_id: prevEval.run_id });
  expect(schemas.eval(eval2).ok).toBe(true);
  expect(eval2.data.diff_from_previous.golden_suite_score_delta).toBeLessThan(0);
  expect(eval2.data.diff_from_previous.regressions).toContain("agents-md-exists");

  // Clean up target dir
  rmSync(target, { recursive: true, force: true });
});
