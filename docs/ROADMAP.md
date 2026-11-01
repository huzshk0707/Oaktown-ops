# Oaktown Ops: current build status and roadmap

Updated November 1, 2026 (Asia/Kolkata). Code baseline: main `f8f3ab592d0e4c5c86625f973f57a66a36626d6c`. This is the current implementation summary; older discovery and release documents preserve historical decisions. Future milestones below are recommendations, not newly approved business rules or authorization to change production data.

## Current stage: v0.6 core workflows, operational validation pending

| Area | Implemented in main | Remaining boundary |
| --- | --- | --- |
| Notices | Unit search/multi-selection, editable local drafts, exact linked tenant-email matching, statement CSV import, PDF/ZIP and Firm Book downloads | Recipient/ledger/template verification remains staff work; no automatic sending, filing or mailing |
| Notice readiness | Screen-only checklist using existing export validation (#22) | Completeness is not legal approval |
| Properties | Staff-protected imported unit/lease/contact browser, responsive desktop list/detail and mobile Back navigation (#21) | New portfolio screens are read-only; legacy address/addressee editor still writes separately |
| Renewals | Five-page unsigned lease PDF and append-only status/notes journal (#10–#13); accessible preparation/tracking tabs with state preservation (#20) | PDF downloads only; no document retention, electronic signature or executed-lease transition |
| Portfolio import | October 27 report records 112 property groups, 124 units and 118 cases | Historical import counts, not a new live count or verification of current terms |
| Account | Shared Supabase session, staff membership gating, recovery UI | Live role matrix, recovery configuration and security controls need verification |
| Other modules | Listings/maintenance placeholders; historical court data preserved | These workflows are not implemented |

## Pull request reconciliation

GitHub's PR list showed one open PR, [#19](https://github.com/huzshk0707/Oaktown-ops/pull/19), during the status review. Its head is `93176973aeca0339e75b591117efad6a41b82886`; it is not an ancestor of main, so this is superseded work rather than a merged commit.

Comparison with merged [#20](https://github.com/huzshk0707/Oaktown-ops/pull/20) (`5857b38`, merge `9901a6e`) confirms that the feature intent is covered: Track renewals default, separate Prepare lease panel, preserved form/review/search/unsaved tracker state, keyboard navigation, and avoiding a forced portfolio reload. #20 also adds dedicated tab styles and accessible panel focus. #21 and #22 are merged into the baseline above.

**Disposition:** close #19 as superseded by #20, without merging its older implementation. Completed: #19 was closed without merging after API access became available. GitHub returned `state: closed`, `merged: false`; the open-PR list was empty immediately afterward (before this documentation change).

**Coverage nuance:** #19 adds a general workspace overflow check at 1024px and a reload-default assertion. Main's lease-tab test covers 1024px specifically, while its general workspace overflow loop covers 320/768/1440px. Retain this small coverage gap for a later focused test change; it is not evidence of a missing tab feature or a reason to merge the older implementation wholesale.

## Next milestones, in order

1. **Reconcile PRs and live evidence.** PR #19 is closed as superseded. Complete [live validation](LIVE-VALIDATION.md), recording deployed revision, authorized role results and outstanding failures. No new module is needed for this milestone.
2. **Verify production controls.** Recheck the historical leaked-password-protection warning, backup restoration, cross-record consistency, database-owned attribution and provenance/column permissions. Treat earlier findings as unresolved until fresh evidence establishes their disposition. Any correction needs a scoped implementation and validation plan.
3. **Design renewal document lifecycle.** Specify private storage and staff-only access, immutable PDF versions, links to the correct renewal/unit/lease, signing evidence and reviewed executed-lease transition. Preserve the old agreement; imported offers and tracker notes cannot establish an executed contract. Build only after the design is approved.
4. **Select the next business workflow.** Candidate separate milestones: unit/lease editing, rent ledger, deposit ledger, listings, maintenance, or court follow-up. Confirm priority and business rules before implementation. Scheduled rent is not a balance; missing deposit records do not mean zero held.
5. **Maintenance.** Consolidate legacy stylesheet overrides with screenshot comparisons, expand tracker-event pagination as volume warrants, and reconcile unresolved original discovery decisions when their source is available.

## Evidence and limitations

- Current local validation: 62 Node tests and 42 Chromium tests passed, with no failures or skips. Browser suites use fictional API fixtures.
- All 31 checked deployed HTML/JS/CSS/master-image assets matched the local main baseline byte for byte. Signed-out navigation and both lease tabs passed at 320/768/1024/1440px with zero uncaught page errors.
- GitHub Actions [checks run](https://github.com/huzshk0707/Oaktown-ops/actions/runs/41227916262) passed all three jobs: checks, browser-downloads and portfolio-schema. The [Pages deployment](https://github.com/huzshk0707/Oaktown-ops/actions/runs/41227915854) also succeeded. PostgreSQL evidence is from CI, not a local database run.
- With the public client key and no staff session, GET requests to 13 protected REST tables each returned HTTP 401; no record bodies were printed or saved. Public auth settings returned HTTP 200. This does not establish authenticated role permissions or database-wide RLS correctness.
- Initial network denials were resolved after the user changed environment settings; a conflicting draft update was rejected and was not reapplied over the user's change.
- No Supabase staff binding/session is configured for this task. Live authenticated reads, controlled writes/recovery, admin security checks and restore drills remain pending.
- No production records, auth settings, schema or backups were changed by this reconciliation.
