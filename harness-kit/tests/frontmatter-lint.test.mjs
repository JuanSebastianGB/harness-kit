#!/usr/bin/env bun
// harness-kit CI: skill frontmatter linter.
// Run with: bun tests/frontmatter-lint.test.mjs
//
// Verifies every SKILL.md in the kit validates against the agentskills.io
// spec using `skills-ref validate`. Catches the kinds of YAML mistakes
// that broke round 1 (un-escaped colons in description).

import { test, expect } from "bun:test";
import { execSync } from "child_process";
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const KIT = join(import.meta.dir, "..");
const SKILLS_ROOTS = ["harness-analyze", "harness-propose", "harness-render-agents-md", "harness-review", "harness-eval"];

function findSkills() {
  const out = SKILLS_ROOTS.map((p) => join(KIT, p));
  out.push(KIT); // parent orchestrator at root
  return out;
}

for (const skillPath of findSkills()) {
  test(`${skillPath.split("/").pop()} has valid frontmatter (no bash output => pass)`, () => {
    let stdout = "";
    let stderr = "";
    try {
      stdout = execSync(`npx -y skills-ref validate "${skillPath}"`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      stdout = e.stdout?.toString() || "";
      stderr = e.stderr?.toString() || "";
    }
    expect(stdout).toContain("Valid skill");
    expect(stderr).toBe("");
  });
}

test("no SKILL.md carries an un-escaped colon inside description", () => {
  const yamlDescriptionColon = /^description:.*:.*$/m;
  for (const skill of findSkills()) {
    const txt = readFileSync(join(skill, "SKILL.md"), "utf8");
    const fm = txt.split("\n---\n")[0];
    expect(yamlDescriptionColon.test(fm)).toBe(false);
  }
});

test("every SKILL.md has at minimum name + description", () => {
  for (const skill of findSkills()) {
    const txt = readFileSync(join(skill, "SKILL.md"), "utf8");
    expect(txt.startsWith("---\n")).toBe(true);
    const fm = txt.split("\n---\n")[0];
    expect(/^name:\s*\S/m.test(fm)).toBe(true);
    expect(/^description:\s*\S/m.test(fm)).toBe(true);
  }
});
