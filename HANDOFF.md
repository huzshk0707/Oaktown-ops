# Handoff — Phase 6 integration and release readiness

- Last updated: 2026-11-16 01:33 UTC by ravi.
- Current task / branch / PR: OPS-PHASE6 / `ravi/phase6-integration` / draft PR #77 (https://github.com/huzshk0707/Oaktown-ops/pull/77); base `feature/focus-board-phase-5` at `712ec3d90f28652c686c3ad017906d70c3cd7248`.
- Active owner: ravi. UTC claim valid until 2026-11-16 02:03 UTC; renew/push within 15–20 minutes. hp #76 remains independent.
- Done so far: ownership checkpoint pushed as de533dc and draft #77 opened; architecture inspected, aggregate-only live readiness audited, docs/PHASE-6-INTEGRATION.md written. Observed zero enabled task clients/consents/proposals/receipts/SOD events; no production changes. CLI 3.1.0 generated the new migration filename.
- In progress (files being edited): staged SQL is a deliberate fail-closed placeholder, not an implemented migration. No functional code changed yet. Known stable app head remains 712ec3d.
- NEXT STEP (exact and specific): implement supabase/migrations/20261116012926_morning_plan_review_authorization.sql with private proposal/receipt storage, separate client plan flags, native-session review/approval and attested read; add guarded rollback and disposable SQL tests before wiring the UI/API. Do not apply to production.
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
