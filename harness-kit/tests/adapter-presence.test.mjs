#!/usr/bin/env bun
// adapter-presence.test.mjs
// Tier-1: every references/adapters/*.md exists under the emit-code stage.
// ALL cases MUST FAIL before harness-emit-code/ exists (pre-T10).
// After T10, all MUST PASS.
//
// Run with: bun test tests/adapter-presence.test.mjs

import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const KIT = join(import.meta.dir, "..");
const ADAPTERS_DIR = join(KIT, "harness-emit-code", "references", "adapters");
const TYPESCRIPT_ADAPTER_PATH = join(ADAPTERS_DIR, "typescript.md");

test("typescript_adapter_exists", () => {
  // THIS TEST MUST FAIL until harness-emit-code/references/adapters/ exists
  expect(existsSync(TYPESCRIPT_ADAPTER_PATH)).toBe(true);
});

test("typescript_adapter_has_required_frontmatter", () => {
  // THIS TEST MUST FAIL until typescript.md exists
  expect(existsSync(TYPESCRIPT_ADAPTER_PATH)).toBe(true);
  const text = readFileSync(TYPESCRIPT_ADAPTER_PATH, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  expect(m).not.toBeNull();
  const fm = {};
  for (const line of m[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    fm[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  expect(fm.name).toBe("typescript-adapter");
  expect(fm.target_stack).toBe("typescript");
  expect(fm.applies_when).toBeTruthy();
});

test("adapter_detectors_cross_reference_existing_adapters", () => {
  // THIS TEST MUST FAIL until detectors.md exists and references adapters/
  const DETECTORS_PATH = join(KIT, "harness-emit-code", "references", "detectors.md");
  expect(existsSync(DETECTORS_PATH)).toBe(true);
  const text = readFileSync(DETECTORS_PATH, "utf8");
  const refs = text.match(/references\/adapters\/[a-z]+\.md/g) || [];
  expect(refs.length).toBeGreaterThanOrEqual(1);
  for (const ref of refs) {
    expect(existsSync(join(KIT, "harness-emit-code", ref))).toBe(true);
  }
});
