# harness-propose: edge cases

## Lost upstream contract

If `analyze.json` is missing or fails validation, halt with
`status: ERROR` and `notes: "analyze.json missing or invalid contract_version"`.

## Conflict resolution

| Severity | Behavior |
|---|---|
| `block` | Halt with `status: BLOCKED` and surface to user |
| `warn`  | Pick highest-confidence value, note choice in `notes` |
| `info`  | Pick any, ignore |

## Upstream BLOCKED

The contract says "downstream MUST stop on `BLOCKED`." If
`analyze.json.status == BLOCKED`, halt immediately. Do not step into
"Read iteration signals" or "Generate proposals" until the upstream
block is resolved by the user.

## Empty proposal

If no rules in `references/detectors.md` match, emit
`status: OK` with zero proposals and `notes: "no rules matched; consider adding detectors"`. The pipeline continues.

## Massive iteration

If `previous_run_id` indicates a re-run with no new issues, emit the prior
proposal as-is and add `notes: "no changes from previous run"`.

## Mixed-tool proposals

If the agent has Read but no Write, skills that require file edits go to
`rejected_proposals[]` with reason `requires-write-not-allowed`.
