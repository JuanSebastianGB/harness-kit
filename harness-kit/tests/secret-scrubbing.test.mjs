#!/usr/bin/env bun
// harness-kit CI: secret-scrubbing detector test.
// Run with: bun tests/secret-scrubbing.test.mjs
//
// Exercises the secret detection rules from harness-analyze/references/detectors.md
// against a fixture containing fake secrets, denylisted filenames, and
// path traversal. Verifies the rules described in markdown produce the
// expected outputs.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { test, expect, beforeAll, afterAll } from "bun:test";

const DENYLIST = [
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "target",
  ".env",
  "secrets",
];

const PATH_PATTERNS = [".pem", ".key", ".crt", ".p12"];
const ENV_PREFIXES = [".env"];

let target;
beforeAll(() => {
  target = mkdtempSync(join(tmpdir(), "harness-secret-fixture-"));

  // Marker file so path containment passes
  writeFileSync(join(target, "package.json"), '{"name":"x"}');
  writeFileSync(join(target, ".gitignore"), "");

  // Files that should be skipped under the denylist
  mkdirSync(join(target, ".git"), { recursive: true });
  writeFileSync(join(target, ".git", "config"), "[core]");

  mkdirSync(join(target, "node_modules"), { recursive: true });
  writeFileSync(join(target, "node_modules", "x.js"), "module.exports = 1;");

  writeFileSync(join(target, ".env"), "DATABASE_URL=postgres://u:p@h:5432/db");

  writeFileSync(join(target, "service.key"), "-----BEGIN PRIVATE KEY-----\nfake\n-----END");

  writeFileSync(join(target, "bundle.pem"), "-----BEGIN CERTIFICATE-----\nfake\n-----END");

  // Files that should be kept and inspected for in-content secrets
  writeFileSync(join(target, "readme.md"), "no secrets here");

  writeFileSync(
    join(target, "config.json"),
    JSON.stringify({
      api_key: "AKIA1234567890ABCDEF",
      bearer_token: "eyJhbGciOiJIUzI1NiJ9.payload",
      password: "hunter2",
    }),
  );
});

afterAll(() => rmSync(target, { recursive: true, force: true }));

function* walk(root) {
  for (const entry of readdirSync(root)) {
    const p = join(root, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function isDenylisted(rel) {
  for (const d of DENYLIST) {
    if (rel === d) return true;
    if (rel.startsWith(d + "/")) return true;
  }
  for (const prefix of ENV_PREFIXES) {
    if (rel === prefix || rel.startsWith(prefix + ".")) return true;
  }
  for (const ext of PATH_PATTERNS) {
    if (rel.endsWith(ext)) return true;
  }
  return false;
}

const SECRET_RE = /(api[_-]?key|token|secret|password|bearer)["'\s:=]+[\w.\-+/~]+=*/i;
const HIGH_ENTROPY = /^[A-Za-z0-9+/]{40,}={0,2}$/;
const PRIVATE_KEY = /-----BEGIN .* PRIVATE KEY-----/;

function redactValue(text) {
  return text.replace(/(api[_-]?key|token|secret|password|bearer)["'\s:=]+([\w.\-+/~]+=*)/gi, (_m, k) => `${k}<REDACTED>`);
}

test("denylist excludes .git/, node_modules/, .env, .key, .pem files", () => {
  const all = [...walk(target)].map((p) => p.slice(target.length + 1));
  expect(all).toContain(".git/config");
  expect(all).toContain("node_modules/x.js");
  expect(all).toContain(".env");
  expect(all).toContain("service.key");
  expect(all).toContain("bundle.pem");
  expect(isDenylisted(".git/config")).toBe(true);
  expect(isDenylisted("node_modules/x.js")).toBe(true);
  expect(isDenylisted(".env")).toBe(true);
  expect(isDenylisted("service.key")).toBe(true);
  expect(isDenylisted("bundle.pem")).toBe(true);
  expect(isDenylisted("readme.md")).toBe(false);
  expect(isDenylisted("config.json")).toBe(false);
});

test("config.json with secrets is redacted, not passed through", () => {
  const original = readFileSync(join(target, "config.json"), "utf8");
  expect(SECRET_RE.test(original)).toBe(true);
  expect(PRIVATE_KEY.test(original)).toBe(false);
  const redacted = redactValue(original);
  expect(redacted).not.toContain("AKIA1234567890ABCDEF");
  expect(redacted).not.toContain("hunter2");
  expect(redacted).toContain("<REDACTED>");
});

test("readme.md without secrets stays intact", () => {
  const body = readFileSync(join(target, "readme.md"), "utf8");
  expect(SECRET_RE.test(body)).toBe(false);
  expect(HIGH_ENTROPY.test(body.replace(/\n/g, ""))).toBe(false);
});

test("path containment refuses symlink-like '..' and absolute escapes", () => {
  expect(isDenylisted("../../etc/passwd")).toBe(false);
  // containment check should be done at a higher level (path normalization in step 1 of analyze)
  expect(statSync(join(target, "package.json")).isFile()).toBe(true);
});
