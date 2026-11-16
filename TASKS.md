# Tasks — Oaktown Ops

Prioritized from current main code/README, roadmap/audit and live open PRs on
2026-11-16. No open GitHub issues were returned at this inspection. This is a
planning backlog, not authorization for operational writes or feature merges.
Account owner is unclaimed unless an active branch/PR claim says otherwise.

## P0 — completed release (2026-11-16)

- [x] **OPS-FOCUS-RELEASE** — hp completed, claim released; [#84](https://github.com/huzshk0707/Oaktown-ops/pull/84) merged and published at exact main **e96beea6dbb7b3c18dd891bd5b164823b11e55cc**, immutable annotated **v0.5.2**. All eight source heads retained. Main CI **43810464959** green (**222 unit/API / 272 browser**, SQL/Deno/audit); exact-SHA Pages **43810463425** green.
- [x] **OPS-FOCUS-RELEASE.MERGE-PAGES** — published postflight **8/8**, exact asset SHA-256 comparisons **12/12**, remote annotated tag object and peeled release SHA verified. No source branch deletion, backend redeployment or operational write.
- [x] **OPS-FOCUS-RELEASE.HTTP-REVIEW** — independent HTTP/PR review complete. Backend management version/DB/RLS/counts attributed to operator; public health 1.1.0/eight tools and anonymous denial independently checked. Reproduce `NODE_USE_ENV_PROXY=1 node docs/releases/verify-focus-http.cjs --published`. Evidence: docs/releases/FOCUS-2026-11-16.md.

## Completed staging / activation backlog

- [x] **OPS-PHASE6.1** (ravi, `ravi/phase6-integration`): inspect #75 and task OAuth/API/approval authorization; aggregate-only metadata; document activation gates.
- [x] **OPS-PHASE6.2** (ravi, complete; claim released): stage narrow SOD proposals, independent native staff review, server-attested receipts and fail-closed permissions.
- [x] **OPS-PHASE6.3** (ravi, complete; claim released): disposable end-to-end/security/concurrency tests and release prerequisite matrix for #70–#73/#75; no live task writes.
- [ ] **OPS-PHASE6.4:** operator-approved connection activation and fictional staff test write after source/security review. Blocked until explicitly approved; never merge/deploy as preparation.

Runtime/test head 31f103e has [green full CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43802216681): 218 unit/API and 267 browser tests, complete SQL/security/concurrency/rollback checks and desktop captures. Phase 6 backend is now operator-reported applied/deployed (registered migration 20261116050626, Edge v3); native UI is now published through merged #84 at e96beea / v0.5.2. Independent HTTP/PR review and release verification are complete. OAuth installation/consent and staff write acceptance remain separate.

## P0 — reliable shared continuation

- [x] **OPS-HANDOFF:** Shared protocol, account starts and PR template completed;
  links/checks validated. This completed checkpoint installs them on main and
  releases ravi's claim. Branch `ravi/shared-handoff`;
  [setup PR #74](https://github.com/huzshk0707/Oaktown-ops/pull/74).

## P1 — owner-confirmed top priority: Focus Board review

- [x] **OPS-FOCUS-REVIEW.1–4** — independent Phases 1–4 reviews complete (#76/#78/#79), consolidated #80. Those review-only PRs remain references outside the feature release; do not redo completed review.
- [x] **OPS-RELEASE-REVIEW** — Phase 6 native approval/attested-read contract and #81/#82 corrections reviewed/composed in #84; source ancestry, full main CI, public denial and Pages verified. Features/fixes are in main; source PRs with feature-branch bases may still show open, which is not missing implementation. Source retention/audience and live OAuth/staff activation remain separate decisions.
- [ ] **OPS-PLANNING-DATA:** Review recorded owner/next-action/follow-up gaps using
  the current Needs planning view. Propose source-backed fixes; do not invent
  deadlines/owners or write real tasks without the established reviewed workflow.
- [ ] **OPS-PERSONAL-WORK:** Complete the editor/scoped-connector path for actual
  performer and Eastern work date, including actions that do not close a task.
  Reuse existing audit/readback; preserve Leslie/Huzy attribution. See roadmap
  and the shared operating protocol; source completion is not personal EOD work.

## P2 — integrations and reliability, separate small tasks

- [ ] **OPS-MAILBOX:** Design/authorize an in-app read-only mailbox integration,
  provider/source-ID contract and secure retention. Phase 4 has manual intake;
  a ChatGPT Gmail connection is not an application mailbox backend.
- [ ] **OPS-FUNDS:** Identify an authoritative deposit/reconciliation source and
  approved permissions. Submitted/received email reports do not verify clearance.
  Do not create a second ledger just to populate the interface.
- [ ] **OPS-PLAN-PERSISTENCE:** Decide approved-source retention/audience, secure
  resumable unapproved drafts and whether a transactional multi-user SOD workflow
  is needed. Existing Phase 4 approval is an immutable staff-journal snapshot.
- [ ] **OPS-RENEWAL-ATOMIC:** Add an approved transactional compare-and-append
  contract with stable retry identity for renewal journal writes; test simultaneous
  staff changes, stale sources and dropped responses in disposable PostgreSQL.
- [ ] **OPS-RECOVERY:** Assign retention/recovery ownership and exercise platform
  Auth/provider settings plus private documents. Existing application-data/PDF
  recovery evidence is narrower than a full Supabase platform restore.
- [ ] **OPS-INTEGRITY:** Scope remaining nullable task/renewal relationships,
  immutable provenance and repeatable import dry-run/replay controls. Reconcile
  registered migration versions with SQL evidence; never rerun from names alone.

## P3 — larger product work, split before implementation

- [ ] **OPS-LEASE-EXPORT:** Resolve deposit/disclosure rules and complete all ten
  lease pages against approved masters; keep unsigned/prepared/executed separate.
- [ ] **OPS-RESUMABLE-CASES:** Design permission-controlled application/deposit/
  lease drafts and document retention/versioning without duplicate task state.
- [ ] **OPS-PIPELINES:** Define full maintenance, listing/lead/application handoffs
  and their permissions/audit rules before expanding guide-only screens.

## Already completed — do not restart

- [x] Main through PR #69: daily actions first, Needs planning and temporary
  deposit/SOD unload protection; existing Today/Tasks/notices/portfolio remain.
- [x] Focus Board Phases 1–6 and #81/#82 fixes are merged/published in #84 at e96beea / v0.5.2; no phase implementation or release merge remains.

The owner confirmed Focus Board #70–#73 review first on 2026-11-16. Remaining priorities are provisional; product/launch decisions and
missing sources stay explicit. Add owner/branch/PR beside a task only when claimed.
See [HANDOFF.md](HANDOFF.md) and [roadmap](docs/ROADMAP.md).
