# harness-render-agents-md: output schema

Authoritative JSON Schema: `schemas/render.schema.json`.

Status values: `OK` / `INSUFFICIENT_EVIDENCE` / `ERROR` / `BLOCKED`.

## Collision policy

Default: `refuse`. Behavior per policy:

- `refuse` — if target file exists with non-empty content, emit
  `action: refused` and do not write. Stop and ask the user.
- `merge` — wrap rendered content in `<!-- harness-kit:begin -->` /
  `<!-- harness-kit:end -->` markers; idempotent re-runs replace only the
  marked block.
- `force` — overwrite without warning.
- `versioned` — write to `<name>.v<n>.md` where `n` is the next free integer.

## File record

```
{
  "path": "AGENTS.md",
  "action": "created|updated|skipped|refused",
  "sha256_preview": "abcd1234ef567890",
  "reason": "(only when refused or skipped)"
}
```

## Re-run safety

Idempotent re-runs MUST produce identical `sha256_preview` for unchanged
inputs. `merge` policy preserves user content outside the marked block.
