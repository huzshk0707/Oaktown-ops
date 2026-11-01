# Delete all archived tasks

## Release status: database update required before publishing the UI

This adds Tasks → Saved records & import receipt → Show archived tasks → **Delete all archived tasks**. Choose an intake session first. The confirmation shows the freshly loaded count/titles and explains that deletion is permanent. Cancel receives initial focus; the list can be scrolled with a keyboard.

The database function physically deletes only the archived task rows in the reviewed ID/version list. Active tasks are rejected. Imported source/proposal/activity payloads, receipts, work events, properties and leases are preserved. Intake mappings keep the original task UUID in `ops_intake_private.items.deleted_task_id`; their live `task_id` pointer becomes null. The existing restrictive foreign key is retained. Deleted tasks no longer have a Restore action; historical receipts are not a current task snapshot.

A changed/restored/missing task rejects the whole batch, including audit/provenance updates. Future unreviewed foreign-key dependencies also block deletion rather than cascading into another module. Each deleted task gets a server-attributed journal entry. The function keeps an empty search_path, checks active admin/editor membership, denies anonymous execution and adds no direct DELETE grant on the task table.

A lost response is treated as uncertain and is not retried automatically. Confirmed deletion stays confirmed if the subsequent list refresh fails. No write occurs when opening/cancelling the dialog, loading the page or applying the database update.

## Deployment

1. Review and apply **only** [task_delete_archived_v1.sql](../supabase/schema/task_delete_archived_v1.sql) through an authorized Supabase database connection/SQL Editor. It adds one private metadata column and one checked function; installing it does not delete any tasks. Do not replay old migrations or run the CI fixture files in production.
2. Verify the new function definition, role grants and installed metadata. The agent environment currently has no Supabase administration binding, so this production step has not been executed or verified here.
3. After the backend update is confirmed, merge/publish this UI. Missing-backend requests fail closed with an explicit setup message. Do not publish the button as working before its RPC is installed.
4. The signed-in owner can then review the actual archived list and invoke deletion. No live archived-task deletion has been performed during implementation.

Rollback before use: revoke authenticated execution on `public.ops_tasks_delete_archived(jsonb)` and leave the additive column/history intact. Deletion already confirmed by the server cannot be reversed using Archive/Restore.

## Validation

The full disposable PostgreSQL 16 chain passed locally, including active-task protection, invalid/duplicate/stale reviews, restore races, injected audit failure and atomic rollback, provenance/receipt/work-history preservation, original-receipt replay without resurrection, unknown cascade dependencies, role checks and denial of direct table DELETE. Database tests roll back their fictional mutations.

85 Node tests and 71 browser tests passed. Browser checks cover the existing workflows plus confirmation/cancellation, reviewed counts, active-row preservation, stale reviews, missing backend, lost replies, late sign-out responses and successful deletion followed by refresh failure. Review screenshots/tests use fictional records only.

[Desktop confirmation](design-review/delete-archived-confirm.png) · [Phone confirmation](design-review/delete-archived-mobile.png)
