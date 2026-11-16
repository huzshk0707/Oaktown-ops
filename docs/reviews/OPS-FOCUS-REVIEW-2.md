# OPS-FOCUS-REVIEW.2 — Phase 3 task-action review

Reviewer: **hp**, 2026-11-16. Independent review of draft #72 at
`536ebcade697e5c7aa59e76e7e65f3c89535cdb1`, based on Phase 2 `70f63c4`.
[Review PR #78](https://github.com/huzshk0707/Oaktown-ops/pull/78).
This review changes no application code, backend contract or feature branch.
No live staff session or production task write was used. Phase 6 #77 remains
Ravi's independent work; it was neither edited nor taken over.

## Confirmed P2 — Defer confirmation can reuse a date validated before Eastern midnight

[`focus-actions-model.js:34–38`](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/focus-actions-model.js#L34-L38)
requires a new follow-up date after today's Eastern date. That check runs when
building the preview. At confirmation,
[`focus-actions.js:86–99`](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/focus-actions.js#L86-L99)
reuses `planned` while refreshing permissions/task versions; only Undo is rebuilt.
No current-day check invalidates the prepared Defer plan. If Eastern midnight
passes while review is open (or during preflight), the previously future date can
be today by the time the new request is submitted and reported successful.

A browser reproduction against the exact exported controller used only the
existing fictional action fixture and a fixed browser clock:

1. At **2026-11-15 23:59 Eastern**, prepare Defer to **2026-11-16**. No save occurs.
2. Advance the browser's date to **2026-11-16 00:01 Eastern** without editing inputs.
3. Confirm. One simulated save succeeds with follow-up **2026-11-16**, and the UI
   says `Follow-up moved to 2026-11-16.` — the date now equals today.

[Runnable reproduction](reproduce-focus-defer-midnight.cjs) ·
[Observed result](focus-phase-3/defer-midnight.json).
The zero exit means the reported defect was reproduced; it does not certify
future-date enforcement. There was **one mocked save and zero real operational
writes**. Authentication/version/idempotency protections were not bypassed.
The generic intake SQL validates date shape/timezone; it intentionally supports
historical schedules and does not promise the quick-action future-only policy.

Proposed bounded follow-up **OPS-FOCUS-DEFER-DAY**: revalidate newly confirmed
Defer plans against the current Eastern day after preflight/before first save;
keep input and request fresh review/date selection when the day invalidates it.
Cover a review-open rollover and a delayed preflight rollover. Preserve exact
idempotent recovery of an already submitted uncertain request; never rewrite its
payload just because midnight passed. Do not impose future-only dates on the
generic intake API used for legitimate historical records. Strong server-time
semantics would need a deliberately scoped server contract, not a claimed client
guarantee. This review records the finding without implementing that follow-up.

## Scope and prior evidence

- #72 head and draft/base state were checked live; all historical CI jobs are
  green at this exact head: [43769556389](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43769556389).
- Phase 1/2 review [#76](https://github.com/huzshk0707/Oaktown-ops/pull/76) is
  complete. Its P2 offset-pagination deletion omission remains an inherited,
  open finding; it was not reimplemented or claimed as fixed here.
- Source is exported with `git archive` to an isolated temporary directory.
  Existing feature refs, task records, auth and deploy configuration remain
  untouched. User-directed feature PRs stay draft/unmerged.

## Independent validation checkpoint

| Target | Command / contract | Observed result |
| --- | --- | --- |
| Pure action model | `node --test tests/focus-actions-model.test.cjs` from exact export | **8 passed**, 0 failed/skipped |
| Existing action UI | `playwright test tests/focus-actions.e2e.spec.cjs --reporter=line --workers=1` | **20 passed**, including confirmation/cancel, exact retry, revoked access, timeout, Undo races, session expiration, native touch and scoped axe |
| Actual existing RPC | CI historical disposable schema chain followed by `PGDATABASE=oaktown_portfolio_ci node tests/focus-actions-database.cjs` | Passed real PostgreSQL Complete/Defer/Undo, preserved due/context, concurrent identical replay, stale competing writes/reversal, revoked/anon/viewer denial and audit assertions |
| Additional rollover probe | `node docs/reviews/reproduce-focus-defer-midnight.cjs <exact-export> <output-json>` | P2 reproduced with 1 simulated save, 0 real operational writes |

Tests used Node 24, CI-pinned Playwright 1.56.1 / axe 4.10.2 and PostgreSQL 16
in a new disposable container with no network and a read-only source mount.
`tests/focus-actions-database.cjs` creates/drops its own clone from the guarded
`oaktown_portfolio_ci` fixture. No production schema/migration command was run.
The existing mobile/security cases were retained; no new mobile feature,
gesture, screenshot or mobile-only suite was created.

## Remaining review checkpoint

Architecture/permission/receipt/Undo acceptance matrix, desktop action captures,
portable SQL setup commands and final branch checks are being completed. This is
a deliberate published review checkpoint; no half-written app files exist.
The report must not yet be treated as final product/merge approval.
