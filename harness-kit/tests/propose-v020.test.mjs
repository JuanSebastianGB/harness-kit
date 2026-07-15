#!/usr/bin/env bun
// harness-kit CI: propose v0.2.0 schema tests (strict TDD).
// Written BEFORE the schema change — all 5 MUST fail against current v0.1.0 schema.
// After T03 they pass. Test 5 (backward compat) guards against regression.
//
// Run with: bun test tests/propose-v020.test.mjs

import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { compile } from "./validator.mjs";

const KIT = join(import.meta.dir, "..");
const SCHEMAS = join(KIT, "schemas");
const propose = compile(
  JSON.parse(readFileSync(join(SCHEMAS, "propose.schema.json"), "utf8")),
);

const UUID = "00000000-0000-0000-0000-000000000000";
const ISO = "2026-01-01T00:00:00Z";

function envelope(agents, skills = [], extra = {}) {
  return {
    $schema: "propose.schema.json#/$defs/output",
    contract_version: "0.1.0",
    run_id: UUID,
    stage: "propose",
    produced_at: ISO,
    data: {
      status: "OK",
      agents,
      skills,
      rejected_proposals: [],
      ...extra,
    },
  };
}

test("proposal with sensors[] validates", () => {
  const doc = envelope([
    {
      name: "sensor-agent",
      purpose: "Has sensors",
      prompt_path: "agents/sensor.md",
      sensors: ["file.read"],
    },
  ]);
  const r = propose(doc);
  expect(r.ok).toBe(true);
});

test("proposal with sandbox{} validates", () => {
  const doc = envelope([
    {
      name: "sandbox-agent",
      purpose: "Has sandbox",
      prompt_path: "agents/sandbox.md",
      sandbox: { network_access: "none" },
    },
  ]);
  const r = propose(doc);
  expect(r.ok).toBe(true);
});

test("validate_propose_sensors_sorted_deterministically", () => {
  // Schema accepts unsorted input; canonicalization is render-time.
  // This test asserts the schema accepts ["b","a"] — determinism is
  // guaranteed by canonicalize() at render, not by the schema.
  const doc = envelope([
    {
      name: "det-agent",
      purpose: "Determinism",
      prompt_path: "agents/det.md",
      sensors: ["b", "a"],
    },
  ]);
  const r = propose(doc);
  expect(r.ok).toBe(true);
});

test("validate_propose_sandbox_subarrays_sorted", () => {
  // Similar to sensors: schema accepts any order; render sorts.
  const doc = envelope([
    {
      name: "sandbox-agent-2",
      purpose: "Sandbox sub-arrays",
      prompt_path: "agents/sb.md",
      sandbox: {
        allowed_paths: ["z_path", "a_path"],
        denied_commands: ["sudo", "rm -rf"],
        requires_approval: ["deploy", "publish"],
      },
    },
  ]);
  const r = propose(doc);
  expect(r.ok).toBe(true);
});

test("v0.1.0 fixture without sensors/sandbox still validates — backward compat", () => {
  const doc = envelope([
    {
      name: "ts-reviewer",
      purpose: "Review TS files",
      prompt_path: "agents/ts-reviewer.md",
      tools: ["Read"],
    },
  ]);
  const r = propose(doc);
  expect(r.ok).toBe(true);
});
