# Handoff — Morning UX and motion

- Last updated: 2026-11-17 07:32 UTC by ravi; claim expires 08:02 UTC.
- Current task / branch / PR: OPS-MORNING-UX / `ravi/morning-motion` / draft PR being opened; base main e96beea.
- Done: inspected live main, release #84, open PRs and branch ownership. Integrated release already merged; active #85 lease editor belongs to another account and is outside scope.
- In progress: audit launch, daily dashboard, morning planner and Focus motion using fictional desktop records.
- NEXT STEP: inspect actual browser states and controllers; implement a morning landing with honest loading feedback, clearer operational hierarchy and restrained reduced-motion-safe transitions. Preserve explicit routes and authenticated shared snapshots.
- Known limits: old local ravi/focus-release worktree has unpushed Python smoke helper/workflow edits from the previous interrupted session; untouched and superseded by hp’s published verification helper. Do not replay or discard those files automatically. No backend changes or operational writes required here.
- Tests: Node unit suite; targeted then full Playwright with fictional fixtures at desktop widths; workflow inventory; all six themes and reduced motion. Document exact results in PR.
- Decisions: separate task branch; no overlap with lease work. User asks for Grok-inspired motion, not fake reasoning, invented progress or a blocking splash. Existing auth, writes, approvals and direct links remain intact. Earlier release authorization completed through #84; this UI iteration will be independently reviewable.

## Previous main handoff (historical)

# Handoff — authorized Focus merge and publication

- Updated **2026-11-16 05:27 UTC**; owner **hp**, heartbeat 2026-11-16 05:27 UTC, claim expires **2026-11-16 05:57 UTC**. Branch `ravi/focus-release`, PR #84, base main `065a88c`. Ownership checkpoint **0bb0970ee63f5fa0feae1c181b6e630248380d22** normal-pushed and remote verified; current PR log records merge authorization.
- Latest user explicitly says **“merge it then we wanted to merge it”**. This supersedes the prior hold and authorizes #84 merge/frontend publication. Do not request another merge confirmation. Backend is already operator-deployed; do not reapply SQL/Edge, enable OAuth/client permissions or write operational records.
- Startup: latest main AGENTS/HANDOFF/TASKS/log -15, fresh refs, status/worktrees/open PRs/remote branches, current branch handoff and PR read. Clean latest remote head **3e637bcb6f2c2c1d53ae88e9e44a31bc38588881**, prior hp claim released, no leftovers.
- Existing evidence: operator migration 20261116050626 / Edge v3 / DB grants/counts verified; independent **8/8 HTTP checks** passed, health 1.1.0/eight tools and denied anonymous task/plan access. Integrated app/test candidate ce749d1 passed **222 unit/API / 272 browser** plus SQL/Deno/audit; source heads retained. docs/releases/FOCUS-2026-11-16.md records exact evidence/migration mapping. Do not redo implementation or backend deployment.
- **NEXT STEP:** mark #84 ready and merge the exact pushed release head using a guarded merge commit (no squash/rebase/deletion), then fetch resulting main SHA and verify its CI/Pages/live assets. Pre-merge 8/8 HTTP checks passed again; all app/schema/function/test files still match green ce749d1. The helper supports `--published` for postflight. Create and independently verify next unused annotated tag only after exact-main CI/Pages pass. Final handoff remains on this task branch and PR registry; the main copy is a pre-merge snapshot.
- Unfinished files: none at claim. Claim lasts 30 minutes; checkpoint/normal-push after milestones and within 15–20 minutes. No force-push or source-branch deletion. Release claim and push exact publication/test/tag evidence when done.

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
