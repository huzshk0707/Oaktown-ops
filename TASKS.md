# Tasks — Oaktown Ops

**Active delivery index · 2026-11-22.** Authoritative for new work until reviewed/superseded. Historical checklist snapshots below are retained for investigation but must not be re-executed solely because an old box is unchecked. This is **planning, not production write or merge permission**. Consult [ROADMAP](docs/ROADMAP.md), [HANDOFF](HANDOFF.md), [AGENTS](AGENTS.md), and current main/PR status before a new task is claimed.

## Individual task archiving

- [x] Implemented in [PR #92](https://github.com/huzshk0707/Oaktown-ops/pull/92) for review. The fictional browser round trip verifies that the selected task returns to active work as In Progress. Staff manual acceptance follows approved release.

## First build — Morning Command Center

- [x] **OPS-SHIFT-BRIEF.1:** Implemented the first desktop view and the exact Focus Board handoff in [PR #89](https://github.com/huzshk0707/Oaktown-ops/pull/89). Verified the layout, unavailable and empty states, themes and keyboard navigation with fictional records.
- [x] **OPS-SHIFT-BRIEF.2:** Rehearsed Friday with fictional records in [PR #90](https://github.com/huzshk0707/Oaktown-ops/pull/90). Verified task review, the saved resume step after reload and the EOD draft with attributed fixtures. Native capture and readback are covered in OPS-PERSONAL-WORK.1.
- [ ] **OPS-SHIFT-BRIEF.3:** Persist an explicit Focus choice for the staff member and shift. Reopen the same eligible task and its current saved next action after reload. Check sign-out, changed access and tasks closed elsewhere.
- [ ] **OPS-SHIFT-BRIEF.4:** Let staff configure the Friday hours commitment. Create or surface one occurrence per applicable work date and keep retries and refreshes from duplicating it.

## P0 — operational activation and acceptance

- **ChatGPT Morning Plan integration** in [PR #93](https://github.com/huzshk0707/Oaktown-ops/pull/93).
  1. [x] Preserve the personal-consent alias repair and add the scoped, complete Morning Priority Snapshot.
  2. [x] Verify the snapshot-to-proposal flow, native approval, independent readback and task API regressions with fictional data.
  3. [ ] Review the final PR and run the separate operator rollout in the documented order.
- [ ] **OPS-ACTIVATE-TASK-CONNECTION.1 — inspect live OAuth setup:** Confirm OAuth server, existing access-token-hook composition, approved registered client/redirect, signing algorithm, enabled admin client and least-privilege grants. Edge Function v3 is ACTIVE but the inspected scoped-client and consent counts are zero. Do not create secrets in Git/chat. **Exit:** written evidence of which parts are actually activated.
- [ ] **OPS-ACTIVATE-TASK-CONNECTION.2 — read-only acceptance:** With authorized staff login/consent, search/read a known fictional task via the scoped ChatGPT connector. Verify exact identity/history and deny privileged/direct access. **Exit:** readback, no operational changes.
- [ ] **OPS-ACTIVATE-TASK-CONNECTION.3 — approved fictional write acceptance:** Only after the read-only check, preview, explicitly approve, write, audit/readback and replay-test one disposable General Operations task. Test stale version, revoked grant and read-only denial. Confirm exact Ops refresh. **Exit:** verified receipt and audit evidence, no real tenant task touched.
- [ ] **OPS-LEASE-PAGE8.ACTIVATE.1 — backend:** Compare exact staged migration `20261116060547` with live history; seek separate operator authorization and safely apply only after preflight. Confirm RLS, grants, schema/RPC and unchanged existing records. **Not yet live at latest check.**
- [ ] **OPS-LEASE-PAGE8.ACTIVATE.2 — original-source acceptance:** Verify clean unsigned approved full master, page-7/disclosure/deposit choices, five completed examples and exact page-8 mapping. Treat saved preparation approval, unsigned PDF and an executed lease as distinct states.

## P1 — one-task-at-a-time Daily Work Readiness

- [ ] **OPS-PLANNING-DATA.1 — inspect/accept scope:** Review existing Needs Planning, `OpsToday`, Morning, Focus, task editor/RPC, EOD constraints and task metadata. Capture representative fictional before/after screens. Propose minimal additive flow; no parallel dashboard/task storage.
- [ ] **OPS-PLANNING-DATA.2 — reviewed metadata:** For a selected active task, surface saved owner, next action, waiting-on/blocker, due and follow-up state; explicitly choose a confirmed follow-up/check date or **no date needed**. Missing information remains unknown; no inferred dates, owners, property links or payments. Review exact changed fields before save.
- [ ] **OPS-PLANNING-DATA.3 — unify execution:** Read back approved changes through existing authorized/version-checked task workflow and shared snapshot. Waiting tasks remain visible but not falsely “ready to execute”. Preserve old due dates/history and task stable IDs. Refresh Today/Morning/Focus consistently.
- [ ] **OPS-PLANNING-DATA.4 — acceptance:** Fictional unit/browser/security tests for reviewed save, stale/replayed request, incomplete or intentionally unscheduled task, dependency, Eastern date, auth/sign-out and reduced motion/six themes. Document staff acceptance separately. The dated field count below is insufficient to classify all unscheduled work.

## P1 — trustworthy personal EOD

- [x] **OPS-PERSONAL-WORK.1:** Implemented in PR #90 (pending release): native reviewed Record Work and Complete with actual performer, Eastern work date, concrete action and evidence, even when the parent task remains active.
- [ ] **OPS-PERSONAL-WORK.2:** Extend scoped connector only after separate auth/approval review; verify event idempotency, source attribution and exact readback.
- [ ] **OPS-PERSONAL-WORK.3:** Verify the Friday statement’s two distinct actions on one task across local midnight, Gary’s actual progress and Huzy’s next-shift priority. Attribute Leslie’s inspection to Leslie and Huzy’s PDF filing to Huzy.

## P2 — intelligent intake and reliability

- [ ] **OPS-AI-INTAKE.1:** Specify ChatGPT Gmail and supplied text/call intake with precise message/source IDs, exact Supabase match/history, Oaktownbrain SOP selection, conflict classification and approval preview. External sending and payment/notice/lease actions remain separately authorized.
- [ ] **OPS-AI-INTAKE.2:** Test one end-to-end **read → match → propose → approve → scoped write → audit/readback → Ops refresh** flow with fictional source/task and explicit identity checks. No production auto-sync until observed acceptance.
- [ ] **OPS-QUICK-CAPTURE:** Lightweight capture in the existing Focus/Morning flow, with explicit unsaved vs saved states and no attention-hijacking second inbox.
- [ ] **OPS-RENEWAL-ATOMIC:** Transactional compare-and-append for renewal events, stable retries, stale conflict tests.
- [ ] **OPS-RECOVERY / OPS-INTEGRITY:** Platform/Auth/provider/document restore plan, security-advisor disposition, nullable record-link integrity and provenance controls.

## P3 — larger workbenches, discovery first

- [ ] **OPS-LEASE-REHEARSAL-UX:** [Draft PR #94](https://github.com/huzshk0707/Oaktown-ops/pull/94) adds fictional one-bedroom rehearsal, clearer deposits, advanced-layout disclosure, progress and issue-to-edit navigation. Verify CI + desktop staff rehearsal before merge; real lease export still awaits clean master and backend acceptance.


- [ ] **OPS-LEASE-EXPORT / OPS-RESUMABLE-CASES:** Finish verified clean-master ten-page export and saved application/deposit/lease lifecycle after source and policy acceptance.
- [ ] **OPS-PIPELINES:** Ground maintenance, leads/listings and application handoffs in actual staff workflow; assess APIs, permissions and work-order data before building.
- [ ] **OPS-ACCOUNTING:** Progress [issue #83](https://github.com/huzshk0707/Oaktown-ops/issues/83) from discovery only after REI Hub evidence/loan-split workflow confirmation; never invent chart-of-accounts categories or claim Ops performed financial postings.

## Future projects

- [ ] **OAKTOWN-RECORDS:** Create the dedicated private GitHub repository and verify that “closing the day” writes and updates one shift record, with source links and revision readback.
- [ ] **OAKTOWN-BRAIN:** Curate SOPs and verify retrieval in a fresh chat with citations, corrections and unknowns.

## Recently completed — do not restart

- [x] **OPS-FOCUS-RELEASE:** PR #84 merged; Focus Board, safe Complete/Defer/Undo and reviewed Morning release available.
- [x] **OPS-MORNING-UX:** PR #86 merged into main at `b91b4c7`; successful exact-main CI and Pages.
- [x] **OPS-LEASE-PAGE8 frontend and source provenance:** PR #85 and #87 merged and published. Backend installation and actual full-master acceptance **remain open P0**.
- [x] **OPS-PHASE6 source:** Morning plan review migration registered as `20261116051226`; task Edge Function v3 ACTIVE. **Do not interpret as verified active ChatGPT OAuth/consent.**
- [x] **OPS-MASTER-BACKLOG historical import:** Live migration registered `20261108084954`; do not reimport the same workbook without a source-key/idempotence review.
- [x] **OPS-ROADMAP-SYNC:** November 22 documentation plan reviewed in PR #88 with the latest first-screen priority.

## Dated live readiness snapshot (read only)

As inspected 2026-11-22: 46 tasks total, 36 active (4 waiting), 34 active without `due_at` and `intake_details.follow_up`; zero registered scoped task clients; no recorded `morning_plan_approved_v1` events. Counts can change. Do not derive deadlines or completion from these aggregates.

**NEXT STEP:** Verify `OPS-SHIFT-BRIEF.1` in PR #89. The operator’s read-only OAuth assessment and lease activation are tracked separately above.

---

## Historical TASKS snapshot — 2026-11-16/17 (superseded; do not act on old unchecked boxes)

Prioritized from current main code/README, roadmap/audit and live open PRs on
2026-11-16. No open GitHub issues were returned at this inspection. This is a
planning backlog, not authorization for operational writes or feature merges.
Account owner is unclaimed unless an active branch/PR claim says otherwise.

### P0 — requested morning UX iteration

- [x] **OPS-MORNING-UX.1** Audit launch, morning/daily dashboard and Focus hierarchy on current main.
- [x] **OPS-MORNING-UX.2** Implement desktop morning landing and honest, accessible motion with existing data services.
- [x] **OPS-MORNING-UX.3** Verify routes, auth/refresh, reduced motion, six themes and fictional desktop screenshots; publish review evidence.

### Previous release backlog (main includes #84; historical notes below)
### P0 — active lease page 8 upgrade

- [x] **OPS-LEASE-PAGE8.1** — hp (`hp/lease-page8-editor`): reuse existing workflow; editable room labels/location, independent 2-column/bedroom-bath placements, 3–5-bedroom cases, dropdown+Custom, blank absent-room condition lines.
- [x] **OPS-LEASE-PAGE8.2** — same task: staged/tested backward-compatible Supabase draft/review/approval state tied to existing unit/lease IDs, shared session, stale-version/account isolation; no production test writes.
- [x] **OPS-LEASE-PAGE8.3** — same task: source implementation for approved original-template preservation and reviewed mapping/preview/export; no invented layout or clause text. Original Drive access/visual comparison tracked explicitly.
- [ ] **OPS-LEASE-PAGE8.4** — fictional regression/visual PDF samples and desktop captures; full CI; user-authorized merge/publication/tag.

- [ ] **OPS-LEASE-PAGE8.ACTIVATE** — operator backend installation + approved real blank/master map and five-reference visual comparison; no deployment tool/Drive download tool exposed in this execution. See docs/releases/LEASE-PAGE8-2026-11-16.md. Source merge does not complete this step.

### Historical pre-release landing snapshot (superseded by completed #84)


- [ ] **OPS-FOCUS-RELEASE** (hp post-deployment verification; `ravi/focus-release`, PR #84): **User now explicitly authorized merge/frontend publication (latest “merge it” instruction)**; proceed with #84 after final head check, then verify exact-main CI/Pages/tag. Operator reports backend migration 20261116050626 / Edge v3 complete; independent health 1.1.0/eight-tool/anonymous-denial checks pass. Reviewed source CI: 222 unit/API / 272 browsers. Future approved merge must retain source ancestry and verify exact-main CI/Pages/tag; no activation or operational writes. Current evidence: docs/releases/FOCUS-2026-11-16.md.
- [x] **OPS-FOCUS-RELEASE.HTTP-REVIEW** — independent eight-check live HTTP run and targeted #84 review complete; no new blocking code finding. DB/RLS/grants/version/count verification remains attributed to the operator. Prior hold superseded by the user’s explicit merge instruction. Reproduce with `NODE_USE_ENV_PROXY=1 node docs/releases/verify-focus-http.cjs`.

### Completed staging / activation backlog

- [x] **OPS-PHASE6.1** (ravi, `ravi/phase6-integration`): inspect #75 and task OAuth/API/approval authorization; aggregate-only metadata; document activation gates.
- [x] **OPS-PHASE6.2** (ravi, complete; claim released): stage narrow SOD proposals, independent native staff review, server-attested receipts and fail-closed permissions.
- [x] **OPS-PHASE6.3** (ravi, complete; claim released): disposable end-to-end/security/concurrency tests and release prerequisite matrix for #70–#73/#75; no live task writes.
- [ ] **OPS-PHASE6.4:** operator-approved connection activation and fictional staff test write after source/security review. Blocked until explicitly approved; never merge/deploy as preparation.

Runtime/test head 31f103e has [green full CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43802216681): 218 unit/API and 267 browser tests, complete SQL/security/concurrency/rollback checks and desktop captures. Phase 6 backend is now operator-reported applied/deployed (registered migration 20261116050626, Edge v3); native UI remains in unmerged draft release #84. Independent HTTP/PR review is complete; user now authorizes the integrated frontend publication. OAuth installation/consent and staff write acceptance remain separate.

### P0 — reliable shared continuation

- [x] **OPS-HANDOFF:** Shared protocol, account starts and PR template completed;
  links/checks validated. This completed checkpoint installs them on main and
  releases ravi's claim. Branch `ravi/shared-handoff`;
  [setup PR #74](https://github.com/huzshk0707/Oaktown-ops/pull/74).

### P1 — owner-confirmed top priority: Focus Board review

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

### P2 — integrations and reliability, separate small tasks

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

### P3 — larger product work, split before implementation

- [ ] **OPS-LEASE-EXPORT:** Resolve deposit/disclosure rules and complete all ten
  lease pages against approved masters; keep unsigned/prepared/executed separate.
- [ ] **OPS-RESUMABLE-CASES:** Design permission-controlled application/deposit/
  lease drafts and document retention/versioning without duplicate task state.
- [ ] **OPS-PIPELINES:** Define full maintenance, listing/lead/application handoffs
  and their permissions/audit rules before expanding guide-only screens.

### Already completed — do not restart

- [x] Main through PR #69: daily actions first, Needs planning and temporary
  deposit/SOD unload protection; existing Today/Tasks/notices/portfolio remain.
- [x] Focus Board Phases 1–4 implemented and tested on the four linked review
  branches. Product acceptance/merge permission is pending, not implementation.

The owner confirmed Focus Board #70–#73 review first on 2026-11-16. Remaining priorities are provisional; product/launch decisions and
missing sources stay explicit. Add owner/branch/PR beside a task only when claimed.
See [HANDOFF.md](HANDOFF.md) and [roadmap](docs/ROADMAP.md).


- Completed OPS-LEASE-SOURCE-PROVENANCE (#87): recover original repair builder; exact-byte rebuild, three-size render match, and bounded original-page pixel verification. No runtime/schema changes; clean full master and backend activation remain separate.

- PR cleanup authorized: #87 merged; #86 integrated with current lease work (239 unit/API + 28 focused browser cases pass); seven historical feature PRs verified in main and eleven older PRs closed. Final hosted merge/publication status is recorded on #86.
