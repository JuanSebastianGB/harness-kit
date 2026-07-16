#!/usr/bin/env bun
// emit-import-resolve.test.mjs
// Tier-2: after emitting a TS fixture, attempt to dynamically import it
// and check that the exports match what the manifest describes.
//
// ALL cases MUST FAIL because the emit-code stage hasn't emitted any files
// yet (pre-T10). After T10, the emitted module should exist and exports
// must match the manifest's file-entry.exports[] declarations.
//
// Run with: bun test tests/emit-import-resolve.test.mjs

import { test, expect } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";

const KIT = join(import.meta.dir, "..");
// Path where emit-code would write generated files
const EMIT_OUTPUT_DIR = join(KIT, "harness-emit-code", "output");
const EMIT_TOOL_PATH = join(EMIT_OUTPUT_DIR, "tools", "rest-get.ts");

// Expected manifest entry for a tool-implementation file
const ALL_EXPECTED_TOOLS = [
  "tools/rest-get.ts",
  "tools/search.ts",
  "middleware/assert-sandbox.ts",
];

test("emit_code_output_directory_exists", () => {
  // THIS TEST MUST FAIL until emit-code stage creates its output directory
  expect(existsSync(EMIT_OUTPUT_DIR)).toBe(true);
});

const EXPECTED_MANIFEST_ENTRY = {
  path: "tools/rest-get.ts",
  kind: "tool-implementation",
  exports: [{ name: "restGet", type: "function" }],
};

test("emitted_tool_file_exists", () => {
  // THIS TEST MUST FAIL until emit-code stage runs and emits the file
  expect(existsSync(EMIT_TOOL_PATH)).toBe(true);
});

test("emitted_tool_exports_match_manifest", async () => {
  // THIS TEST MUST FAIL until emit-code stage runs and emits the file
  expect(existsSync(EMIT_TOOL_PATH)).toBe(true);

  // Dynamically import the emitted module
  let mod;
  try {
    mod = await import(EMIT_TOOL_PATH);
  } catch (e) {
    // The dynamic import itself will throw before we reach this
    // But we still get a cleaner error through existsSync above
    throw new Error("Emitted module could not be imported: " + e.message);
  }

  // Check that exported functions match manifest declarations
  for (const exp of EXPECTED_MANIFEST_ENTRY.exports) {
    expect(mod).toHaveProperty(exp.name);
    expect(typeof mod[exp.name]).toBe(exp.type === "function" ? "function" : "string");
  }
});
