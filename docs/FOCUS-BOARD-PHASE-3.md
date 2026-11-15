# Focus Board Phase 3 — safe task actions

Review scope: `feature/focus-board-phase-3`, based on Phase 2 head
`70f63c43232f8efe7ec58ac769b949dbc31498b9`. PR #70 remains at `08888e6`;
PR #71 and both parent branches are unchanged. This increment is source for a
draft PR targeting `feature/focus-board-phase-2`. No merge, deployment, migration
or real operational task write is included.

## Inspected architecture and API decision

- `cloud.js` owns the existing verified staff session, refresh, account epochs
  and authenticated PostgREST calls. No new authentication path or credentials.
- `today.js` / `ops-task-reader.js` own the shared paginated snapshot and refresh.
  Actions use `OpsToday.refresh()`, `getData()` and `getState()`; no second task
  database, task fetcher, offline cache or realtime subscription is added.
- `today-editor.js` / `task-edit-model.js` use `ops_task_update_v1`: a full-field
  reviewed editor with a version check. It normalizes date metadata and other
  fields, so it is retained for Review rather than repurposed for narrow actions.
- `task-intake.js`, `task-intake-model.js`, `supabase/schema/task_intake_v1.sql`
  and `task_cleanup_v1.sql` provide the approved narrow write operation:
  `ops_task_intake('new')` and `ops_task_intake('save', session, reviewedPayload)`.
  Save checks active editor/admin membership and session ownership, locks task
  rows, checks exact `updated_at`, validates consolidated status fields, rejects
  archived tasks, and atomically writes task/evidence/event/receipt records.
  Identical session/batch requests replay their receipt; changed requests reject.
- The scoped ChatGPT `ops_task_agent` proposal/apply operations are restricted
  to their OAuth role, client and resource. Browser sessions do not use them.
- `operations.js` retains existing Review/editor/profile routing and permissions.
- Source inspection found task timestamp/parent-chain guards and audit attribution,
  with no task-completion notice/message/payment automation in the committed SQL.
  No new external action is invoked. This is source evidence, not certification
  of uninspected live webhooks or a live staff operation.

The UI uses the existing intake contract with **one update proposal per action**.
Each confirmed action receives a separate private intake session, UUID batch
reference and proposal `P1`. Retries reuse the identical session and payload.
It never calls intake `state`, whose historical 1,000-task limit does not apply
to `new`/`save`. Reads continue through the shared paginated reader.

## Exact changes and confirmation

| Action | Persisted changes | Preserved |
|---|---|---|
| Complete | `status = completed`, user-entered `intake_details.completion_summary`; explicitly shown clears of `waiting_on`/`blocked_reason`; server `completed_at` and `updated_at` | Due/follow-up, priority, owner, notes, links, workflow, child tasks, other metadata |
| Defer | Only `intake_details.follow_up`: chosen later calendar date, `time: null`, `timezone: America/New_York`, explicit staff source wording; `updated_at` | Actual due object/instant, status, priority, context and all unrelated fields |
| Undo Complete | Prior status/summary/waiting/blocker values (or approved clears); server clears `completed_at` when restoring the prior active status; new `updated_at` | All unrelated data and original audit history |
| Undo Defer | Exact previous follow-up object, or removal if originally absent; new `updated_at` | Due date, status, unrelated data and original audit history |

Supported quick actions target saved, unarchived `pending`, `in_progress`,
`waiting` or `blocked` records with a valid version. Existing status requirements
remain enforced by the RPC. Inconsistent records use Review Task. Completion
requires a nonempty summary (maximum 1,200 characters); an active task with an
existing completion timestamp requires reconciliation in Review. Deferral must
be after today and after an existing valid follow-up. A new date replaces a
previous follow-up time, explicitly explained in the preview.

Every confirmation shows the exact ID/title, proposed action, before/after
fields, consequences and Confirm/Cancel. A gesture never confirms a mutation.
Completion records this task only; no inferred personal EOD performer, notices,
messages, payments, linked-task completion or legal/business event is added.
Moving a follow-up does not hide a real overdue due date: the original
deterministic earliest-date/urgency order is unchanged.

## Interaction and shared lifecycle

Ordinary card drags/swipes remain navigation. The separate labeled action
handle prepares Complete on a right swipe or Defer on a left swipe. Mouse and
keyboard users have equivalent visible buttons; activating the handle opens a
choice. Native touch dispatch settles before modal preparation, preventing a
consumed first tap. The distance test exists only inside this isolated handle;
it cannot turn a longer navigation swipe into a mutation.

The native action dialog is modal over either the board or Center Focus Mode.
It traps Tab, restores focus, supports Escape/Cancel before a write, and disables
concurrent confirmations/cancellation during save/readback. The shared
`OpsReviewedWrite` lifecycle owns review/check/save/verify/recovery states.
Canceled or stale account tickets never update private UI. Account changes clear
drafts, receipts and recent-action data immediately. An already sent request
cannot be undone by signing out; late replies never show success to a new session.

Before save, shared refresh rechecks access and the exact reviewed version.
The RPC then independently authorizes and compares the version while holding
the row lock. After a receipt, another shared refresh must match receipt identity,
microsecond-precise version, changed fields and protected fields before success.
Only then does selection move to the next task after completion. Deferral keeps
the selected ID while ordering recalculates; Undo restores the affected ID.
The existing refresh event also updates the connected workspace cache.

Requests have a 20-second UI timeout. A lost response, failed readback or missing
receipt is **unverified**, not success. New Focus actions are blocked until
the identical saved request is checked. It is never replaced by a new save to
retry. Definitive database rejection requires fresh review. A valid receipt
followed by a newer/missing task is explicitly reported as changed-before-readback;
the newer state is kept, Undo is unavailable, and no automatic reversal occurs.
Success, Undo and uncertain-request recovery are available inside Center Focus
Mode as well as on the board. The existing Review/full workspace remains
available for recovery.

## Undo and audit safety

Undo is another explicit, authorized, audited narrow update, not a local card
restoration. Only the latest verified action is retained in memory for two
minutes: task ID/title/code, post-save version, batch reference and the minimum
inverse fields. It is cleared at account change or page reload; inverse values
are discarded when the window expires. Nothing is stored in local/session storage.

Undo refreshes access, requires the exact post-action version, then sends that
version to the same locked backend operation. Any intervening edit, deletion or
archive prevents overwrite. If the previous values cannot be represented exactly
by the existing API (for example a saved JSON-null/malformed follow-up), Undo is
explicitly unavailable, including a warning before the original confirmation.
Failure is shown and uncertain reversal retries use the same immutable request.
Audit history and external effects are never deleted or reversed.

Existing `task_intake_reviewed` events record authorized actor, timestamp, task,
proposal fields, approved clears and reviewed version. The actor-owned private
source ledger records relevant exact before/after values; proposal references
link that evidence. Undo's audit reason/evidence contains `reverses` plus the
original UUID batch reference. No sensitive task payload is logged or put in
screenshots. Existing shared session and database access checks remain unchanged.

## Changed files and verification

- `focus-actions-model.js`: pure proposal, validation, inverse and receipt rules.
- `focus-actions.js`: action dialog, single-flight controller, retry/Undo lifecycle.
- `focus-board.js`: small selection/focus interface and verified-action integration.
- `focus-board.css`, `index.html`: scoped action HUD, previews and controls.
- `tests/focus-actions-{model.test,database,fixtures,e2e.spec}.cjs` and the shared
  fictional fixture: pure, real-RPC/concurrency, browser and denial coverage.
- `.github/workflows/checks.yml`: action syntax/database checks and fictional capture.
- `scripts/capture-focus-actions.cjs`: repeatable fictional browser screenshots.
- Workflow inventory, roadmap/audit notes and `docs/ui-review/focus-board-phase-3/*`.

Commands:

```sh
node --test tests/*.test.cjs
node scripts/workflow-states.cjs --check
npx playwright test tests/*.e2e.spec.cjs --reporter=line --workers=1
# Disposable oaktown_portfolio_ci only, after the workflow's schema setup:
node tests/focus-actions-database.cjs
# App served at 127.0.0.1:8765; optional OAKTOWN_CHROMIUM for a system browser:
node scripts/capture-focus-actions.cjs
```

Coverage includes cancellation/confirmation, ordinary-navigation zero writes,
permission/validation rejection, session expiry/sign-out, single-flight writes,
slow/lost replies, malformed receipts, persisted Undo/failure/races, unchanged
deadlines/status on defer, selection/order, focus traps/restoration, native mobile
touch, reduced motion, six appearances, four widths and 1,007 active tasks.
The real SQL test uses the exact UI payload model against the existing RPC,
including simultaneous duplicate requests and competing saves/reversals.
Exact final unit/browser/database/CI results are recorded in the draft PR.

## Fictional visual review

1. [Desktop board with actions](ui-review/focus-board-phase-3/desktop-board-actions.png)
2. [Mobile board with actions](ui-review/focus-board-phase-3/mobile-board-actions.png)
3. [Completion confirmation](ui-review/focus-board-phase-3/completion-confirmation.png)
4. [Defer panel](ui-review/focus-board-phase-3/defer-scheduling.png) /
   [mobile](ui-review/focus-board-phase-3/mobile-defer-scheduling.png)
5. [Successful action with Undo](ui-review/focus-board-phase-3/successful-action-undo.png)
6. [Undo unavailable after newer work](ui-review/focus-board-phase-3/undo-unavailable.png)
7. [Center Focus actions](ui-review/focus-board-phase-3/center-focus-actions.png) /
   [mobile](ui-review/focus-board-phase-3/mobile-center-focus-actions.png)
8. [Reduced motion](ui-review/focus-board-phase-3/reduced-motion.png)

All are fictional DEMO tasks. Reduced motion preserves information and records
zero running animations. No production property/tenant data is used.

## Limits and review decisions

- Only the last verified action has a short, in-memory Undo window. Later
  correction uses the existing Review workflow. No external side-effect reversal.
- Uncertain requests survive dialog closure, but not page reload/sign-out;
  recovery then requires reviewing the saved task and its existing intake audit.
- Historical intake sessions/evidence are retained by the existing backend. Each
  action uses a fresh session to preserve immutable proposal IDs, avoid locking
  earlier sessions’ tasks and keep retry safety. These sessions also appear in the
  existing recent-session list; its historical 100-session selector remains a limit.
- The source adds no backend capability or deployment. The existing intake RPC,
  archive guard and access setup must be present in the environment where this
  branch is eventually reviewed/deployed. Missing setup fails closed.
- Automated tests use Chromium, fictional API responses and disposable PostgreSQL;
  they do not certify live staff operations, unknown webhooks or all assistive tools.
- No new statuses, columns, migrations, endpoints, dependencies, landing-route
  changes, auto-completion, future morning flow, merge or publication is included.
- No additional backend design approval is required for the implemented existing
  contracts. Extending retention/Undo across reloads or reversing external effects
  would require a separately reviewed backend design.
