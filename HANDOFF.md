# Handoff — OPS-FOCUS-READER-CURSOR

- Owner **hp**, heartbeat **2026-11-16 03:21 UTC**, claim expires **2026-11-16 03:51 UTC**. Coordination label, not staff identity.
- Branch/base `hp/focus-reader-cursor` / `feature/focus-board-phase-5` at `712ec3d90f28652c686c3ad017906d70c3cd7248`; immediate child draft PR after accepted ownership push.
- Current main AGENTS/HANDOFF/TASKS/logs and live refs/PR claims read before branching. This older feature base predates coordination files; permanent main protocol still applies via `git show origin/main:AGENTS.md`. No live cursor-fix claim found. New branch; clean checkout; no leftovers.
- Last verified pushed checkpoint: base `712ec3d`; ownership checkpoint not assumed pushed until remote verified.
- Scope: bounded shared task reader pagination correction from completed independent review #76 / consolidation #80. Preserve OpsToday/auth/task ordering and existing fallback; no second cache/client, task write, schema, merge or deployment. All existing feature PRs and Ravi #77 unchanged.
- Prior review work complete: #76, #78, #79, #80. Do not redo review. The separate Defer rollover correction is next, not part of this reader task.
- In progress / unfinished files: none; ownership-only checkpoint.
- **NEXT STEP:** replace offset traversal in ops-task-reader.js with ascending immutable-ID cursor traversal; add deletion/insertion/repeated-page/superseded-session regressions and update existing browser mock pagination contracts. Run model/reader and relevant >1000-task/browser tests, checkpoint after first passing implementation milestone.
- Checks: no implementation yet. Use pinned CI tools, fictional browser inputs only. Never claim keyset traversal is a transactionally consistent snapshot. Update claim/PR after milestones and within 15–20 minutes; normal-push only.
