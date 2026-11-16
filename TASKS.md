# Tasks — Oaktown Ops

Prioritized from current main code/README, roadmap/audit and live open PRs on
2026-11-16. No open GitHub issues were returned at this inspection. This is a
planning backlog, not authorization for operational writes or feature merges.
Account owner is unclaimed unless an active branch/PR claim says otherwise.

## P0 — reliable shared continuation

- [ ] **OPS-HANDOFF:** Install shared protocol, account prompts and PR template;
  validate links/checks, publish the documentation to main, verify remote refs,
  release ravi's claim. Current branch `ravi/shared-handoff`.

## P1 — finish review before starting again

- [ ] **OPS-FOCUS-REVIEW:** Review the existing completed stack in dependency order:
  [#70](https://github.com/huzshk0707/Oaktown-ops/pull/70) Phase 1 → main;
  [#71](https://github.com/huzshk0707/Oaktown-ops/pull/71) Phase 2 → Phase 1;
  [#72](https://github.com/huzshk0707/Oaktown-ops/pull/72) Phase 3 → Phase 2;
  [#73](https://github.com/huzshk0707/Oaktown-ops/pull/73) Phase 4 → Phase 3.
  All remain draft and unmerged by explicit user instruction. Prepare review
  findings/desktop acceptance; do not reimplement, mark ready or merge them as
  part of this setup. Phase 4 head `676e896` has 211 unit / 254 browser checks
  and full CI green. Review evidence is already committed on its branch.
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

Priorities after the handoff setup are provisional; product/launch decisions and
missing sources stay explicit. Add owner/branch/PR beside a task only when claimed.
See [HANDOFF.md](HANDOFF.md) and [roadmap](docs/ROADMAP.md).
