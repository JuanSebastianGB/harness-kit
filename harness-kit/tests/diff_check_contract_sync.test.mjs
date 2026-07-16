#!/usr/bin/env bun
// diff_check_contract_sync.test.mjs
// Ensures all 6 contract files (kit-contract.md + 5 per-stage) agree
// on v0.3.0 and mention sensors/sandbox.
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

test("schema $comment + all 6 contract files agree on v0.3.0", () => {
  // Schema $comment must mention v0.3.0
  expect(SCHEMA["$comment"]).toMatch(/v0\.3\.0/);

  // Root kit-contract.md must mention v0.3.0
  expect(KIT_CONTRACT).toMatch(/0\.3\.0/);

  // Each per-stage contract must mention v0.3.0
  for (const { stage, text } of perStageContracts) {
    expect(text).toMatch(/0\.3\.0/);
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

test("kit_contract_references_code_emission_manifest_schema", () => {
  // THIS TEST MUST FAIL until kit-contract.md lists code-emission-manifest.schema.json
  expect(KIT_CONTRACT).toMatch(/code-emission-manifest/);
});

test("emit_code_contract_references_code_emission_manifest_schema", () => {
  // THIS TEST MUST FAIL until harness-emit-code/references/contract.md exists
  // and references the manifest schema
  let emitContract = null;
  try {
    emitContract = readFileSync(
      join(KIT, "harness-emit-code", "references", "contract.md"),
      "utf8",
    );
  } catch {
    // emit-code stage doesn't exist yet — test fails via expect().not.toBeNull()
  }
  expect(emitContract).not.toBeNull();
  expect(emitContract).toMatch(/code-emission-manifest/);
});
