# Current Oaktown Ops status and next work

Updated November 4, 2026. Main includes merged PR #40; PR #23 is closed as superseded.
Use [the current technical audit](TECHNICAL-AUDIT-2026-11-04.md) for evidence and limits.
Historical release/discovery notes preserve earlier states and decisions.

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Today/tasks/EOD | Intake, reviewed editing, activity tracking and EOD flows | Continue consistency, provenance and real operational validation |
| Notices | Unit selection, local drafts, statement CSV import, tenant-message preparation, PDF/ZIP/Firm Book | Staff verification and real printing/recovery checks |
| Properties | Imported protected portfolio, list/detail browser and legacy address editor | Consistent cross-record writes, source reconciliation and controlled editing |
| Renewals | Five-page unsigned PDF, progress journal and separate tracking/preparation tabs | Document retention/signing/executed-contract lifecycle remains separate |
| New leases | Guided draft, editable terms, fixed 5%/10% labels and full page 8 with N/A | Ten-page PDF mapping, deposit rules, disclosure handling; visit-only drafts |
| Reference library | Ten original PDFs in restricted Drive; staff-only Supabase reference catalog | Recovery verification and future reference-based features |
| Listings/leads/applications | Guides and prompt builders | Full operational integrations and application/deposit handoff |
| Appearance | Six themes, depth/tab treatment, responsive and guided layouts | Targeted usability fixes; preserve the current design |
| Maintenance/financial modules | Planned | Define business scope and data rules before building |

Priorities, in order:

1. **Hosting and release baseline.** Confirm the intended live URL. GitHub currently
   reports Pages disabled on the private repository. Keep source private while resolving
   the hosting configuration; verify actual deployed assets and staff workflows.
2. **Review and roll out the first database hardening batch.** The staged migration
   protects direct record relationships and journal attribution, with an RPC lease-switch
   correction, indexes, read-only preflight and rehearsed rollback. Production data passed
   the current preflight; the new guards are not yet applied live.
3. **Finish data-integrity controls.** Cover task-to-renewal nullable scopes, immutable
   provenance, supported source targets and repeatable portfolio import dry runs/replay safety.
4. **Verify recovery.** Establish retention/access ownership and demonstrate an isolated
   end-to-end database/document restore. Source PDFs and a schema rollback alone are not
   a complete backup/recovery process.
5. **Complete the new-lease PDF.** Confirm deposit/pet-fee rules and page 7 disclosures,
   map pages 1/10 and compare all pages against the updated master and example layouts.
6. **Improve existing modules gradually.** Standardize shared validation/errors and module
   boundaries, then consolidate styles with screenshot comparisons. Preserve working PDF
   outputs and UI. Broader maintenance, ledger and external integrations follow bounded scopes.

Native `AGENTS.md` instructions now record the stack, privacy rules, verification
commands and current handoff sources. This is a small project-specific development
setup; no third-party Claude hooks or automatic learning tools are installed.
