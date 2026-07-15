#!/usr/bin/env bun
// diff_check_contract_sync.test.mjs
// Ensures all 6 contract files (kit-contract.md + 5 per-stage) agree
// on v0.2.0 and mention sensors/sandbox. Written BEFORE the contract
// update — both MUST fail against current v0.1.0.
//
// Run with: bun test tests/diff_check_contract_sync.test.mjs

import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const KIT = join(import.meta.dir, "..");

const SCHEMA = JSON.parse(
  readFileSync(join(KIT, "schemas", "propose.schema.json"), "utf8"),
);
const KIT_CONTRACT = readFileSync(join(KIT, "kit-contract.md"), "utf8");

const STAGES = [
  "harness-analyze",
  "harness-propose",
  "harness-render-agents-md",
  "harness-review",
  "harness-eval",
];

const perStageContracts = STAGES.map((stage) => ({
  stage,
  text: readFileSync(join(KIT, stage, "references", "contract.md"), "utf8"),
}));

test("schema $comment + all 6 contract files agree on v0.2.0", () => {
  // Schema $comment must mention v0.2.0
  expect(SCHEMA["$comment"]).toMatch(/v0\.2\.0/);

  // Root kit-contract.md must mention v0.2.0
  expect(KIT_CONTRACT).toMatch(/0\.2\.0/);

  // Each per-stage contract must mention v0.2.0
  for (const { stage, text } of perStageContracts) {
    expect(text).toMatch(/0\.2\.0/);
  }
});

test("all 6 contract files mention sensors/sandbox — no drift", () => {
  // Root kit-contract.md must mention both sensors and sandbox
  expect(KIT_CONTRACT).toMatch(/sensors/i);
  expect(KIT_CONTRACT).toMatch(/sandbox/i);

  // Each per-stage contract must mention at least one of sensors/sandbox
  for (const { stage, text } of perStageContracts) {
    const mentions =
      /sensors/i.test(text) || /sandbox/i.test(text);
    expect(mentions).toBe(true);
  }
});
