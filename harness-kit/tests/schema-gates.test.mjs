#!/usr/bin/env bun
// harness-kit CI: schema gate tests.
// Run with: bun tests/schema-gates.test.mjs
//
// Each case should be REJECTED by the schema it points at. If any case
// passes, the gate is broken.

import { readFileSync } from "fs";
import { join } from "path";
import { test, expect } from "bun:test";
import { compile } from "./validator.mjs";

const KIT = join(import.meta.dir, "..");
const SCHEMAS = join(KIT, "schemas");

const compiled = {};
for (const s of ["analyze", "propose", "render", "review", "eval"]) {
  compiled[s] = compile(JSON.parse(readFileSync(join(SCHEMAS, `${s}.schema.json`), "utf8")));
}

const UUID = "00000000-0000-0000-0000-000000000000";
const ISO = "2026-01-01T00:00:00Z";

const cases = [
  {
    name: "extra `allowed_tools` is rejected",
    stage: "propose",
    doc: {
      $schema: "propose.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "propose",
      produced_at: ISO,
      data: {
        status: "OK",
        agents: [{ name: "x", purpose: "y", allowed_tools: ["Read"], prompt_path: "agents/x.md" }],
        skills: [],
        rejected_proposals: [],
      },
    },
  },
  {
    name: "invalid status enum",
    stage: "analyze",
    doc: {
      $schema: "analyze.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "analyze",
      produced_at: ISO,
      data: {
        status: "MAYBE",
        stack: { languages: [], package_manager: null, framework: null },
        entry_points: [],
        existing_harness: { agents_md: false, skills: [], agents: [] },
        conventions: { formatter: null, linter: null, test_runner: null },
        shape: "unknown",
        conflicts: [],
        coverage: { evidence_paths: [], evidence_redacted_paths: [], absolute_paths_checked: [] },
      },
    },
  },
  {
    name: "prompt_path with .. is rejected",
    stage: "propose",
    doc: {
      $schema: "propose.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "propose",
      produced_at: ISO,
      data: {
        status: "OK",
        agents: [{ name: "x", purpose: "y", tools: ["Read"], prompt_path: "../escape/x.md" }],
        skills: [],
        rejected_proposals: [],
      },
    },
  },
  {
    name: "absolute prompt_path is rejected",
    stage: "propose",
    doc: {
      $schema: "propose.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "propose",
      produced_at: ISO,
      data: {
        status: "OK",
        agents: [{ name: "x", purpose: "y", tools: ["Read"], prompt_path: "/etc/passwd" }],
        skills: [],
        rejected_proposals: [],
      },
    },
  },
  {
    name: "stage const mismatch rejected",
    stage: "review",
    doc: {
      $schema: "review.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "propose",
      produced_at: ISO,
      data: {
        status: "OK",
        verdict: "approve",
        issues: [],
        severity_counts: { blocker: 0, critical: 0, warning: 0, suggestion: 0 },
        reviewed_file: "AGENTS.md",
      },
    },
  },
  {
    name: "missing run_id rejected",
    stage: "eval",
    doc: {
      $schema: "eval.schema.json#/$defs/output",
      contract_version: "0.1.0",
      stage: "eval",
      produced_at: ISO,
      data: { status: "OK", suite: "v0.1.0", golden_suite_score: 1.0, scores: [] },
    },
  },
  {
    name: "render sha256_preview too long",
    stage: "render",
    doc: {
      $schema: "render.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "render",
      produced_at: ISO,
      data: {
        status: "OK",
        target_file: "AGENTS.md",
        files: [{ path: "AGENTS.md", action: "created", sha256_preview: "abcdef0123456789abcdef0123" }],
        collision_policy: "refuse",
      },
    },
  },
  {
    name: "review severity uppercase rejected (enum is lowercase)",
    stage: "review",
    doc: {
      $schema: "review.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "review",
      produced_at: ISO,
      data: {
        status: "OK",
        verdict: "approve",
        issues: [{ id: "X-1", severity: "BLOCKER", evidence: "e", fix_hint: "f" }],
        severity_counts: { blocker: 0, critical: 0, warning: 0, suggestion: 0 },
      },
    },
  },
  {
    name: "valid analyze envelope accepted (positive control)",
    stage: "analyze",
    expectOk: true,
    doc: {
      $schema: "analyze.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "analyze",
      produced_at: ISO,
      data: {
        status: "OK",
        stack: { languages: ["typescript"], package_manager: "bun", framework: null },
        entry_points: [{ name: "dev", command: "bun run dev" }],
        existing_harness: { agents_md: false, skills: [], agents: [] },
        conventions: { formatter: null, linter: null, test_runner: null },
        shape: "single",
        conflicts: [],
        coverage: { evidence_paths: [], evidence_redacted_paths: [], absolute_paths_checked: [] },
      },
    },
  },
  {
    name: "valid propose envelope with previous_run_id accepted (positive control)",
    stage: "propose",
    expectOk: true,
    doc: {
      $schema: "propose.schema.json#/$defs/output",
      contract_version: "0.1.0",
      run_id: UUID,
      stage: "propose",
      produced_at: ISO,
      previous_run_id: UUID,
      data: {
        status: "OK",
        agents: [{ name: "ts-reviewer", purpose: "Review TS files", tools: ["Read"], prompt_path: "agents/ts-reviewer.md" }],
        skills: [{ name: "bootstrap", purpose: "Bootstrap agent", triggers: ["new project"] }],
        rejected_proposals: [],
      },
    },
  },
];

for (const c of cases) {
  test(c.name, () => {
    const r = compiled[c.stage](c.doc);
    if (c.expectOk) {
      expect(r.ok).toBe(true);
    } else {
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("schema accepted a payload it should have rejected");
    }
  });
}
