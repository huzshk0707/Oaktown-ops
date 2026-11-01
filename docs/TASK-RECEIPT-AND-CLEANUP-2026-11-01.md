# Tasks Inbox receipt and cleanup patch — November 1, 2026

## Why "null" appeared under Saved tasks

The saved task and its receipt were successfully committed. Production's private RPC \`ops_intake_private.run\` uses \`#variable_conflict use_variable\`, has a local variable named \`receipt\`, and retrieved saved receipts using the unqualified \`jsonb_agg(receipt order by created_at desc)\`. The receipt identifier consequently resolved to the **unassigned local variable**, not the table column, and state refresh returned an array containing \`null\`.

The browser previously replaced a successful save receipt with that \`null\` entry. **Copy receipt for AI** then had nothing to copy. The staged SQL qualifies the receipt table alias and adds a regression test verifying actual saved receipt objects survive refresh. The UI also validates receipt objects, does not overwrite a genuine response with \`null\`, disables copying unless a valid receipt is present, and reports clipboard permission failures.

## Saved task cleanup

- By default, show **tasks imported in this session** first. Other active portfolio tasks are available in a collapsed section, instead of 39+ unrelated tasks occupying the intake view.
- Add **Archive** for each task, with explicit confirmation. Archive removes a task from the active display, but **never deletes** its evidence, intake item mapping, receipt, work events, or other history.
- Add **Show archived tasks**, with **Restore** to bring tasks back.
- Archive/restore is a separate staff-only RPC with RLS, an optimistic \`updated_at\` check and an audit event. Concurrent updates fail and require refresh.
- Archived tasks are excluded from the AI session brief. The ingestion RPC also rejects edits to an archived task until restored.
- New archive attributes are \`ops_tasks.archived_at\` and \`archived_by\`, neither of which changes a task's operational status.

## Release gate

\`supabase/schema/task_cleanup_v1.sql\` is **staged only**. Do not apply it to production or merge the archive-enabled UI until reviewed, tested and approved. CI applies it only to a disposable PostgreSQL database, after the existing portfolio and intake fixtures. The migration is additive, and existing receipts, 40 tasks and event logs must not be modified or deleted by the deployment. No historical migration should be rerun in production.

Before merging:
1. Pass Node, browser and disposable PostgreSQL tests; confirm screenshot readability for desktop/mobile.
2. Verify the receipt alias and duplicate-import behavior in CI, and archive/restore stale-version and permission handling.
3. Approve a **new** production migration of the staged code. Deploy with change monitoring and verify read-only metadata after application.
4. Use an approved staff session for a *single designated test task* to confirm **Copy receipt**, Archive, Restore, and review history. Do not use the normal portfolio as test data.

If the SQL backend is not yet deployed, archive requests must fail without changing tasks. Avoid irreversible DELETE actions until retention rules have been explicitly agreed.
