# Handoff

- Last updated: 2026-11-16 00:49 UTC by ravi
- Current task / branch / PR: OPS-HANDOFF — shared AI continuation setup / `ravi/shared-handoff` / [PR #74](https://github.com/huzshk0707/Oaktown-ops/pull/74) (draft).
- Active owner: ravi; claim valid until 2026-11-16 01:19 UTC. Renew at each checkpoint; 30-minute cooperative lease.
- Last verified pushed checkpoint before this update: `2c36477ac02a646fb730e81ba036a93bae666b93`; live branch/PR identifies newer checkpoints.
- Done so far: inspected latest main `d5b4dfb8237b0362dabe97227dacc86aa2cd8d0d`, `git log -15`, README/source, all open PRs/issues and remote branches; added permanent rules, repo-specific backlog, account starts and PR template. No existing feature branch changed.
- In progress (files being edited): `AGENTS.md`, `HANDOFF.md`, `TASKS.md`, `docs/ai-accounts/hp.md`, `docs/ai-accounts/felix.md`, `.github/PULL_REQUEST_TEMPLATE.md`, README links. Tests and main publication are not finished.
- NEXT STEP (exact and specific): run the existing check commands below and relative Markdown-link validation; record results, finish this documentation-only PR and verify the normal main push if unprotected.
- Known bugs / blockers: no setup blocker. Never-pushed edits cannot be recovered by another account. Checkpoint every 15–20 minutes and after meaningful steps. This protocol does not supply missing GitHub/provider permissions.
- How to run and test: see commands below. No product runtime change is part of this task; use local/disposable test data only.
- Decisions made and why: use Git commits plus branch handoffs and live PR logs as portable shared memory; preserve existing project rules; keep account identity separate from actual staff attribution. Main landing notes index parallel PRs instead of pretending all accounts share one checkout.

## Repository state to preserve

Main is through #69. Focus Board #70–#73 is completed review work, not merged. Phase 4 head 676e896 passed full CI; leave all four feature PRs draft.

## Run and test

Use Node 24. From the repo root:

```sh
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
