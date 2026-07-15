# harness-analyze: output schema

Authoritative JSON Schema: `schemas/analyze.schema.json`. This file is a
human-readable summary. If a discrepancy appears, the JSON Schema wins.

## Status

- `OK` — proceed, downstream will consume
- `INSUFFICIENT_EVIDENCE` — minimum-coverage gate failed; downstream MUST stop
- `BLOCKED` — a `block`-severity conflict exists; downstream MUST stop
- `ERROR` — unrecoverable; downstream MUST stop

## Minimum coverage gate

Output is `INSUFFICIENT_EVIDENCE` (not `OK`) when:

- `data.stack.languages.length == 0`, OR
- `data.coverage.absolute_paths_checked.length == 0` (nothing was read), OR
- every marker file the SKILL accepts was found BUT `data.stack.languages`
  is still empty (no language detector matched — see
  `references/detectors.md#stack`). Surface the matched markers in
  `notes` so the user can add the missing detector.

`coverage.absolute_paths_checked` is host-environment dependent and is
excluded from byte-identical idempotency promises. See
`references/edge-cases.md#re-run-idempotency`.

## Conflict entry

```
{
  "field": "stack.package_manager",
  "values": [
    { "value": "pnpm", "source": "pnpm-lock.yaml", "confidence": 0.95 },
    { "value": "npm",  "source": "package-lock.json", "confidence": 0.95 }
  ],
  "severity": "warn"
}
```

`severity: block` is reserved for conflicts that change downstream prose
(e.g. conflicting language when target agent chooses a different run-time).

## Coverage fields

`coverage.evidence_paths` lists relative paths that contributed to the
output. `coverage.evidence_redacted_paths` lists paths whose content was
scrubbed. `coverage.absolute_paths_checked` is the set of absolute paths
inspected (used for audit and retry boundaries).
