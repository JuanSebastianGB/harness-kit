#!/usr/bin/env bun
// emit-code-roundtrip.test.mjs
// Tier-1: hand-craft a valid manifest, validate it against the schema,
// check that output file paths are predictable.
//
// ALL cases MUST FAIL before schemas/code-emission-manifest.schema.json exists.
// After T07+T10, all MUST PASS.
//
// Run with: bun test tests/emit-code-roundtrip.test.mjs

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

function mustCompileManifestSchema() {
  assertSchemaExists();
  return compile(
    JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, "utf8")),
  );
}

// Hand-crafted valid manifest for a tool-implementation entry
const VALID_MANIFEST = {
  manifest_version: "0.3.0",
  target_stack: { language: "typescript", package_manager: "bun" },
  files: [
    {
      path: "src/tools/rest-get.ts",
      kind: "tool-implementation",
      intent: "REST GET wrapper for the public API",
      sandbox_inherits_from_propose: true,
      exports: [{ name: "restGet", type: "function" }],
    },
  ],
  constraints_inherited: {
    sensors: ["file.read", "http.get"],
    sandbox: {
      allowed_paths: ["src"],
      denied_commands: ["rm -rf", "sudo"],
      network_access: "read_only",
      requires_approval: [],
    },
  },
};

test("roundtrip_valid_manifest_validates", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompileManifestSchema();
  const r = validate(VALID_MANIFEST);
  expect(r.ok).toBe(true);
});

test("roundtrip_invalid_target_stack_missing_language_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompileManifestSchema();
  const r = validate({
    ...VALID_MANIFEST,
    target_stack: { package_manager: "bun" },
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("language"))).toBe(true);
});

test("roundtrip_path_traversal_in_files_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompileManifestSchema();
  const r = validate({
    ...VALID_MANIFEST,
    files: [
      {
        path: "../../escape.ts",
        kind: "tool-implementation",
        intent: "escape",
        sandbox_inherits_from_propose: false,
        exports: [],
      },
    ],
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("..") || e.includes("escape"))).toBe(true);
});

test("roundtrip_missing_files_array_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompileManifestSchema();
  const { files, ...noFiles } = VALID_MANIFEST;
  const r = validate(noFiles);
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("files"))).toBe(true);
});

test("roundtrip_invalid_files_kind_enum_fails", () => {
  // THIS TEST MUST FAIL until v0.3.0 schemas exist
  const validate = mustCompileManifestSchema();
  const r = validate({
    ...VALID_MANIFEST,
    files: [
      {
        path: "src/hack.ts",
        kind: "eval-script",
        intent: "malicious",
        sandbox_inherits_from_propose: false,
        exports: [],
      },
    ],
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("kind") || e.includes("eval"))).toBe(true);
});
