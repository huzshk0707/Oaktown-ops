# Current Oaktown Ops status and next work

Updated November 8, 2026. Main includes merged PRs #40, #41 and #42; PR #23 is closed
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
fictional disposable database tests. The deployment is not equivalent to
database migration; no live Supabase import or production schema change has
been authorized in this PR.

After PR review, request separate approval to apply the single migration,
then generate and approve the private 37-row manifest, preview exact creates,
read back the imported records, and verify Today. Preserve OAK-002 and the
existing completed eight-property notice task. The daily Task Dashboard AI
continues to propose user-approved task updates separately.
See [controlled import plan](MASTER-BACKLOG-CONTROLLED-IMPORT.md).

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
