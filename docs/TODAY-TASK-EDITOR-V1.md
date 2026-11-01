# Today dashboard task editing — phase 2

**Status: staged implementation. Not yet released.**

## What is implemented

An authorized admin/editor can open any active task on Today, review and edit title, status, priority, assignee label, due date, follow-up date, next action and notes. They can connect the task to a verified **property**, optional **unit**, optional **lease** and optional **renewal case**. Filters prevent choosing a lease from another unit. Dates are deliberate date-only values interpreted in the Louisville office timezone; no deadline is inferred from free text.

The backend stores direct lease references in a new optional `ops_tasks.lease_id`, checks every relationship against the relational portfolio, locks the task and checks its reviewed `updated_at` version, rejects archived tasks, requires admin/editor staff membership, and appends an `ops_events` audit event. Linking tasks does **not** edit leases, renewals, tenants, or signed documents.

The UI includes search for addresses and hierarchical property → unit → lease/renewal selectors. Existing records retain their imported evidence and intake session receipts. Marking a task complete changes only that task's status and completion timestamp; it is not proof that a lease was signed or notice served.

**Assignment is currently an editable staff label, not automatic delegation or permission-based account assignment.** Linked staff account assignments are a separate follow-up requiring an approved staff directory and notification permissions.

## Staged database change

- `supabase/schema/today_task_editor_v1.sql` adds optional lease FK and a `SECURITY INVOKER` RPC `ops_task_update_v1`.
- It is **not** applied automatically to production. CI applies it on a disposable database, with permission, relationship, stale-version and audit tests.
- Archive/Restore and intake history are preserved.
- Only after full passing checks and release approval should it be applied as an explicit migration, then the PR merged. Never merge the UI before the RPC is live.

## Follow-ups not included in this patch

- Creating brand-new tasks directly from Today (AI Intake already creates tasks)
- Staff-directory account assignment, due-date reminders and email/text notifications
- Task templates, recurring automations or proactive AI actions
- Editing the underlying lease, renewal, notice or property record
- Sending external reminders automatically

## Acceptance checks

1. Choose a task and link it to a property/unit/lease/renewal belonging to that unit.
2. Set explicit due and follow-up dates, assignee label, status and next action.
3. Refresh Today: updated cards and group counts should reflect the saved record.
4. Repeat with another unit: unrelated lease and renewal options must not appear.
5. Confirm stale second-browser edits are rejected, archived tasks cannot be changed, viewer/anon access is denied, and an audit event is recorded.
6. Verify all previous task intake receipts and PDF generators remain unchanged.
