# Handoff — Phase 6 integration and release readiness

- Last updated: 2026-11-16 01:19 UTC by ravi.
- Current task / branch / PR: OPS-PHASE6 / `ravi/phase6-integration` / draft PR opens immediately after this ownership checkpoint; base `feature/focus-board-phase-5` at `712ec3d90f28652c686c3ad017906d70c3cd7248`.
- Active owner: ravi. UTC claim valid until 2026-11-16 01:49 UTC; renew/push within 15–20 minutes and after milestones. hp owns separate review step 1 on hp/focus-review-1 / #76; do not touch it.
- Done so far: read latest main AGENTS/HANDOFF/TASKS and git log -15; inspect live open PRs/issues, all remote branches, PR #75 and Phase 5 implementation contract. Confirmed #75 is draft, unmerged and CI green. Supabase guidance consulted; changelog request blocked HTTP 403. No production modification.
- In progress (files being edited): this claim and TASKS only; no implementation started. Base branch predates the shared protocol, so canonical main rules and account prompts are copied without merging application code.
- NEXT STEP (exact and specific): read `supabase/migrations/20261108071838_authenticated_task_connection.sql`, `supabase/functions/oaktown-task-api/server.mjs`, its `auth.mjs`, `daily-model.js` and `morning-center.js`; inspect aggregate-only live connector/schema/function metadata, then write `docs/PHASE-6-INTEGRATION.md` with exact auth/API findings and staged approval design before implementing.
- Known bugs / blockers: generic journal JSON validation is not server-recorded review authorization. Actual ChatGPT installation/consent and an approved staff test write are not verified. Production activation, migrations, deployment, existing-PR merges and real operational writes require a separate concrete approval; they are not part of this implementation.
- How to run and test: Node 24; `npm ci --no-fund --no-audit --prefix supabase/functions/oaktown-task-api`; `node --test tests/*.test.cjs`; `node scripts/workflow-states.cjs --check`; full pinned browser/disposable SQL workflow per `.github/workflows/checks.yml`. New auth/approval tests use fictional records and disposable PostgreSQL only.
- Decisions made and why: keep desktop UI/data and existing task API; no mobile/mail engine/redesign. Agent proposal submission and native staff approval must be distinct server-authorized capabilities. Keep approved SOD in the existing journal with server proof, not caller-supplied approved JSON. Any request/receipt storage is review infrastructure, not a second task/SOD system.

## Scope / steps

1. Verify existing connection/deployment metadata read-only; document missing activation evidence.
2. Implement a narrow plan-submission/review/receipt contract with explicit client permissions; agent token cannot approve. Stage schema/rollback only after inspection.
3. Reuse current SOD review UI for explicit native staff approval and authenticated readback; preserve shared snapshots/task records.
4. Disposable API/SQL/browser end-to-end, conflict/replay/revocation/role tests, desktop regressions and release prerequisite inventory.
5. Publish draft review PR with checkpointed work and a production activation/test plan; do not merge/deploy or change existing PRs.

Only pushed checkpoints and PR notes are portable. An approval receipt attests an authorized native-session review operation, not proof that a biological human clicked. Do not claim stronger guarantees than the server enforces.
