# Oaktown Ops — active roadmap (22 November 2026)

**Last verified:** 2026-11-22 · GitHub main and read-only Supabase snapshot.

**Authority:** This section is the current delivery plan. The dated material under “Historical roadmap snapshots” is preserved for audit context, not an open build queue. Status was cross-checked against GitHub main, CI/Pages and read-only Supabase inspection on 22 November 2026. Numbers below are a dated snapshot, not automated live counters.

## Product direction

**Huzy's desired flow:** Gmail and supplied texts/call transcripts → ChatGPT retrieves the existing task and history in Supabase plus the relevant Oaktownbrain SOP → proposes a precise create/update and the next action → Huzy reviews and approves → an authorized scoped workflow writes and independently verifies the Supabase record → Oaktown Ops displays the shared saved state and provides execution controls.

- **Supabase:** canonical operational tasks, status, event history, dates, links and approved plans. Never rely on chat memory as the database.
- **Oaktown Brain:** curated SOPs, Leslie's confirmed decisions, workflow exceptions and evidence pointers.
- **ChatGPT:** one Project chat per shift. “Start my shift” reads current tasks and their history from Supabase, with the connected app and GitHub guidance verified from a fresh chat. Gmail and relayed softphone updates feed reviewed proposals.
- **Oaktown Ops:** one shift workflow from the Morning Command Center through the reviewed personal EOD, with existing document and operations tools available in the full workspace. The required external timesheet records time.
- **External sources:** TurboTenant is authoritative for current tenant/payment/lease facts as applicable; REI Hub for posted accounting; Gmail/Drive for message and source evidence. Email statements alone do not verify a deposited payment. Keep high-impact sends, postings, leases and notices separately reviewed and authorized.

Huzy's shift is 7 PM–5 AM Asia/Kolkata, which overlaps Louisville business hours (8:30 AM–6:30 PM EST or 9:30 AM–7:30 PM EDT). A shift is grouped under its start date across local midnight. Preserve actual timestamps and the applicable Louisville work date.

## Verified release baseline and activation gaps

- Main at [b91b4c7](https://github.com/huzshk0707/Oaktown-ops/commit/b91b4c7df2920a03df1670d28a67ee8ae5a148a3), merged through [PR #86](https://github.com/huzshk0707/Oaktown-ops/pull/86) (morning UX/motion), [#87](https://github.com/huzshk0707/Oaktown-ops/pull/87) (original lease checklist provenance), [#85](https://github.com/huzshk0707/Oaktown-ops/pull/85) (Page 8 frontend) and [#84](https://github.com/huzshk0707/Oaktown-ops/pull/84) (Focus Board/Morning release). Exact-main [CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/44090288462) and [Pages deployment](https://github.com/huzshk0707/Oaktown-ops/actions/runs/44090286047) succeeded on November 17. Before this documentation PR there were zero open PRs; [issue #83](https://github.com/huzshk0707/Oaktown-ops/issues/83) remains an accounting discovery candidate.
- Existing: Today, Tasks/History/intake, Focus Board with Center Focus and reviewed Complete/Defer/Undo, Morning Command Center and reviewed SOD, personal EOD view, properties/units, notices, renewals, deposit packet preparation and six themes. **Merged code/green CI do not prove successful live staff acceptance.**
- Read-only Supabase snapshot: **46 tasks total; 36 active, including 4 waiting; 34 active have neither due_at nor structured follow_up.** The database should not invent deadlines or treat undated items as overdue.
- Supabase `oaktown-task-api` Edge Function version 3 is ACTIVE and the morning plan authorization migration is registered as `20261116051226`. **Zero registered scoped task clients, zero provider consents and zero task proposals** at the check. The full ChatGPT-to-approved-task loop is not activated merely because the function exists.
- The Page 8 editor frontend is merged, but migration `20261116060547_lease_preparation_page8_editor.sql` is **not registered in live migration history**; the preparation RPC/private schema were absent at the inspection. Real blank unsigned master, source mappings and completed-reference comparisons still require approved verification. Do not equate UI publication with working saved Draft/Ready/Approve or full lease export.
- The morning_plan_approved_v1 event count was zero at inspection; this is not evidence that no SOD emails were sent outside Ops.

## Release sequence

### First screen — Morning Command Center

- **OPS-SHIFT-BRIEF** is the first build. Put three answers in the first desktop view: **What needs attention now? Who am I waiting on? Where do I pick up?** Show overdue, due and urgent work, recorded dependencies and follow-up dates, then one actionable task and its saved next action. Identify suggested focus clearly and open the exact displayed task in the existing Focus Board.
- Use the existing shared task snapshot. Keep Start of Day as an optional draft for Leslie and preserve the reviewed plan, Tasks/History/Add or import, and full workspace routes. Review with fictional tasks at desktop sizes. The navy/cyan instrument and restrained motion from the command-console walkthrough guide the presentation.
- [PR #89](https://github.com/huzshk0707/Oaktown-ops/pull/89) tracks the screen change. Its fictional rehearsal can proceed while the live connector and lease activation are assessed separately.

### Operational activation — parallel with the first screen
1. **OPS-ACTIVATE-TASK-CONNECTION:** Operator verifies OAuth-server settings, asymmetric token hook, client/redirect registration, exact scoped roles and explicit Huzy consent. Start **read-only**. Run a staff-authorized fictional task search/preview/approval/save/audit/readback test, plus revoke/stale/replay/denial checks before enabling real use. Never substitute management SQL or service-role shortcuts. Document observed outcome, not just a green source test.
2. **OPS-LEASE-PAGE8.ACTIVATE:** Separately review the staged migration's exact SQL/hash/rollback and existing live schema. Only an authorized operator may install it after approval, then verify grants/RLS/read-only RPC responses and unchanged production row counts. Real PDF/master comparison and signed-versus-unsigned restrictions are independent acceptance gates. See [deployment packet](releases/LEASE-PAGE8-2026-11-16.md).
3. **Release hygiene:** Verify main tags and release notes without rerunning historical imports or claiming the already-merged #84/#85/#86/#87 need another merge.

### Daily Work Readiness — after the first screen
- **OPS-PLANNING-DATA:** Improve the *existing* Needs Planning flow, not another dashboard. Review saved owner, exact next action, waiting person/blocker, recorded due date, follow-up/check date, source freshness and intentionally unscheduled state, one task at a time.
- Suggest missing metadata but **never infer and silently write** dates, owner, property/unit association, payment status or priority. Display “unknown/needs review” when evidence is missing.
- Reuse the existing reviewed, version-checked task editor/intake RPCs; preserve stable IDs, existing due dates unless deliberately changed, audit/readback and shared `OpsToday` task snapshot. Waiting tasks stay active but should not masquerade as immediately executable focus work.
- Keep the chosen task and a precise resume note available across sessions as a later persistence step. Surface Gary’s Friday hours as recurring work when configured.
- **Acceptance:** After authorized staff review, each selected active task has a verified actionable next step and a confirmed schedule/follow-up or explicit “no date needed”; Today, Morning and Focus display the same saved result. Fictional tests cover conflict/retry, sign-out, keyboard/reduced motion, all six themes and Eastern date boundaries. No production mass update.

### Phase 2 — Personal work and trustworthy EOD
- **OPS-PERSONAL-WORK:** Record a Huzy-performed action on an existing task **without requiring the whole task to be closed**; independently attribute Leslie's work to Leslie. Capture actual performer, America/New_York work date, concrete action, source/evidence, audited event and verified readback. Extend native editor and scoped task-connection contract only with separately reviewed security tests.
- **Acceptance:** Friday’s statement stays one task. Huzy’s preparation and delivery to Leslie, then revision and delivery to the attorney, appear as two distinct actions in the shift’s EOD even across local midnight. Gary’s entry shows confirmed progress and the saved resume step. Work performed by others is attributed in the property history. Existing reporting changes on [the EOD review branch](https://github.com/huzshk0707/Oaktown-ops/commit/8d697ea78bc838299ce41f2504fc3f1b126d20b2) await integration and end-to-end acceptance.

### Phase 3 — Intelligent incoming-work review and quick capture
- **OPS-AI-INTAKE:** In ChatGPT, retrieve authorized Gmail messages/attachments when explicitly invoked, accept Huzy-pasted Leslie texts/call transcripts, check exact Supabase task IDs and history, consult Oaktownbrain procedures, and propose create/update/waiting/follow-up decisions before a human-reviewed scoped write. Duplicate detection and precise source references are mandatory. No unapproved polling or external sends.
- **OPS-QUICK-CAPTURE:** Add a lightweight capture affordance accessible from the execution experience; unsaved ideas remain clearly unsaved until reviewed and persisted through the existing flow. Preserve focus context. Reuse Morning's source review instead of creating a competing inbox.
- ChatGPT Gmail access is **not** an in-app Gmail service; consider a separately authorized read-only mailbox backend only if operational testing establishes that need.

### Phase 4 — Reliability and focused workbenches
- **OPS-RENEWAL-ATOMIC / OPS-RECOVERY:** Transactional, idempotent renewal journal append with conflict handling; explicitly owned platform/Auth/doc recovery and security-advisor disposition.
- **OPS-LEASE-EXPORT / OPS-RESUMABLE-CASES:** Complete verified ten-page unsigned lease generation only after original-master, disclosure/deposit and source-version approvals; allow reviewable application/deposit/lease handoffs without treating preparation as execution.
- **Inspection through maintenance:** Schedule the inspection on the property. Record Leslie as the performer when confirmed, attach the source and findings, and record Huzy’s separate PDF filing action. Give each repair its own next action, responsible party and confirmation of closure. Property Maintenance and the pending board show the same repair records.
- **OPS-PIPELINES:** Define further maintenance/work-order, lead/listing/application handoffs using actual staff practice, permissions and audit contracts.
- **OPS-ACCOUNTING:** [Issue #83](https://github.com/huzshk0707/Oaktown-ops/issues/83) remains discovery-only: Gmail invoice evidence, REI Hub import feed types, loan/card transfers and statement-grounded splits. REI Hub remains the posting source of truth; do not auto-book transactions or guess property allocation.

## Future projects

- **Oaktown Records:** A separate private GitHub repository. “Closing the day” in the daily ChatGPT chat creates or updates one Markdown record keyed to the shift start date and verifies the GitHub revision. Include decisions, who did what, sources and open questions. Keep sensitive originals in restricted storage.
- **Oaktown Brain:** Curate reusable operating knowledge. From a fresh chat, verify that a question about a property finds the proper source, respects later corrections, and reports missing information accurately.

## Build discipline and exact next action

**No new dashboard rewrite, visual-theme expansion, second task database or unreviewed bulk task migration.** Follow [AGENTS.md](../AGENTS.md) branch/PR ownership rules. Separate production activation from Codex feature PRs. Check live refs and scope before edits; protect private sources and credentials.

**Next operator action:** Begin `OPS-ACTIVATE-TASK-CONNECTION.1` with read-only verification of actual Auth/OAuth configuration, registered client and scoped session. Record missing setup. After safe consent and test-read checks, run the approved fictional write acceptance; do not act on real tasks as a smoke test.

**Next Codex step:** Verify the three answers in the Morning Command Center with fictional tasks in PR #89. Follow up in Needs Planning with reviewed scheduling and next-action changes for one task at a time. See [TASKS.md](../TASKS.md) and [HANDOFF.md](../HANDOFF.md).

---

## Historical roadmap snapshots (superseded by the active plan above)

## November 16 lease editor update

PR #85 adds reusable original-PDF profiles, independent room/column placements,
blank dependent fields for absent rooms, native saved Draft/Ready/approval and
immutable condition history. Source merge/publication is user-authorized;
backend migration installation and comparison with the restricted originals are
separate outstanding activation steps. See [implementation and testing](LEASE-PAGE8-EDITOR.md)
and [deployment packet](releases/LEASE-PAGE8-2026-11-16.md). Earlier dated snapshots below are historical.

### Historical Oaktown Ops status (November 15, 2026)

Updated November 15, 2026. Main includes merged PRs through #68. The current
baseline passed CI and Pages publication. The audit follow-up brings daily actions
above summaries, adds a read-only Needs planning queue and guards temporary
deposit/SOD drafts against accidental reload. Release evidence belongs in its PR.
See [the current audit](CURRENT-AUDIT-2026-11-15.md) for findings and next releases.
Personal EOD attribution through the editor/connector, resumable drafts, atomic
renewal journal writes and the full ten-page lease exporter remain follow-up work.

Archived task profiles also retain their saved property, unit, lease and renewal
links for read-only history. Archived tasks remain excluded from active work;
missing references stay labeled, and viewing history never restores a task.
See [the technical audit](TECHNICAL-AUDIT-2026-11-04.md) and
[connected-workspace guide](CONNECTED-WORKSPACE.md) for scope and evidence.

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Today/tasks/EOD | Intake, reviewed editing with saved related-record links, work reports; connected Action Centre with saved filter presets | Staff validation of task detail and deep links on the intended live site |
| Navigation | Ctrl/Cmd+K global search, quick actions, comfortable/compact density | Measure real staff use; improve bounded problems |
| Properties | Protected list/detail browser; connected property and independent unit profiles, recorded rents, linked people/leases/tasks and expandable activity | Source reconciliation, controlled editing and further integrity guards |
| Notices | Unit selection, local drafts, CSV import, message preparation, PDF/ZIP/Firm Book | Shared evidence associations, staff verification and real printing |
| Renewals | Five-page unsigned PDF; separate tracking/preparation; journal-backed action view | Retention/signing/executed-contract lifecycle remains separate |
| New leases | Original-PDF mapped ten-page editor, independent 3–5-bedroom placements, native draft/review/approval and condition history; absent-room N/A labels with blank dependent lines | Install staged backend; approve real-master maps/fonts/page-7 choices and compare restricted originals; confirm deposit allocation rules |
| Reference library | Ten original PDFs in restricted Drive; staff-only catalog and browse/open UI | Categories, verified property/unit links, versions and controlled uploads |
| Recovery | Verified restore of 24 application tables/1,678 rows and ten PDFs; restricted recovery ZIP with readback checksum | Scheduled retention and full Supabase Auth/provider/platform restoration |
| Database hardening | Eight live composite keys, server journal attribution, nine indexes and reviewed Today RPC correction | Nullable task-to-renewal scopes, provenance/target controls and repeatable import tooling |
| Listings/leads/applications | Guided workflows and prompt builders | Full operational integrations and application/deposit handoff |
| Appearance | Six themes, existing tab/depth treatment, responsive connected views and compact density | Targeted usability refinements; no framework rewrite |
| Maintenance/approvals/financial modules | Saved maintenance tasks are visible; full modules are not tracked | Define workflow, permissions, storage and business rules before expansion |

## Workflow-state review — November 11, 2026

The active workspace/studio and task connector now have a source/test inventory
covering 25 workflow families. Task editing and renewal journal writes share an
explicit checking/saving/verifying/review-required lifecycle. Uncertain outcomes
retain the draft, block blind retry and require reloading the saved version.
Late callbacks are scoped to the selected record and account; background renewal
reloads preserve unsaved text. See [workflow states](WORKFLOW-STATES.md) for the
transition contract, source inventory, inspection commands and tests.

The next bounded reliability task is transactional renewal-journal append with
an expected prior event and stable retry identity; the current client preflight
does not provide that server guarantee. No database or authentication change is
part of this UI lifecycle increment. CI/merge/publication evidence belongs in its PR.

## PC apps removed — November 11, 2026

The owner reported that the PC apps/PDFCraft shortcut did not work on the intended
PC and asked to remove it. The toolbar entry, dialog, setup generator, native
launcher sources and feature-specific tests/CI job are removed. No replacement
desktop launcher is planned. If the Windows helper was previously installed,
its removal is a separate action on that PC; see [cleanup instructions](WINDOWS-APP-SHORTCUTS.md).

## Monthly reminder follow-up

Today adds private recurring bill/reminder windows, separate per-month sent and
verified states, copy/Add to SOD actions and an optional recurring calendar export.
Dates and payees are read behind the existing staff session; no production
schedule is embedded in the site. Source merge, protected configuration and
database rollout are tracked separately. See [monthly reminders](MONTHLY-BILL-REMINDERS.md).

## Approved-application deposit preparation

Applications now offers a reviewed holding-deposit DOCX and email packet, followed
by the existing lease-preparation handoff. Holding amount is the confirmed base
security deposit plus $150 per pet. Full first-month rent and its move-in due date
are entered separately; no monthly pet-rent rate or proration amount is inferred.
The security-deposit credit appears in every form, while only pet cases include
the non-refundable pet portion. Every packet includes the same vendor PDF; an
optional staff-supplied payment image can accompany the email. Inputs are held
in memory behind the shared staff session. See [deposit preparation](DEPOSIT-PREPARATION.md).

## SOD email format — November 9 refinement

The SOD uses the owner's supplied opening, one priority per bullet, the request
for additional priorities, and a warm closing for the Louisville/Eastern weekday.
Specific reviewed tasks precede editable Tenant Communications, REI Hub – Import
Feed, and Maintenance & Leasing defaults. Historic example tasks and personal
information are not seeded into a new daily plan. See [the SOD guide](MORNING-PLAN-SOD-V1.md).

## Notice preparation workflow — PR #53

The notice editor improvement follows the staff's repeatable manual sequence:
select ordered properties; open each property's TurboTenant Payments tab separately;
export and paste its CSV statement; review imported charge rows and the notice PDF
preview; download that property's PDF; copy the selected tenant's message/email;
then attach the PDF and paste the message into email and TurboTenant manually.

- The notice selector accepts a pasted ordered list, requires explicit
  unit choices for ambiguous names, and keeps drafts in list order.
- The embedded editor adds **Go to tenant message** beside **Download property PDF**.
  This follows the currently selected notice without scrolling to the top tabs.
  The message screen displays the current notice address, offers **Copy email**
  only for one exact-linked address, retains **Copy message**, and returns to the
  same selected notice via **Back to notice editor**.
- This PR does not download external payment data, connect to TurboTenant, send
  email, upload PDFs, mark notices as served, or change the legal notice template.
- Review hardening assigns returned alias arrays, invalidates changed paste
  lists, locks preparation controls during requests and uses shared theme colors.
  Fictional browser checks cover ordering, ambiguous/duplicate units, edited-draft
  preservation, optional alias failures, CSV import, PDF downloads, contact
  association and the message/back path. CI and publication are tracked in PR #53;
  real notice sending and service remain separate manual actions.

## Daily workspace and task library — November 9 follow-up

Today now keeps the morning plan/SOD, themed summary cards, urgent and due work,
selected focus and EOD report. The existing Task Intake destination becomes Tasks,
with All work (searchable active tasks, work levels, breakdown and renewal watch),
History (completed and archived tasks), and Add / import (reviewed intake).
Today shortcuts open the correct Tasks view. Task settings/connections live under
Tasks, and existing task editing uses the shared dialog from either workspace.
Routes and browser history retain the selected task view; no new data model is added.
See [daily workspace scope](DAILY-WORKSPACE.md) for verification and release evidence.

Future direction requested by the owner: an Iron Man-inspired daily command view
with contextual reminders, motion and swipe interactions. Left-swipe snooze and
right-swipe completion are ideas for a later increment, with explicit snooze timing,
reviewed completion and keyboard/button alternatives. They are not implemented in
this layout change. Today’s final name and EOD refinements remain open decisions.


## Today dashboard layout refinement

The dashboard summary cards use a normal arrow cursor while their text remains
selectable. Grid placement for the lower dashboard cards is now scoped to its own
container, so Urgent and due, Focus now and Other work levels no longer overlap.
Browser inspection with fictional tasks verified all six themes at seven widths
from 320 to 1440 pixels, including the workstation breakpoint, with no overlapping
cards or horizontal overflow. Focus selection and task review remain keyboard
accessible. This is a stylesheet-only behavior fix; deployment is tracked in the PR.

## Today workstation — staged A1 increment

Stage A1 is implemented on a separate feature branch for review, without database changes.
The Today page adds cross-level urgent/due tasks, user-selected focus, groups derived
only from saved task fields, compact renewal watch, and searchable archived-task
history with a version-checked Restore route. The Action Centre no longer creates
synthetic action items from every imported renewal case; saved renewal tasks remain
visible and full cases remain searchable in Renewals. The existing legacy Tasks
intake stays temporarily because it still owns manual creation/import. It will
be removed only when Today can safely replace all of its required actions.

Stage A2 must reconcile/import the Master Backlog after checking all existing
records and resolving OAK-002 with Leslie; it must not mistake all workbook rows
for independent pending tasks. A separate Stage B will implement audited and
verified ChatGPT-to-Supabase task updates. See [Today A1 design](TODAY-WORKSTATION-A1.md).

## Controlled Master Backlog import — PR #45 (historical staging record)

PR #44 is merged into main and provides the focus-first Today workstation.
Historical review: PR #45 adds an additive task-code/parent schema and review-only importer with
private receipts, optimistic preview confirmation, duplicate protection and
fictional disposable database tests. Review hardening adds strict NULL/type
validation, a private guarded implementation, receipt-ledger RLS, concurrency-safe
parent checks and identity-checked browser read-back. The staged migration is
`20261108050604_master_backlog_controlled_import.sql`. The deployment is not equivalent to
database migration; no live Supabase import or production schema change has
been authorized in this PR.

Historical rollout plan (superseded by the live-history observation below): request separate approval to apply the single migration,
then generate and approve the private 37-row manifest, preview exact creates,
read back the imported records, and verify Today. Preserve OAK-002 and the
existing completed eight-property notice task. The daily Task Dashboard AI
continues to propose user-approved task updates separately.
See [controlled import plan](MASTER-BACKLOG-CONTROLLED-IMPORT.md).

## ChatGPT task connection — Stage B

The authenticated task-connection increment adds a portable plugin, OAuth MCP
endpoint, dedicated database role, reviewed proposals and exact receipt read-back.
It is independent of the still-unapplied Master Backlog schema. New tasks are
General operations; the agent cannot change saved portfolio identities, delete,
archive, send notices/messages or execute SQL. Today adds compact connection
setup, client revocation and recent saved-change navigation. Normal staff sessions
and existing task/document workflows are retained.

The single migration is `20261108071838_authenticated_task_connection.sql`.
The backend migration is applied and the Edge Function reports ACTIVE; existing
business tasks/events were unchanged. Source merge, owner Auth configuration and
a verified ChatGPT sign-in/save are separate states. Owner OAuth/token-hook setup
and plugin installation must be checked explicitly; packaged source does not mean
that a Project automatically has write tools. See the
[task connection setup and verification guide](CHATGPT-TASK-CONNECTION.md).

Next milestones, in order:

1. **Verify the related-record workflow after deployment.** Pages is enabled at
   https://huzshk0707.github.io/Oaktown-ops/ and PR #42's deployment succeeded.
   Verify this follow-up's deployed assets and real staff navigation after merge.
   The repository is now public; tenant records remain outside Git and behind the
   shared staff session/RLS and restricted document storage. Mocked browser tests
   do not certify live staff permissions or document execution.
2. **Complete operational recovery.** Establish retention/access ownership and scheduled
   private snapshots. Restore Supabase Auth/provider settings through supported platform
   backups; the verified application-data/document exercise has narrower scope.
3. **Finish data integrity.** Enforce task-to-renewal context for nullable/property-level
   cases, immutable source attribution, supported targets/parent changes and repeatable
   import dry runs, fingerprints, conflict review and replay protection.
4. **Complete the new-lease PDF.** Confirm deposit/pet-fee rules and page 7 disclosures,
   map pages 1/10, and compare all ten pages to the approved masters and examples.
5. **Expand document management.** Add explicit categories, property/unit associations,
   dates, versions and permission-controlled retention without inferring links from names.
6. **Build the full maintenance workflow.** Requests, exact property/unit, priority,
   technician, confirmed entry arrangements, work, before/after evidence, review and
   closure. Recurring work needs explicit schedules/ownership; no guessed defaults.
7. **Complete operational handoffs.** Listings, lead/application records and the
   application/deposit-to-lease flow, then reporting based on measured saved data.

Autonomous messaging, signing, legal service and a replacement accounting ledger
remain outside this phase. Preserve existing workflows and improve module boundaries
gradually. The native `AGENTS.md` contains project-specific development instructions;
no third-party Claude hooks or automatic learning tools are installed.


## UI/UX refinement — November 9, 2026

PRs #50 and #51 are merged. The Morning Plan saved-task selector and its Add
button are enabled correctly after verified sign-in; the fixed SOD branch passed
all CI jobs before merge. Completed work and archived history remain distinct.

A subsequent UI refinement implements a compact workspace header, an accessible
mobile menu, an Appearance dialog, active-task search/filters/pagination, stable
workflow and connected-record URLs, visible guide/draft limitations, and notice
step navigation. Setup/import tools live under Settings & connections.
See [UI/UX refinement](UI-UX-REFINEMENT.md) for references, behavior and evidence.
This increment changes source/UI only; no database migration or business records
are changed. Source merge, Pages publication, and live authenticated staff checks
remain distinct verification steps.

## November 15 database-status clarification

Read-only audit found the controlled-backlog migration registered live as
`20261108084954`, while the historical source draft is `20261108050604`.
The receipt ledger contained no import receipts. Applied schema does not prove
an import occurred. Do not rerun either migration from filename comparison alone;
reconcile registered SQL and recovery evidence in a dedicated database review.
The reminder and authenticated-connector migrations are also registered live.
Connector activation and actual reminder confirmations require their own evidence.

## Focus Board — Phase 1 review branch

The separate `feature/focus-board-phase-1` branch adds an opt-in `#/focus` task
carousel, documented in [the Phase 1 architecture and order](FOCUS-BOARD-PHASE-1.md).
It reuses the shared staff session, task snapshot/refresh, clocks, search and
appearance controls. A shared paginated reader removes the task request's first
1,000-row limit. Board interactions change selection only; task business statuses
and Today rules are preserved. Full workspace routes remain available.
This is a review preview, not a merged/deployed feature. Do not merge automatically.
Later phases, completion/defer gestures, confirmation and Undo remain unimplemented.

## Center Focus Mode and HUD — Phase 2 review branch

`feature/focus-board-phase-2` builds on the current PR #70 head and targets its
Phase 1 branch for independent review. The [Phase 2 guide](FOCUS-BOARD-PHASE-2.md)
records the native task-detail modal, existing Review handoff, session/refresh
protections and priority/motion treatment. Shared data/auth, task records and the
production landing route are preserved. Both increments remain unmerged and
unpublished; completion/defer/Undo and later morning-flow changes remain future work.

## Focus Board — Phase 3 safe-action review branch

`feature/focus-board-phase-3` builds on the unchanged Phase 2 head.
[Phase 3 architecture and safety](FOCUS-BOARD-PHASE-3.md) documents confirmed
Complete, follow-up-only Defer and a version-guarded persisted Undo using the
existing intake RPC. Navigation gestures remain read-only; shared snapshot/auth,
Review and other workspace routes remain intact. This is unmerged source for a
draft PR targeting the Phase 2 branch, without deployment or real task writes.

## Morning Command Center — Phase 4 desktop review branch

`feature/focus-board-phase-4` starts at the unchanged Phase 3 head `536ebca` and
targets `feature/focus-board-phase-3`. The opt-in `#/morning` screen organizes
manual source review, deposit reports, shared tasks and the existing SOD editor.
Explicit approval records a versioned snapshot in the existing authenticated
staff journal; a confirmed transition opens the existing Focus Board. Planning
never changes operational tasks or deposits. See [the Phase 4 guide](MORNING-COMMAND-CENTER.md)
for architecture, desktop screenshots, tests and exact persistence boundaries.

The application has no mailbox ingestion service or verified deposit ledger;
manual intake and a disconnected verification lane are explicit. Next bounded
integration decisions are an authorized application mailbox connector, financial
source, and SOD/source retention/audience. Resumable unapproved drafts and a
transactional multi-user SOD policy remain future work. Desktop widths are
1280/1440/1920; no mobile feature work is added. This branch remains unmerged and
unpublished; Today remains the production entry route and all workflows remain.

## Desktop Command Center — Phase 5 draft

The Phase 5 branch builds on the unmerged Phase 4 Morning Command Center. Its
primary view reads shared saved tasks and authorized approved SOD journal events;
manual intake/planning is retained as an optional secondary workflow. Deposit
integration remains Not connected. Focus sorting/actions are reused. No production
migration, merge or deployment is part of this draft. See
[architecture, contracts, security and limitations](DESKTOP-COMMAND-CENTER-PHASE-5.md)
and [fictional desktop review](phase-5-desktop/README.md). The next bounded
integration task is a scoped, reviewed ChatGPT approved-plan write contract;
the existing task MCP does not provide that capability.
