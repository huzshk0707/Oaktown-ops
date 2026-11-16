# Handoff — Focus release post-deployment verification

- Updated **2026-11-16 05:17 UTC**, owner **hp**; heartbeat 2026-11-16 05:17 UTC, claim expires **2026-11-16 05:47 UTC**. Branch `ravi/focus-release`, [PR #84](https://github.com/huzshk0707/Oaktown-ops/pull/84), main base `065a88c`. Fresh accepted ownership checkpoint required before continuing; this commit claims documentation/review only.
- Current user instruction supersedes the earlier merge/update authorization: **independent live HTTP checks and PR #84 review only; do not merge or deploy frontend without further user instruction**. No tag, external client activation, consent or operational write is authorized here.
- User reports the backend prerequisite is applied and verified: migration version **20261116050626**, Edge version **3**, health **1.1.0**, **eight tools**; DB/RLS/grants verified, **46 tasks / 138 events unchanged**. These are operator-reported facts until independent checks establish their respective HTTP observations. This chat still has no management access; do not reapply the migration/deployment or claim catalog/count verification from anonymous HTTP.
- Startup: fetched fresh refs; read latest main AGENTS/HANDOFF/TASKS, log -15, branch handoff/tasks, status/worktrees/open PRs/remote branches and current release log. Branch clean at latest remote **cdb43169af5a40b4f613e77117afe8b1b7757315**; prior claim released, no leftovers. Existing source branches preserved.
- Done previously: candidate ce749d1 includes all eight source heads; **222 unit/API / 272 browsers** plus SQL/RLS/concurrency/rollback/Deno/audit/captures passed. Follow-up commits change documentation only. Earlier blocked deployment notes are historical; no source reimplementation needed.
- **NEXT STEP:** verify this ownership normal-push and update PR #84 with the explicit hold, then run credential-free HTTP health/discovery/eight-tool/auth-denial/RPC route checks using the inherited Cloud proxy. Inspect current PR head/checks/diff/ancestry, record independently observed vs operator-reported evidence, push final HANDOFF/TASKS/report and release claim. **Stop before merge/frontend deployment.**
- In progress / unfinished files: none at claim. No app, schema, Edge, auth, data or main changes. Use fictional UUID/date for denied read probes; never perform live staff/OAuth/plan/task writes. Normal-push only; renew claim after milestones and within 15–20 minutes.

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
