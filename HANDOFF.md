# Handoff — backend HTTP verification and PR review complete

- Updated **2026-11-16 05:21 UTC** by hp; **claim released, no active owner**. Branch `ravi/focus-release`, [PR #84](https://github.com/huzshk0707/Oaktown-ops/pull/84), base main `065a88cdd3ef358190a47ba2a258a66d35b9c848`. Last accepted ownership **97a86d8d19a1d0a17f1cddc7ea53f37c01067b33**; this final evidence checkpoint is normal-pushed and its SHA recorded in PR after verification.
- **Current user instruction: independent live HTTP checks and review only. HOLD merge and frontend deployment until further user instruction.** This supersedes older immediate-release instructions. Do not merge, deploy frontend, create a release tag or enable a client/consent/test write because verification passed.
- Operator-reported backend completion: applied migration **20261116050626**, management Edge **version 3**, health **1.1.0**, eight tools; DB/RLS/grants verified, **46 tasks / 138 events unchanged**. These catalog/management/count statements are attributed to the user. No production SQL or management API call was used by hp; do not claim anonymous HTTP proved the full RLS/grant/catalog state.
- Independently verified at **2026-11-16T05:18:41Z**: **8/8 live HTTP checks passed**. Health 1.1.0/scoped auth/resource; expected OAuth discovery; exact eight public tool names with OAuth declarations; read-only plan read/status annotations; anonymous task and daily-plan MCP reads denied with authentication_required/OAuth challenge; anonymous task REST and existing plan RPC both **401/42501**, replacing the earlier missing-RPC **404/PGRST202**; published frontend **HTTP200 with no Focus deck**, hold intact.
- Reproduce: `NODE_USE_ENV_PROXY=1 node docs/releases/verify-focus-http.cjs` on Node24, with inherited Cloud proxy/CA. Helper uses only public metadata and unauthenticated denied read probes, never submission/approval/task writes or staff sign-in. Script syntax and diff checks pass. No full app suite was rerun unnecessarily; app/test/schema/function files remain identical to green ce749d1.
- PR #84 review complete: all eight exact source heads preserved in ancestry, current main included, GitHub mergeable, auto-merge off. Last completed full CI at **cdb43169af5a40b4f613e77117afe8b1b7757315**, run **43807487758**, green; integrated application/test candidate **ce749d1** passed **222 unit/API / 272 browser**, SQL/RLS/concurrency/rollback/Deno/audit/captures. Later docs/helper checkpoint CI may run automatically; running checks are not reported as passed. No new blocking code finding in this targeted continuation; native vs agent approval/config/consent, redacted scoped read, CAS/replay and rollback gates reviewed.
- Durable report: **docs/releases/FOCUS-2026-11-16.md**. Registered migration **20261116050626** maps to reviewed source file **20261116012926_morning_plan_review_authorization.sql**; do not replay the older filename as a missing migration. Reconcile recorded mapping with authorized catalog/history before any future bulk CLI push; no history repair or source rename made here. Source hashes remain recorded in the report.
- Limits: no authenticated staff/OAuth install/consent or live approval/write acceptance performed; no client grants changed or real task/plan/event records fetched. Source-retention/audience and activation decisions remain explicit. Anonymous denial checks and fictional full CI do not establish those live capabilities.
- In progress / unfinished files: **none** after this evidence push. Updated HANDOFF/TASKS/report and read-only verification helper only; all app/schema/function files, source branches and main unchanged. PR #84 remains draft because the release is held; no merge/frontend deployment/tag performed. Earlier missing-access question is superseded by the user's backend completion report, not another request for credentials.
- **NEXT STEP:** wait for further explicit user instruction before merging #84 or deploying frontend. If later authorized, fetch main/release refs, reread live owner/PR/checks and normal-push a new ownership checkpoint, recheck the exact candidate/backend and preserve all source ancestry. Then follow the documented exact-main CI/Pages/denial/immutable-tag procedure. Do not redo completed phases or reapply the deployed backend.

Previous repository landing snapshot follows for historical context; live release notes above govern this authorized task.

# Handoff

- Last updated: 2026-11-16 00:55 UTC by ravi
- Current task / branch / PR: OPS-HANDOFF — shared continuation setup complete / `ravi/shared-handoff` / [PR #74](https://github.com/huzshk0707/Oaktown-ops/pull/74). This final checkpoint is published to main and the task branch together; verify live refs/PR rather than a local-only hash.
- Active owner: none. ravi releases the completed setup claim with this checkpoint; future work needs its own branch claim.
- Last verified pushed checkpoint before this update: `2c36477ac02a646fb730e81ba036a93bae666b93`; live branch/PR identifies newer checkpoints.
- Done so far: inspected current main/log/branches and live PRs/issues; pushed two WIP checkpoints and opened the setup PR; completed permanent rules, HANDOFF, prioritized TASKS, identical hp/felix starts, PR running-log template and README links; verified relative links and Markdown-only scope; existing relevant tests pass.
- In progress (files being edited): none. Seven Markdown files only; no runtime, database, auth, operational data or existing feature PR changes.
- NEXT STEP (exact and specific): verify main contains this handoff, then start owner-prioritized OPS-FOCUS-REVIEW.1 (or claim another unowned review substep in TASKS). Recheck live PR #70–#73 heads/CI, read their existing branch guides and screenshots, and record findings on a new `<account>/focus-review-*` draft PR. Do not reimplement or merge them. To read the latest Phase 4 guide: `git fetch origin feature/focus-board-phase-4`, then `git show FETCH_HEAD:docs/MORNING-COMMAND-CENTER.md`.
- Known bugs / blockers: no setup blocker. Never-pushed edits cannot be recovered by another account. Checkpoint every 15–20 minutes and after meaningful steps. This protocol does not supply missing GitHub/provider permissions.
- How to run and test: Node 24; task-connector `npm ci` first, then inventory and unit commands below. Latest setup validation: 185/185 Node tests, inventory 25 families / 54 active scripts, seven-file Markdown/link/scope checks and diff check passed. No new runtime tests were necessary for these documentation-only edits; full PR/main CI is the live additional regression record.
- Decisions made and why: use Git commits plus branch handoffs and live PR logs as portable shared memory; preserve existing project rules; keep account identity separate from actual staff attribution. Main landing notes index parallel PRs instead of pretending all accounts share one checkout.

## Publication and next ownership

This commit contains the completed setup state and is normal-pushed atomically to
main and `ravi/shared-handoff`; a rejected transaction publishes neither ref.
Read the current PR/main refs to confirm installation. No unpushed work is part
of the shared handoff. The owner confirmed Ops Focus Board #70–#73 review first;
that choice does not authorize merging/deploying the existing draft stack.

## Repository state to preserve

Main is through #69. Focus Board #70–#73 is completed review work, not merged. Phase 4 head 676e896 passed full CI; leave all four feature PRs draft.

## Run and test

Use Node 24. A fresh checkout needs the locked task-connector dependencies before unit tests. From the repo root:

```sh
npm ci --no-fund --no-audit --prefix supabase/functions/oaktown-task-api
node scripts/workflow-states.cjs --check
node --test tests/*.test.cjs
python3 -m http.server 8765 --bind 127.0.0.1
```

For browser/SQL/dependency checks follow `.github/workflows/checks.yml`. It pins
Playwright 1.56.1; task-connector dependencies use their own lockfile. SQL tests
must run only in disposable `oaktown_portfolio_ci`. For Phase 4 specifically,
read its branch guide and use its tests, not a count from main.

## Existing review stack (not an active editing claim)

| PR | Branch / exact head | Base | State |
| --- | --- | --- | --- |
| #70 | `feature/focus-board-phase-1` / `08888e6` | main | Draft; implemented, CI passed |
| #71 | `feature/focus-board-phase-2` / `70f63c4` | Phase 1 | Draft; implemented, CI passed |
| #72 | `feature/focus-board-phase-3` / `536ebca` | Phase 2 | Draft; implemented, CI passed |
| #73 | `feature/focus-board-phase-4` / `676e896` | Phase 3 | Draft; implemented, 211 unit / 254 browser, CI passed |

Phase 4's architecture and all fictional desktop screenshots are committed at
[PR #73](https://github.com/huzshk0707/Oaktown-ops/pull/73). Its journal approvals
are not a mailbox connector, verified deposit ledger or server-atomic multi-user
plan workflow. Unapproved intake/drafts remain visit-only. Continue review from
existing evidence; do not redo these implementations or infer merge permission.

## Receiving account checklist

Read current main's AGENTS/HANDOFF/TASKS, then `git log -15`, live open PRs and
branches. Choose the active task's latest branch/PR; inspect status and preserve
leftovers. Check owner/expiry before claiming and pushing your own checkpoint.
Follow that branch's exact NEXT STEP. If setup is complete and no task is claimed,
choose the first actionable unclaimed TASKS item; retain explicit review/approval
blockers instead of redoing finished work. hp/felix starts are in `docs/ai-accounts/`.
