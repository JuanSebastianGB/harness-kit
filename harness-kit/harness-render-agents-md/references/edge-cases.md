# harness-render-agents-md: edge cases

## AGENTS.md already exists and is non-empty

Default `refuse`. Surface to user:

```
AGENTS.md already exists at <path>. Pick a collision policy:
  refuse  (default; do nothing)
  merge   (wrap rendered content between harness-kit markers; preserves user edits)
  force   (overwrite; user edits lost)
  versioned  (write AGENTS.md.v1.md, AGENTS.md.v2.md, ...)
```

## Sub-agent prompt file already exists with user content

Same as above, applied per file.

## Skill already exists

Same default as the parent: `refuse`. The skill emits `action: refused`
with `reason: "skill SKILL.md exists; set collision_policy=merge to wrap
between harness-kit markers"`. Default `merge` is NOT applied silently.

## Reject absolute paths

If `propose.data.agents[i].prompt_path` is absolute or escapes the repo
root, emit `action: refused` with `reason: "<path escaping repo root>"` for
that file. Do NOT write to `propose.json` — render does not have write
authority over `propose.json`. The user re-runs `propose` after fixing the
offending entry.

## Empty propose

If `propose.data.agents.length == 0 AND propose.data.skills.length == 0`,
emit `status: OK` with `target_file: AGENTS.md` and `files: []`. The user
gains an empty AGENTS.md placeholder.
