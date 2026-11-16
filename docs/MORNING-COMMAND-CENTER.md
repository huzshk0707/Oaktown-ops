# Morning Command Center — Phase 4

## Inspection and scope before implementation

Base: Phase 3 `536ebcade697e5c7aa59e76e7e65f3c89535cdb1` (PR #72).
The new branch targets `feature/focus-board-phase-3`. PRs #70–#72 are unchanged.
Desktop only: 1280, 1440 and 1920px. Existing responsive/security checks stay;
this increment adds no mobile layouts, touch gestures or mobile screenshots.

- `today.js` and `ops-task-reader.js` own the shared verified task snapshot and
  paginated reads. Morning will consume `OpsToday`, not fetch/cache tasks again.
- `sod.js` / `sod-model.js` provide the existing Plan my morning selection,
  editable priorities, recurring responsibilities and SOD email composition.
  There is no existing SOD approval/save backend. Extend this single editor;
  retain Today access and its normal default email format.
- `focus-board.js` / `focus-board-model.js` provide execution and deterministic
  sorting. Planning must not change task priority, dates or statuses.
- `deposit-preparation.js` / `deposit-model.js` prepare approved holding-deposit
  documents in memory. They do not track payment receipt or reconciliation.
  The recorded portfolio design explicitly has no deposit ledger. Morning must
  show reported stages and missing verification, never fabricate cleared funds.
- No application Gmail/mailbox OAuth flow, email ingestion backend or AI API
  exists. A Gmail tool connection is available to this ChatGPT session; it does
  not grant browser/server credentials to Oaktown Ops. No private mail content
  was fetched or put in source. The application uses manual email/message
  intake, labeled as unverified, until an approved mailbox service is connected.
  Existing AI guide tools prepare prompts for external human use; no model is
  called or simulated here. Classification will use transparent text rules.
- `cloud.js` owns authentication and session epochs. Shared staff/RLS permissions
  remain required; untrusted source text cannot invoke tools, writes or sending.
- The existing `ops_events` append-only staff journal permits authenticated
  editor/admin inserts via RLS. `ops_stamp_event_attribution` derives actor and
  timestamp from the session. Explicit SOD approval can use this existing journal
  with a versioned plan envelope, stable event UUID and independent readback.
  No second SOD database, new table/migration or new write endpoint is needed.
- Task creation remains in the existing reviewed `ops_task_intake` workflow.
  An accepted planning proposal is not a saved task. Any handoff must preserve
  source evidence and require that workflow's normal review and Save.

Missing capabilities: in-app mailbox OAuth/read service, an approved deposit
ledger/reconciliation source, and a dedicated server-enforced multi-user SOD
workflow. The existing journal can record an authenticated reviewer, timestamp,
immutable approval version and source citations; it cannot prove that mail facts
or payments are true. No operational writes occur merely by collecting,
classifying, generating a draft or entering Focus Board.

## Implemented interface and data flow

Open `#/morning` from the new Morning Command Center navigation entry. The
production landing route stays Today. The desktop surface has three scrollable
columns: incoming sources/deposit reports, operational work/the existing SOD
editor, and readiness/approval/task proposals. Eastern and India clocks, current
Eastern business date, shared search, Appearance and Full workspace stay in the
slim command bar. No sidebar is shown in this mode. Existing routes remain.

`OpsToday` → `OpsMorningModel` projections → existing `OpsSod` editor → explicit
staff-journal approval → confirmation → existing `#/focus` is the only data flow.
Morning does not subscribe to a second task service or persist a second task
store. The same SOD DOM is temporarily hosted in Morning and restored to Today
when leaving. Its original standalone composition format remains available;
Morning adds grouped, source-cited composition through the existing model.

Saved active tasks use the existing deterministic Focus Board order. The first
six are suggested in the center pane; the existing selector and Focus Board
include **all** active tasks, including paginated snapshots above 1,000 records.
Owner, missing schedule, waiting/blocked work and source-conflict counts derive
from actual saved fields. Nothing assigns a new deadline or permanent priority.

## Intake, review and provenance

- Staff paste authorized email, text, WhatsApp, call or internal message content.
  This is manual submission, not mailbox synchronization. A reported source date
  is required; the received timestamp is optional and must include its offset.
  An unknown sender, owner, timestamp or requested deadline stays unknown.
- Transparent text rules suggest a category, urgency and possible instruction.
  Relative dates and owner names are not guessed. Every item remains unreviewed
  until staff review the original text and explicitly confirm classification.
- Original content is displayed with `textContent`, never HTML or instructions
  to tools. Rules make no AI/network calls and cannot trigger writes or sending.
- Staff can confirm links only to records in the accessible shared snapshot.
  Conflicting task/property links are rejected. They can edit or dismiss a
  proposal, accept it into the draft, or open existing Task Intake review.
- Source IDs, manual kind, reported date, optional timestamp/sender, original
  body, review revision and uncertainty survive in accepted source citations.
  Task citations retain the actual task ID and saved version. A linked task can
  retain both its saved identity and the manually reviewed instruction source.
- Stable source IDs prevent repeated intake. Normalized repeated content warns
  before a duplicate is accepted. Recent saved approvals are checked for already
  included sources. Potential task-title matches require linking/review rather
  than immediately offering another creation. These are conservative heuristics,
  not an organization-wide inbox or a global semantic deduplication guarantee.

Unaccepted intake and unsaved drafts live only in memory and warn before leaving
the browser. Approved selected source evidence is saved with its SOD. Intake is
limited to 60 sources per visit and 8,000 characters per original message; SODs
are limited to 50 selected items and a 90,000-character approval envelope.

## Deposit verification boundary

The six lanes are reported submitted, reported received, verified deposited /
credited, pending confirmation, failed/disputed report, and manual reconciliation.
Ambiguous or multiple reported stages go to reconciliation. Multiple amounts
remain unknown until human review. Amount, reported source date, property and
source reference appear only when supplied or staff-linked.

The verified deposited/credited lane is **Not connected**. Staff cannot select it
in message review. Even a message claiming funds were credited is only a reported
receipt; classification approval is not bank verification. All message-derived
financial facts remain labeled reports. This phase neither reads an invented
financial ledger nor changes deposit, payment or reconciliation records.

## SOD review and exact persistence scope

The existing SOD controls edit titles/actions, order or remove selected items,
add manual priorities, retain recurring responsibilities and edit the final text.
Morning groups work into Immediate priorities, Deposits and payments, Property
operations, Staff assignments, Pending and blocked, and Additional work. Empty
sections are omitted. Generated rows cite saved tasks or manual sources;
additional priorities and recurring work identify their manual planning origin.

**Accept for SOD draft does not create a task.** Open Task Intake review prepares
a source-backed `oaktown.task-intake.v1` export. The user must choose/create an
existing intake session, resolve context, confirm and Save using that workflow.
Only that independently approved path can create an operational task. Its normal
backend authorization, audit, validation and duplicate controls are preserved.

**Review & approve SOD** previews the exact generated/edited text and planning-only
count. Explicit confirmation writes one existing `public.ops_events` row:

| Field | Value / authority |
| --- | --- |
| `id` | Stable random event UUID, reused for an uncertain identical retry |
| `entity_type`, `entity_id` | `morning_plan`, stable per-draft plan UUID |
| `event_type` | `morning_plan_approved_v1` |
| `summary` | Approved morning-plan label and Eastern date |
| `event_metadata` | `oaktown.morning-plan.v1`: plan ID, revision, work date, exact SOD text, rows, source evidence and draft inputs |
| `actor_id`, `occurred_at` | Omitted by browser; stamped by the existing database trigger from authenticated actor/server time |

There are no new tables, migrations, endpoints, mail credentials or dependencies.
No task status/priority/due/follow-up or deposit field is affected by approval.
Active editor/admin RLS controls inserts. Existing active staff journal-read
permissions apply to saved SODs and **selected original source content**; the
confirmation explains this scope. Do not paste information outside that audience.

The shared reviewed-write lifecycle locks the editor while checking/saving/
verifying. Independent GET must match event ID, exact payload and server actor/
timestamp before success. An uncertain result blocks new approvals; Check saved
approval verifies the original ID or offers an explicitly confirmed identical-ID
retry. The primary key prevents duplicate append/overwrite. A 403 is not success.
Sign-out/account changes invalidate callbacks and clear private UI immediately.

Approved records are immutable; new edits create a new draft revision. Recent
approvals are read only for the current actor and Eastern date (up to ten), and
restored only on explicit request. Unsaved replacement requires confirmation.
Incomplete/inconsistent saved plans produce a warning and keep the current draft.
Approved JSON, including source evidence, can be downloaded by the signed-in
reviewer using the existing authorization context.

## Refresh, conflicts and execution

Refresh retains manual intake, wording, generated text and immutable approval.
A selected task changing version, closing or disappearing marks the draft stale;
staff must reload its wording or remove it. Failed/incomplete reads keep the draft
and disable approval/execution. Timestamp comparison preserves microseconds.

Approval preflight and Start confirmation both refresh the shared snapshot and
check selected source versions/current Eastern date and editor access. Start
opens the existing Focus Board without creating tasks or changing saved order,
priority, dates or statuses. Actual approved task IDs get a small plan marker.
Planning-only items remain counted separately; they never become synthetic task
cards. During execution the approved SOD remains visible as historical context
when existing task actions make progress; closed tasks lose their active marker.

The journal is an immutable personal approval history, **not** a server-enforced
multi-user SOD workflow or atomic lock across task versions. Another user can edit
a task after the preflight; the plan does not overwrite it. Focus actions retain
their own existing atomic/version-guarded authorization. A dedicated transactional
plan lifecycle requires a separately reviewed backend capability if later needed.

## Changed source and test files

| Files | Purpose |
| --- | --- |
| `morning-model.js`, `morning-center.js`, `morning-center.css` | Pure intake/provenance rules; desktop controller and styling |
| `index.html`, `workspace.js` | Opt-in route, existing controls and native review/approval/Start dialogs |
| `sod-model.js`, `sod.js` | Extend the single SOD editor with grouped review, sources, preserved drafts and approval snapshots |
| `task-intake.js` | Existing reviewed editor handoff and saved-proposal receipt notification |
| `focus-board.js` | Approved actual-task marker; existing sorting/actions unchanged |
| `tests/morning-model.test.cjs`, `tests/morning-fixtures.cjs`, `tests/morning-center.e2e.spec.cjs` | Fictional model/security/desktop browser cases |
| `tests/morning-journal-database.cjs` | Existing journal/RLS/attribution tests in disposable PostgreSQL |
| `scripts/capture-morning-center.cjs`, `.github/workflows/checks.yml` | Reproducible fictional desktop captures and CI checks |
| `tests/workspace.test.cjs`, workflow inventory and roadmap/audit notes | Maintained route expectations and architecture evidence |

## Verification and desktop review

- 211 Node model/API/unit checks pass.
- The 18 new Chromium cases cover intake, XSS-as-text, classification, duplicates,
  reviewed proposals, Task Intake handoff, SOD editing/approval, source evidence,
  refresh/version conflict, lost-response recovery, session expiry/sign-out,
  write-free Start and execution context, plus more than 1,000 real-shaped tasks.
- Desktop geometry at 1280/1440/1920 and scoped axe checks across all six
  appearances pass. Native dialogs trap focus, support Escape and restore focus.
  Morning introduces no animation, so it works with reduced motion unchanged.
- All 253 browser cases pass locally. The existing suite is retained, including its historical security
  and responsive cases. No new mobile suite, gesture or screenshot is introduced.
- Disposable PostgreSQL 16 verifies editor acceptance, viewer/inactive/unapproved/
  anonymous denial, server-overridden actor/time, exact readback, duplicate-key
  rejection, immutable journal and zero changed tasks. Existing schema, task,
  security, concurrency and rollback checks pass unchanged.
- Workflow inventory covers 28 families / 61 active first-party scripts. Syntax,
  frozen Deno type check and dependency audit pass (zero vulnerabilities). Local
  Deno uses the system CA store for the managed environment's trusted proxy.

Full-suite and exact-head GitHub CI evidence is recorded in the draft PR.
No live staff session, operational task, tenant message or payment is used.

Fictional desktop-only captures live in
[`ui-review/focus-board-phase-4/`](ui-review/focus-board-phase-4/):

| Review | Screenshot |
| --- | --- |
| Overview, 1440px | [Overview](ui-review/focus-board-phase-4/desktop-overview-1440.png) |
| Other supported desktop widths | [1280px](ui-review/focus-board-phase-4/desktop-overview-1280.png), [1920px](ui-review/focus-board-phase-4/desktop-overview-1920.png) |
| Incoming source review | [Original message and classification](ui-review/focus-board-phase-4/incoming-source-review.png) |
| Deposit states | [Reported vs verified boundary](ui-review/focus-board-phase-4/deposit-classification.png) |
| Staff proposals | [Reviewed instructions](ui-review/focus-board-phase-4/staff-task-proposals.png) |
| Draft SOD | [Editable grouped draft](ui-review/focus-board-phase-4/draft-sod.png) |
| Approved SOD | [Saved approval](ui-review/focus-board-phase-4/approved-sod.png) |
| Start execution | [Confirmation](ui-review/focus-board-phase-4/start-focus-confirmation.png), [Focus Board](ui-review/focus-board-phase-4/approved-focus-board.png) |
| Empty / error | [Empty](ui-review/focus-board-phase-4/empty-state.png), [Read error](ui-review/focus-board-phase-4/error-state.png) |

The capture evidence records fictional fixtures, desktop widths, zero production
records and zero operational writes; the only simulated write is one confirmed
SOD approval event. CI uploads the same desktop capture set. Optional legacy
mobile screenshot generation is disabled; existing regression tests are retained.

## Known limits and decisions for later review

1. Choose/authorize an **in-app** mailbox provider, OAuth scope, source-ID contract,
   secure token handling and retention before automatic read-only email ingestion.
   The chat connector is not that application integration.
2. Identify an authoritative deposit/bank reconciliation source and its permissions
   before connecting the verified lane. Pasted messages cannot provide clearance.
3. Unsaved intake/drafts are visit-only. Only explicitly approved selected evidence
   is durable; no browser storage of sensitive source text is added. A secure
   resumable preapproval inbox/draft system needs a separate architecture review.
4. Confirm saved SOD/source retention and the existing active-staff journal audience
   before rollout. A narrower plan audience or organization-wide multi-reviewer
   approval policy needs server-side design; this PR does not grant new access.
5. Classification/deduplication is rule based and human reviewed. Property identity,
   payment truth, relative deadlines and ambiguous task matches remain manual.
6. Desktop below approximately 1280px is outside this increment's design scope.
   Existing responsive code and critical regressions are preserved.

These are documented integration/policy boundaries, not permission requests for
the completed review branch. No merge, migration, deployment or publication occurs.
