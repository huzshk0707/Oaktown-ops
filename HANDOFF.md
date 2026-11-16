# Handoff — authorized Ops release

- Last updated: 2026-11-16 05:00 UTC by hp (blocked continuation checkpoint).
- Current task / branch / PR: OPS-FOCUS-RELEASE / `ravi/focus-release` / draft release PR #84 (https://github.com/huzshk0707/Oaktown-ops/pull/84); base main 065a88c.
- Active owner: **none**. hp releases the claim at 2026-11-16 05:00 UTC while blocked on missing Supabase deployment capability. User reassignment and merge/update authorization remain recorded below. Existing branch and source branches preserved.
- Authorization: the user now explicitly requested “merge them and update ops” to review the completed work. This supersedes the earlier draft/no-merge/no-deploy restriction for the Focus release. Scope: #70/#71/#72/#73/#75/#77 plus completed #81/#82 fixes; production frontend and the reviewed backend prerequisite. External OAuth grants/activation and operational test writes are separate and will remain off.
- Done so far: ravi combined all eight source heads at ce749d1339c98f6f69ead3d8ac8c0cc65d3493d9; full integrated CI 43803803598 passed. hp read latest main protocol/HANDOFF/TASKS/log -15, status/worktrees/current refs/open PRs and this release PR. The current checkout matches the latest remote release with no leftovers. An initial tracking setup failure left the same ce749d1 tree on the old local branch; its duplicate-only commit 69ec585 is preserved on local hp/focus-release-checkout-wip. No exclusive task work was lost and neither source nor release remote changed. The rejected ownership push was followed by a fresh owner/tip read, not a force push. This corrected ownership-only checkpoint precedes further work. hp's review-only PRs remain separate references.
- In progress (files being edited): no application edits; combined Phase 6 + cursor + midnight fixes are committed with all source ancestry. Conflicts were limited to shared HANDOFF/TASKS; both accounts’ code/tests merge without discarded changes. Live preflight: PostgreSQL17.11, 46 tasks, 138 events, zero SOD approvals/enabled agents/OAuth consents; plan RPC absent. Existing task API ACTIVE v2. No production mutation yet.
- NEXT STEP: resolve the missing Supabase deployment capability (pending user question), then follow docs/releases/FOCUS-2026-11-16.md: fresh authorized catalog/aggregate preflight, exact missing migration, existing Edge function deployment, postflight, ancestry-preserving #84 merge, exact-main CI/Pages/denial and annotated unused release tag. Backend-first gate still applies; do not merge frontend while plan RPC/function update remain missing. Keep task records unchanged.
- Known blockers: no Supabase management tools/runtime credentials/outbound identity in this chat; Actions secret metadata is 403 and no backend deployment workflow is configured. User asked to enable Supabase here or complete backend in the original authorized context. Public probes confirm plan RPC still PGRST202, Edge 1.0.0/five tools, published frontend still old. This is capability, not missing merge authorization. Full integrated source CI green: 222 unit/API / 272 browser, SQL/Deno/audit/captures. Do not enable clients or send/create operational records. Public source/site and private data authorization remain distinct.
- Run/test: exact ce749d1 full integrated CI 43803803598 verified from complete logs: 222 unit/API, 272 browsers and full SQL/security/rollback/Deno/audit/captures. All eight source heads verified in ancestry. Read-only public app/anonymous REST/MCP/discovery/health checks repeated using Cloud proxy; native task RPC correctly returns authentication_required/OAuth challenge. No staff/private records read. Review/deployment hashes, expected versions and recovery are in docs/releases/FOCUS-2026-11-16.md. Ownership/continuation checkpoints only change Markdown.
- Decisions: one integrated release candidate prevents publishing incomplete intermediate phases. Preserve source PR commit ancestry so their merged status can be verified. No force-push, branch deletion or unrelated review merge.

- Stopping note: no unfinished source files; working tree is clean at the preceding pushed checkpoint c286bb62bdab7b86906bb486150a37a5509ac81d. This final update changes Markdown only. Missing capability is documented, and the user-facing enable-Supabase question remains pending. No production schema/function/client/task mutation, merge, Pages update or tag was performed by hp. Release PR #84 remains draft because backend deployment/release acceptance is unfinished. All eight source histories remain intact.

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
