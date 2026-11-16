# Handoff — authorized Ops release

- Last updated: 2026-11-16 04:52 UTC by hp (authorized continuation from ravi).
- Current task / branch / PR: OPS-FOCUS-RELEASE / `ravi/focus-release` / draft release PR #84 (https://github.com/huzshk0707/Oaktown-ops/pull/84); base main 065a88c.
- Active owner: **hp**; heartbeat 2026-11-16 04:52 UTC, claim expires **2026-11-16 05:22 UTC**. User explicitly reassigned the in-progress release. Existing branch retained for takeover; source branches preserved.
- Authorization: the user now explicitly requested “merge them and update ops” to review the completed work. This supersedes the earlier draft/no-merge/no-deploy restriction for the Focus release. Scope: #70/#71/#72/#73/#75/#77 plus completed #81/#82 fixes; production frontend and the reviewed backend prerequisite. External OAuth grants/activation and operational test writes are separate and will remain off.
- Done so far: ravi combined all eight source heads at ce749d1339c98f6f69ead3d8ac8c0cc65d3493d9; full integrated CI 43803803598 passed. hp read latest main protocol/HANDOFF/TASKS/log -15, status/worktrees/current refs/open PRs and this release PR. The current checkout matches the latest remote release with no leftovers. An initial tracking setup failure left the same ce749d1 tree on the old local branch; its duplicate-only commit 69ec585 is preserved on local hp/focus-release-checkout-wip. No exclusive task work was lost and neither source nor release remote changed. The rejected ownership push was followed by a fresh owner/tip read, not a force push. This corrected ownership-only checkpoint precedes further work. hp's review-only PRs remain separate references.
- In progress (files being edited): no application edits; combined Phase 6 + cursor + midnight fixes are committed with all source ancestry. Conflicts were limited to shared HANDOFF/TASKS; both accounts’ code/tests merge without discarded changes. Live preflight: PostgreSQL17.11, 46 tasks, 138 events, zero SOD approvals/enabled agents/OAuth consents; plan RPC absent. Existing task API ACTIVE v2. No production mutation yet.
- NEXT STEP: verify normal-pushed hp ownership and update PR #84; inspect the exact integrated diff/green CI plus docs/PHASE-6-INTEGRATION.md; repeat read-only migration/function preflight with available authorized tools. Apply only the reviewed missing prerequisite and deploy existing Edge endpoint if authorized access is available, then merge with ancestry, verify exact-main CI/Pages/denial and tag. Do not redo completed implementation. Keep task records unchanged.
- Known blockers: live migration/API preflight must be repeated and authorized backend tools/access established in this environment. Full integrated source CI is already green. Do not enable clients or send/create operational records. Public source/site and private data authorization remain distinct.
- Run/test: Node24 and pinned dependencies/browser/SQL workflow in `.github/workflows/checks.yml`; only fictional records and disposable CI databases for mutations.
- Decisions: one integrated release candidate prevents publishing incomplete intermediate phases. Preserve source PR commit ancestry so their merged status can be verified. No force-push, branch deletion or unrelated review merge.

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
