# Current Oaktown Ops status and next work

Updated November 4, 2026. Main includes merged PRs #40 and #41; PR #23 is closed
as superseded. The first database hardening migration is now applied live.
The connected-workspace increment is implemented on the feature branch pending
its PR/CI review; source changes do not establish a verified website deployment.
See [the technical audit](TECHNICAL-AUDIT-2026-11-04.md) and
[connected-workspace guide](CONNECTED-WORKSPACE.md) for scope and evidence.

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Today/tasks/EOD | Intake, reviewed editing, work reports; connected Action Centre with saved filter presets | Staff validation on the intended live site |
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

Next milestones, in order:

1. **Release the connected experience and verify hosting.** Review the feature PR,
   confirm the intended live URL (GitHub reports Pages disabled), and validate deployed
   assets plus real staff workflows. Keep the repository private.
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
