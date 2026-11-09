# Current Oaktown Ops status and next work

Updated November 8, 2026. Main includes merged PRs #40–#45; PR #23 is closed
as superseded. The first database hardening migration is now applied live.
The connected-workspace increment from PR #42 is merged into main. A follow-up
review simplifies the dashboard: its animated Connections panel is removed in
favor of compact source-linked records inside task review. Source changes do not
establish a verified website deployment.
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
| New leases | Guided draft, editable terms, fixed 5%/10% labels and full page 8 with N/A | Ten-page PDF mapping, deposit rules, page 7 disclosures; visit-only drafts |
| Reference library | Ten original PDFs in restricted Drive; staff-only catalog and browse/open UI | Categories, verified property/unit links, versions and controlled uploads |
| Recovery | Verified restore of 24 application tables/1,678 rows and ten PDFs; restricted recovery ZIP with readback checksum | Scheduled retention and full Supabase Auth/provider/platform restoration |
| Database hardening | Eight live composite keys, server journal attribution, nine indexes and reviewed Today RPC correction | Nullable task-to-renewal scopes, provenance/target controls and repeatable import tooling |
| Listings/leads/applications | Guided workflows and prompt builders | Full operational integrations and application/deposit handoff |
| Appearance | Six themes, existing tab/depth treatment, responsive connected views and compact density | Targeted usability refinements; no framework rewrite |
| Maintenance/approvals/financial modules | Saved maintenance tasks are visible; full modules are not tracked | Define workflow, permissions, storage and business rules before expansion |

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

## Controlled Master Backlog import — PR #45 (staged source, not deployed)

PR #44 is merged into main and provides the focus-first Today workstation.
PR #45 adds an additive task-code/parent schema and review-only importer with
private receipts, optimistic preview confirmation, duplicate protection and
fictional disposable database tests. Review hardening adds strict NULL/type
validation, a private guarded implementation, receipt-ledger RLS, concurrency-safe
parent checks and identity-checked browser read-back. The staged migration is
`20261108050604_master_backlog_controlled_import.sql`. The deployment is not equivalent to
database migration; no live Supabase import or production schema change has
been authorized in this PR.

After PR review, request separate approval to apply the single migration,
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
