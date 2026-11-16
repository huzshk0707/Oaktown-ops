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

## Acceptance and security assessment

| Area | Assessment |
| --- | --- |
| Explicit confirmation | Complete requires a nonempty summary, previews status and any waiting/blocker clears, and cancels without a save. Defer previews follow-up independently of actual due/status. Gestures prepare only; buttons and confirmation remain separate. Existing UI tests pass. |
| Authorization | Existing `OpsCloud` session and `OpsToday.canEdit` gate UI. The private intake implementation checks active admin/editor membership before every new/save/replay, then checks session actor ownership. Anonymous execute is revoked. Real PostgreSQL tests reject viewer/inactive/nonstaff/anonymous users and a revoked actor's identical retry. No second authentication path or new privilege is introduced. |
| Atomic versions | The server locks session and task rows, compares exact reviewed task timestamps inside the transaction, and rolls back stale/invalid saves. Real concurrent requests show one competing proposal rejected; identical requests replay the original receipt once. Microsecond version tests pass. |
| Complete scope | Status/completion summary and explicitly accepted waiting/blocker clears only; server stamps completion/update time and audit actor. Due/follow-up, owner, links, notes and unrelated metadata stay unchanged. This records a staff-confirmed status action, not independently verified physical work or a separate personal EOD/performer report. |
| Defer scope | Follow-up-only update; real due date, status and unrelated fields retained. Existing due-date urgency can remain overdue. The midnight finding above is an additional client validation gap, not a general prohibition on historical schedules in the reused intake API. |
| Receipt/readback | Receipt identity, session/batch/proposal/task IDs, exact version and changed/preserved fields are checked against an independent shared refresh. A receipt followed by a newer/missing task is reported changed-before-readback; newer work is kept and Undo disabled. Malformed/lost receipts remain unverified. |
| Recovery | Pending saves retain identical session/batch/payload. New actions are blocked until that request is checked; lost-response tests retry without duplicate audit/task mutation. No automatic reversal or blind new request. The capture flow confirms this with one simulated retry and unchanged audit count. |
| Undo | A new confirmed audited inverse, not local rollback or audit deletion. Latest action only, two-minute in-memory window, exact post-save version, unchanged unrelated data. Unrepresentable prior values disable Undo explicitly. Concurrent edits/archive/removal/expiry/permissions prevent overwrite. No cross-reload persistence is claimed. |
| Session and private UI | Account/interaction epochs reject late callbacks. Sign-out/session expiration clears drafts, pending/recent data and private presentation. Denied access clears displayed draft details; uncertain recovery rechecks access before restoring previews. No action payload is put in local/session storage or logs. |
| Shared state and prior finding | Actions reuse OpsToday and existing ops_task_intake new/save. Phase 3 does not change `cloud.js` or `ops-task-reader.js`. Review #76's P2 offset-pagination omission therefore still applies; this audit does not claim/fix it a second time. |

Immutable source anchors:
[client preflight/save/verification](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/focus-actions.js#L82-L124),
[model, inverse and receipt rules](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/focus-actions-model.js),
[server actor/session/receipt checks](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/supabase/schema/task_intake_v1.sql#L78-L114),
[row locks and reviewed versions](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/supabase/schema/task_intake_v1.sql#L129-L208),
[actual-RPC regression](https://github.com/huzshk0707/Oaktown-ops/blob/536ebcade697e5c7aa59e76e7e65f3c89535cdb1/tests/focus-actions-database.cjs).

## Proposed bounded correction

Record **OPS-FOCUS-DEFER-ROLLOVER** as a separate unclaimed fix: revalidate a
*new* deferral against the current Eastern day after asynchronous preflight and
immediately before initial save dispatch; if invalid, keep input and require a
new valid date/review. Add review-open and delayed-preflight midnight regressions.
Do not silently move the user's date. Do not change payloads or block exact
receipt replay for an already-submitted uncertain request. Do not globally ban
past schedules in the general-purpose intake RPC; historical intake is a separate
legitimate workflow. If an exact server-time guarantee is required, specify a
narrow action contract rather than claiming browser validation makes that atomic.
No correction was implemented as part of this independent review.

## Portable validation and desktop evidence

Export the exact source with `git archive 536ebcade697e5c7aa59e76e7e65f3c89535cdb1`
into an empty directory. The review helpers accept that export as an argument;
they do not need private chat or retained local state. Browser tests/captures use
`python3 -m http.server 8765 --bind 127.0.0.1 --directory <export>` plus the
CI-pinned test tools (NODE_PATH / PLAYWRIGHT_BROWSERS_PATH if installed elsewhere).

[prepare-focus-action-db.sh](prepare-focus-action-db.sh) contains the exact
historical SQL setup body used in this review, followed by the action database
suite. Run it only in a fresh isolated PostgreSQL 16 cluster/fixture. Reproduction:

```sh
# Start a dedicated disposable cluster; publish no production connection/port.
# Mount the exact export read-only at /repo in that cluster's container.
# Provide psql through that container, preserving PGAPPNAME for concurrency tests.
PATH=<directory-containing-disposable-psql-wrapper>:$PATH \
PGDATABASE=oaktown_portfolio_ci \
bash docs/reviews/prepare-focus-action-db.sh <exact-export>
```

The wrapper used `docker exec -i -w /repo -e PGUSER=postgres -e PGDATABASE=oaktown_portfolio_ci
-e PGAPPNAME=<inherited-test-name> <own-container> psql "$@"`. The cluster image was
`postgres@sha256:dd2bf3ce2dc83a81674cf7f217fcfd8a5009a4b325dda5b843bfee82a06cff6f`,
with `--network none`, a read-only source mount, and disposable local trust auth.
Do not run the initializer against an existing shared database: it creates fixture
roles/tables and expects a fresh disposable cluster. The standalone action test
clones and drops its own test database; this is schema/action behavior evidence,
not production recovery/backup validation.

[Capture helper](capture-focus-actions-desktop.cjs) checks served controller bytes
against the exact export. [Acceptance JSON](focus-phase-3/desktop-action-acceptance.json)
records source SHA256, fitting dialogs/document geometry at **1280/1440/1920**,
zero page errors and zero real operational writes. Cancel produced no save;
Complete + Undo + a recovered Complete produced three fictional saved actions
from four mock save calls, with the identical retry adding no duplicate audit.

- Complete confirmation: [1280](focus-phase-3/complete-confirm-1280.png), [1440](focus-phase-3/complete-confirm-1440.png), [1920](focus-phase-3/complete-confirm-1920.png).
- [Defer preview](focus-phase-3/defer-confirm-1440.png), [completed with Undo](focus-phase-3/completed-undo-1440.png), [Undo confirmation](focus-phase-3/undo-confirm-1440.png), [uncertain recovery](focus-phase-3/uncertain-recovery-1440.png).

Visual inspection of 1280 completion and 1440 recovery confirms readable task
identity, before/after fields, consequences and distinct cancellation/retry/
confirmation. Existing action/axe suites retain wider workflow/security coverage;
these desktop screenshots do not certify every assistive device or a live staff
operation. Earlier full CI at this exact feature head is
[43769556389 — success](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43769556389),
whose reported 201 unit / 235 browser checks are historical evidence separate
from the independent focused runs above. No schema or production service changes
were needed for this review.

## Disposition / next step

Review step 2 is complete with one additional confirmed P2 and the carried
pagination finding from #76. No other permission/version/receipt/Undo defect was
established in this scoped review; this is not merge/deploy or blanket security
approval. The new Defer correction remains separately unclaimed.

**NEXT STEP:** claim unowned **OPS-FOCUS-REVIEW.3**, fetch Phase 4, and inspect
`git show origin/feature/focus-board-phase-4:docs/MORNING-COMMAND-CENTER.md`
alongside its SOD/journal/model/browser tests. Carry both P2 findings into
consolidation step 4. Respect Ravi's separate Phase 6 claim and all draft gates.
