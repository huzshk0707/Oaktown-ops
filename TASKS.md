# Tasks — Oaktown Ops

Prioritized from current main code/README, roadmap/audit and live open PRs on
2026-11-16. No open GitHub issues were returned at this inspection. This is a
planning backlog, not authorization for operational writes or feature merges.
Account owner is unclaimed unless an active branch/PR claim says otherwise.

## P0 — requested morning UX iteration

- [ ] **OPS-MORNING-UX.1** Audit launch, morning/daily dashboard and Focus hierarchy on current main.
- [ ] **OPS-MORNING-UX.2** Implement desktop morning landing and honest, accessible motion with existing data services.
- [ ] **OPS-MORNING-UX.3** Verify routes, auth/refresh, reduced motion, six themes and fictional desktop screenshots; publish review evidence.

## Previous release backlog (main includes #84; historical notes below)

- [ ] **OPS-FOCUS-RELEASE** (hp post-deployment verification; `ravi/focus-release`, PR #84): **User now explicitly authorized merge/frontend publication (latest “merge it” instruction)**; proceed with #84 after final head check, then verify exact-main CI/Pages/tag. Operator reports backend migration 20261116050626 / Edge v3 complete; independent health 1.1.0/eight-tool/anonymous-denial checks pass. Reviewed source CI: 222 unit/API / 272 browsers. Future approved merge must retain source ancestry and verify exact-main CI/Pages/tag; no activation or operational writes. Current evidence: docs/releases/FOCUS-2026-11-16.md.
- [x] **OPS-FOCUS-RELEASE.HTTP-REVIEW** — independent eight-check live HTTP run and targeted #84 review complete; no new blocking code finding. DB/RLS/grants/version/count verification remains attributed to the operator. Prior hold superseded by the user’s explicit merge instruction. Reproduce with `NODE_USE_ENV_PROXY=1 node docs/releases/verify-focus-http.cjs`.

## Completed staging / activation backlog

- [x] **OPS-PHASE6.1** (ravi, `ravi/phase6-integration`): inspect #75 and task OAuth/API/approval authorization; aggregate-only metadata; document activation gates.
- [x] **OPS-PHASE6.2** (ravi, complete; claim released): stage narrow SOD proposals, independent native staff review, server-attested receipts and fail-closed permissions.
- [x] **OPS-PHASE6.3** (ravi, complete; claim released): disposable end-to-end/security/concurrency tests and release prerequisite matrix for #70–#73/#75; no live task writes.
- [ ] **OPS-PHASE6.4:** operator-approved connection activation and fictional staff test write after source/security review. Blocked until explicitly approved; never merge/deploy as preparation.

Runtime/test head 31f103e has [green full CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43802216681): 218 unit/API and 267 browser tests, complete SQL/security/concurrency/rollback checks and desktop captures. Phase 6 backend is now operator-reported applied/deployed (registered migration 20261116050626, Edge v3); native UI remains in unmerged draft release #84. Independent HTTP/PR review is complete; user now authorizes the integrated frontend publication. OAuth installation/consent and staff write acceptance remain separate.

## P0 — reliable shared continuation

- [x] **OPS-HANDOFF:** Shared protocol, account starts and PR template completed;
  links/checks validated. This completed checkpoint installs them on main and
  releases ravi's claim. Branch `ravi/shared-handoff`;
  [setup PR #74](https://github.com/huzshk0707/Oaktown-ops/pull/74).

## P1 — owner-confirmed top priority: Focus Board review

- [x] **OPS-FOCUS-REVIEW:** Review the existing completed stack in dependency order:
  [#70](https://github.com/huzshk0707/Oaktown-ops/pull/70) Phase 1 → main;
  [#71](https://github.com/huzshk0707/Oaktown-ops/pull/71) Phase 2 → Phase 1;
  [#72](https://github.com/huzshk0707/Oaktown-ops/pull/72) Phase 3 → Phase 2;
  [#73](https://github.com/huzshk0707/Oaktown-ops/pull/73) Phase 4 → Phase 3.
  hp’s independent reviews are complete in #76/#78/#79 and consolidated in #80. Two P2 correction tasks are separate (#81 reader cursor and hp/focus-defer-midnight); do not redo or merge them here. All feature PRs remain draft and unmerged by explicit user instruction. Prepare review
  findings/desktop acceptance; do not reimplement, mark ready or merge them as
  part of this setup. Phase 4 head `676e896` has 211 unit / 254 browser checks
  and full CI green. Review evidence is already committed on its branch.
  Small review steps (claim separately; no feature rewrite or merge):
  1. [x] **OPS-FOCUS-REVIEW.1:** Audit #70/#71 carousel, shared data, modal,
     keyboard/focus and existing Review integration; link exact heads/findings.
  2. [x] **OPS-FOCUS-REVIEW.2:** Audit #72 confirmation, permissions, atomic task
     versions, Defer/Undo and failure recovery using existing fictional tests.
  3. [x] **OPS-FOCUS-REVIEW.3:** Audit #73 desktop morning/SOD flow, provenance,
     approval journal, retention/audience boundaries and missing integrations.
  4. [x] **OPS-FOCUS-REVIEW.4:** Consolidate findings and desktop review evidence;
     propose bounded fixes and ask the owner for any product/merge decisions.
- [ ] **OPS-RELEASE-REVIEW:** Independently review Phase 6 #77 after ravi releases its claim, then compose approved #81/#82 corrections with the stack in a disposable checkout and rerun checks. hp completed those bounded fixes; do not redo or merge them automatically. Source-retention/audience and actual OAuth activation remain separate decisions.
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
- [x] Focus Board Phases 1–4 implemented and tested on the four linked review
  branches. Product acceptance/merge permission is pending, not implementation.

The owner confirmed Focus Board #70–#73 review first on 2026-11-16. Remaining priorities are provisional; product/launch decisions and
missing sources stay explicit. Add owner/branch/PR beside a task only when claimed.
See [HANDOFF.md](HANDOFF.md) and [roadmap](docs/ROADMAP.md).
