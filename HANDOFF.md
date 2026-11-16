# Handoff — Phase 6 integration and release readiness

- Last updated: 2026-11-16 02:09 UTC by ravi.
- Current task / branch / PR: OPS-PHASE6 / `ravi/phase6-integration` / draft PR #77 (https://github.com/huzshk0707/Oaktown-ops/pull/77); base `feature/focus-board-phase-5` at `712ec3d90f28652c686c3ad017906d70c3cd7248`.
- Active owner: ravi. UTC claim valid until 2026-11-16 02:39 UTC; renew/push within 15–20 minutes. hp #76 remains independent.
- Done so far: backend foundation checkpoint 7841da6 pushed. Added separate per-user native plan consents and revocation/reset on changed client permissions; old OAuth consent is insufficient. Real disposable SQL suite passes. Added three MCP tools (read_daily_plan, submit_daily_plan, get_plan_submission) with native-only approval, sanitized source refs and independent receipt/event verification. Existing 32KB MCP request limit preserved. All 11 existing/new API tests pass. No production changes.
- In progress (files being edited): backend/API source complete for wiring, not yet release-ready. Native browser approval still uses old direct journal path; daily reader still reads generic events. No UI bridge changed yet. Must replace these paths, add consent UI, fixtures/browser tests and CI/rollback evidence. Do not deploy/apply this checkpoint.
- NEXT STEP (exact and specific): add plan-review-api.js (shared OpsCloud transport only), proof-format helpers, and replace direct journal approval/read paths in morning-center.js/daily-center.js. Reuse existing approval dialog for server-prepared manual or ChatGPT proposals; add a small pending review list and plan capability/native-consent controls in task-connection.js. Update fictional fixtures and test unchanged workflows; then run full checks/CI.
- Known bugs / blockers: generic journal JSON validation is not server-recorded review authorization. Actual ChatGPT installation/consent and an approved staff test write are not verified. Production activation, migrations, deployment, existing-PR merges and real operational writes require a separate concrete approval; they are not part of this implementation.
- How to run and test: Node 24, dependencies installed. Local disposable PostgreSQL16 container oaktown-phase6-postgres, network none, database oaktown_portfolio_ci; run PATH=/workspace/work/phase6-bin:$PATH PGDATABASE=oaktown_portfolio_ci node tests/plan-review-database.cjs. That test creates/drops its own clones and passes. No live database command is authorized. Unit/browser/full-CI checks remain for the complete implementation.
- Decisions made and why: keep desktop UI/data and existing task API; no mobile/mail engine/redesign. Agent proposal submission and native staff approval must be distinct server-authorized capabilities. Keep approved SOD in the existing journal with server proof, not caller-supplied approved JSON. Any request/receipt storage is review infrastructure, not a second task/SOD system.

## Scope / steps

1. Verify existing connection/deployment metadata read-only; document missing activation evidence.
2. Implement a narrow plan-submission/review/receipt contract with explicit client permissions; agent token cannot approve. Stage schema/rollback only after inspection.
3. Reuse current SOD review UI for explicit native staff approval and authenticated readback; preserve shared snapshots/task records.
4. Disposable API/SQL/browser end-to-end, conflict/replay/revocation/role tests, desktop regressions and release prerequisite inventory.
5. Publish draft review PR with checkpointed work and a production activation/test plan; do not merge/deploy or change existing PRs.

Only pushed checkpoints and PR notes are portable. An approval receipt attests an authorized native-session review operation, not proof that a biological human clicked. Do not claim stronger guarantees than the server enforces.
