# Shared task reader cursor correction

Task: OPS-FOCUS-READER-CURSOR, child draft [#81](https://github.com/huzshk0707/Oaktown-ops/pull/81),
based on completed Phase 5 `712ec3d90f28652c686c3ad017906d70c3cd7248`.
Addresses the P2 finding in independent review #76 / consolidated #80; existing
feature branches, Ravi's integration branch and production remain unchanged.

The shared reader previously advanced by numeric offset. Deleting an earlier row
between page requests could shift a later current task before the offset and omit
it without a duplicate ID or error. The reader now asks for ascending immutable
IDs after the last observed ID (`id=gt.<encoded-id>`), preserving the same fields,
RLS/authenticated API, 1,000-row page size, legacy-column retry and account ticket.
Repeated/regressing/malformed IDs fail the read rather than claiming ready.
Fallback restarts from the beginning, discarding partial results and its cursor.

This remains a stateless read helper owned by OpsToday, with no cache, second
client, subscription, schema, dependency or write path. Existing task sorting,
selection, dates/statuses and review/action workflows are unchanged. Canonical
UUID ordering in PostgREST matches the returned ascending ID strings.

Cursor traversal is **not a transactional snapshot**: already-read deleted rows
can survive until the next refresh; new rows inserted before the cursor appear
on a subsequent refresh. The correction prevents offset-shift omission of later
existing rows, not arbitrary point-in-time consistency or financial verification.

Meaningful regressions cover the original deletion, insertion before/after the
cursor, multi-page completeness, duplicate/regressing/malformed results, a late
403/superseded account and a mid-read legacy-schema restart. A desktop browser
regression deletes an earlier row after page 1, reaches the formerly skipped task
through actual carousel navigation, then verifies refresh removes the old row.
Browser fixtures now honor the cursor while retaining offsets for unrelated
existing Operations queries. >1,000-task checks assert the cursor query, not an
obsolete offset. A former dashboard test's ineffective offset=0 request-count
check was replaced by actual rendered priority-order comparison; the old check
never matched the reader's first-page URL and did not test snapshot consistency.

Validation commands: `node --test tests/ops-task-reader.test.cjs tests/focus-board-model.test.cjs`,
`node --test tests/*.test.cjs`, workflow inventory, existing Focus/Center Focus/
Morning/daily browser suites and the full CI browser/SQL/Deno/audit jobs. All
browser inputs are fictional; no production task write, merge or deployment.
Current results and any remaining failures are recorded in HANDOFF/PR, not
inferred from a running job. No visual component or new mobile feature is added.
