#!/usr/bin/env bun
// manifest-schema.test.mjs
// Tier-1: validates code-emission-manifest.schema.json.
// ALL cases MUST FAIL because the schema doesn't exist yet (pre-T07).
// After T07, all MUST PASS.
//
// Run with: bun test tests/manifest-schema.test.mjs

import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { compile } from "./validator.mjs";

const KIT = join(import.meta.dir, "..");
const SCHEMAS = join(KIT, "schemas");
const MANIFEST_SCHEMA_PATH = join(SCHEMAS, "code-emission-manifest.schema.json");

// THIS TEST MUST FAIL until v0.3.0 schemas exist
function assertSchemaExists() {
  expect(existsSync(MANIFEST_SCHEMA_PATH)).toBe(true);
}

function mustCompile() {
  assertSchemaExists();
  return compile(
    JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, "utf8")),
  );
}

const UUID = "00000000-0000-0000-0000-000000000000";
const ISO = "2026-01-01T00:00:00Z";

test("manifest_minimal_valid_passes", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompile();
  const r = validate({
    manifest_version: "0.3.0",
    target_stack: { language: "unknown" },
    files: [],
    constraints_inherited: {},
  });
  expect(r.ok).toBe(true);
});

test("manifest_missing_target_stack_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompile();
  const r = validate({
    manifest_version: "0.3.0",
    files: [],
    constraints_inherited: {},
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("target_stack"))).toBe(true);
});

test("manifest_invalid_files_kind_enum_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompile();
  const r = validate({
    manifest_version: "0.3.0",
    target_stack: { language: "typescript" },
    files: [
      {
        path: "src/bad.ts",
        kind: "invalid-kind",
        intent: "x",
        sandbox_inherits_from_propose: false,
        exports: [],
      },
    ],
    constraints_inherited: {},
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("kind") || e.includes("invalid"))).toBe(true);
});

test("manifest_v020_fixture_backward_compat_passes", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  // v0.2.0 fixtures without manifest fields should still validate
  const validate = mustCompile();
  const r = validate({
    contract_version: "0.2.0",
    run_id: UUID,
    stage: "render",
    produced_at: ISO,
    data: {
      status: "OK",
      target_file: "AGENTS.md",
      files: [
        { path: "AGENTS.md", action: "created", sha256_preview: "abcdef0123456789" },
      ],
      collision_policy: "refuse",
    },
  });
  expect(r.ok).toBe(true);
});

test("manifest_missing_manifest_version_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompile();
  const r = validate({
    target_stack: { language: "unknown" },
    files: [],
    constraints_inherited: {},
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("manifest_version"))).toBe(true);
});

test("manifest_constraints_inherited_extra_props_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompile();
  const r = validate({
    manifest_version: "0.3.0",
    target_stack: { language: "unknown" },
    files: [],
    constraints_inherited: {
      sensors: [],
      unknown_field: "should be rejected",
    },
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("unknown_field") || e.includes("additionalProperties"))).toBe(true);
});

test("manifest_sandbox_inheritance_consistent", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  // If sandbox_inherits_from_propose is true, constraints_inherited.sandbox
  // must mirror the propose schema shape (allowed_paths, denied_commands, etc.)
  const validate = mustCompile();
  const r = validate({
    manifest_version: "0.3.0",
    target_stack: { language: "typescript", package_manager: "bun" },
    files: [
      {
        path: "src/tool.ts",
        kind: "tool-implementation",
        intent: "test tool",
        sandbox_inherits_from_propose: true,
        exports: [{ name: "tool", type: "function" }],
      },
    ],
    constraints_inherited: {
      sensors: ["file.read", "glob.list"],
      sandbox: {
        allowed_paths: ["src", "tests"],
        denied_commands: ["rm -rf", "sudo"],
        network_access: "none",
        requires_approval: ["deploy"],
      },
    },
  });
  expect(r.ok).toBe(true);
  // When inheriting, the sandbox should have all 4 propose sub-fields
  expect(r.errors.length).toBe(0);
});
