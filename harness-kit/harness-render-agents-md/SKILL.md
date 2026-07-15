---
name: harness-render-agents-md
description: Render the harness proposal into actual files on disk — AGENTS.md at the project root plus per-agent prompt files. Use after harness-propose completes. Default collision policy is refuse (do not overwrite user-authored content). Stack-agnostic; output is a portable AGENTS.md plus referenced files in subfolders.
---

## When

Activate after `<repo-root>/.harness-kit/propose.json` exists with
`status: OK` and the user asks "render", "write the files", or "apply the
proposal".

## Inputs

- `<repo-root>/.harness-kit/propose.json` (required)

## Steps

1. **Validate envelope.** Confirm contract version matches.
2. **Check upstream status.** If `propose.status ∈ {INSUFFICIENT_EVIDENCE,
   ERROR, BLOCKED}`, halt.
3. **Compute target paths.** `AGENTS.md` at repo root, plus each
   `agents[]` entry's `prompt_path` and each `skills[]` entry's
   `references/contract.md` and SKILL.md mirror.
4. **Collision check per file.** Default policy: `refuse` if the file
   already exists with non-empty content. The same default applies to
   per-agent prompt files and skill mirrors. Other policies:
   - `merge` — wrap between `<!-- harness-kit:begin -->` /
     `<!-- harness-kit:end -->` markers
   - `force` — overwrite
   - `versioned` — write `AGENTS.md.v1.md`, `AGENTS.md.v2.md`, etc. (the
     `v<n>` suffix is on the extension, not in the body). Cap: refuse to
     write when `n >= 1000`; emit `action: refused` with
     `reason: "versioned policy cap reached"`.
5. **Refuse path traversal.** Every output path must resolve under
   `<repo-root>` after normalizing. Reject `..` escapes and absolute paths.
 6. **Render content.** Keep AGENTS.md portable (no vendor-specific
    prose); include detected conventions as a thin table. Each agent prompt
    is a Markdown file with frontmatter (`name`, `description` only). Do not
    emit `allowed-tools` or any vendor-specific field; put tool declarations
    inside an opt-in `<!-- agent-specific -->` fenced block.
 7. **Emit Sensors & Sandbox section (conditional).** If the agent proposal
    carries any of `sensors` (non-empty) or `sandbox` (any sub-field defined),
    emit a `## Sensors & Sandbox` block in the agent's prompt file. Canonicalize
    before emitting: sort `sensors[]` lexicographically, sort every sub-array
    of `sandbox{}` lexicographically, render keys in fixed order:
    `allowed_paths`, `denied_commands`, `network_access`, `requires_approval`.
    If both `sensors` and `sandbox` are absent/empty, omit the section entirely.

    **Example (populated):**
    ```markdown
    ## Sensors & Sandbox

    ### Sensors
    - file.read
    - glob.list
    - grep.regex

    ### Sandbox
    - **allowed_paths**: `src/`, `tests/`
    - **denied_commands**: `rm -rf`, `sudo`
    - **network_access**: `none`
    - **requires_approval**: `package.publish`
    ```

    **Example (absent):**
    _No `## Sensors & Sandbox` block appears in the agent's prompt file._
 8. **Compute shas.** For each file produced, the leading 16 hex chars of the
    sha256 of the written bytes.
 9. **Write envelope.** `<repo-root>/.harness-kit/render.json`.

## Output

`references/output-schema.md`. JSON Schema is authoritative at
`schemas/render.schema.json`.

## Stop conditions

- upstream status not `OK`
- collision policy `refuse` would be triggered and user has not opted in
- a path resolves outside the repo

## Permissions

Read access to `.harness-kit/*.json`. Write access only to paths under
`<repo-root>` that pass the collision check.
