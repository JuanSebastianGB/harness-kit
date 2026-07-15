# harness-review: edge cases

## Render produced zero files

`status: INSUFFICIENT_EVIDENCE`, `verdict: request-changes`, single issue:
`{"severity": "warning", "evidence": "render.json has no files to review"}`.

## Files referenced but missing on disk

If `render.json.files[i].action != "refused"` but the file does not exist
on disk, escalate from `warning` to `critical`. This rule does NOT by
itself set `status: BLOCKED` — only `blocker`-severity findings do that.
Critical findings show up in `severity_counts.critical` and contribute to
`verdict: request-changes`.

## Concurrent edit between render and review

Compute the current sha256 of each rendered file. If it diverges from
`render.json.files[i].sha256_preview`, emit `critical: drift` for each
touched file.

## Output inflation

Cap `issues` at 50 entries. If more issues are detected, drop to the top
50 by severity and append a `suggestion` issue:
`"review truncated to 50 entries; full results available on request"`.
