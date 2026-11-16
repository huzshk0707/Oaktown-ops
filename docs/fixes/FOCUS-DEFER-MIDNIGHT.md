# Focus Defer — Eastern midnight correction

Bounded fix OPS-FOCUS-DEFER-ROLLOVER, [draft #82](https://github.com/huzshk0707/Oaktown-ops/pull/82),
from completed Phase 5 `712ec3d90f28652c686c3ad017906d70c3cd7248`.
Addresses review #78 / consolidation #80. Separate cursor correction is draft #81;
original feature branches and Ravi's integration #77 are unchanged.

Previously a Defer plan validated before Eastern midnight could be confirmed
later with a follow-up date now equal to today. Confirmation refreshed task
versions but reused its old date validation. The quick action now runs the
existing pure Defer validator against the current Eastern day after shared task
preflight and again after awaiting a new intake session, immediately before
creating the immutable save payload. The selected date is never silently moved.

If the date is no longer valid, no task save is sent; the input remains visible
and confirmation is disabled until explicit Reload and review. A newly created
empty intake session can remain when midnight passes during session creation.
The existing task version/permission checks, shared OpsToday/auth ownership,
server CAS, completion, Undo and generic intake schedule rules are preserved.
No schema, production data, provider, runtime dependency or UI layout changes.

An uncertain save is different: retry must replay the exact frozen session,
batch and payload to discover whether it already committed. Revalidation does
not reject or rewrite that existing request after midnight. The receipt and
shared task readback still establish success; there is no new task cache.

## Regression evidence

All new browser fixtures are fictional, using the default desktop viewport and
a single task so real-calendar task ordering cannot change the reviewed record. The fixed clock
moves from `2026-11-16T04:59Z` to `05:01Z`: the UTC date stays the same while
Eastern advances from November 15 to November 16. Tests cover:

- Confirming a previously reviewed next-day date after midnight; input survives,
  no session/save is sent, and explicit Reload suggests November 17.
- Midnight during held shared task preflight: no session or save.
- Midnight during held session creation: the empty session may exist, no save.
- A save committed before midnight whose response is lost: retry after midnight
  sends the identical request and returns one audit event, without another write.

Before the fix, the three new invalid-date cases failed and the retry case passed
(3 failed / 1 passed). This establishes that they reproduce the reported defect.
After the fix, all four new cases pass. Full action-suite/CI results are recorded
in HANDOFF and the PR; running checks are never reported as completed.

Commands: `node --test tests/*.test.cjs`,
`node scripts/workflow-states.cjs --check`, `node --check focus-actions.js`,
pinned Playwright `test tests/focus-actions.e2e.spec.cjs --workers=1 --reporter=line`.
Existing hosted workflow covers all browsers, SQL, Deno and dependency audit.
The generic task API intentionally retains legitimate historical follow-up edits;
this correction enforces the Focus quick-action rule at submission boundaries.
No merge or deployment is included.

## Combined compatibility check

A temporary tracked-file archive of Defer `1b8544391008f3412910b7ccaa88758e67169c31`
plus the cursor-only patch from Phase 5 `712ec3d` to reader `c45273e188664e194031d57ed0a3ee2ae04505bb`
passed **218/218 units and 266/266 browsers** (two workers) on 2026-11-16.
This composed the source locally for validation; neither feature branches nor
production were merged. Defer `8049bd8` changes only the test fixture selection
and documentation; its four clock cases also passed independently after that
selection change. The runtime is identical to `1b85443`.

To recreate, `git archive 1b85443` into a new temporary directory and apply
`git diff 712ec3d c45273e --` for these cursor files only:
`ops-task-reader.js`, `tests/ops-task-reader.test.cjs`,
`tests/focus-board-fixtures.cjs`, `tests/focus-board.e2e.spec.cjs`,
`tests/morning-center.e2e.spec.cjs`, `tests/daily-center.e2e.spec.cjs`,
`tests/task-intake.e2e.spec.cjs`, `tests/today.e2e.spec.cjs`.
Use locked connector dependencies and pinned Playwright 1.56.1 / axe 4.10.2.
Serve that temporary directory on loopback port 8765, then run
`node --test tests/*.test.cjs`, `node scripts/workflow-states.cjs --check` and
`playwright test tests/*.e2e.spec.cjs --workers=2 --reporter=line`.
Keep the branch-specific HANDOFF/TASKS separate; no branch merge is needed.
The passing combined run is compatibility evidence, not feature merge or rollout
approval. Source audience/retention, native approval integration and authoritative
mailbox/deposit sources remain tracked in review #80 / independent draft #77.
