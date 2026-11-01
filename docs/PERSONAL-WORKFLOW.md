# Personal Today and the first real task test

## What changed

Today opens first. Eastern and India clocks sit at the top; Eastern switches between EST and EDT using America/New_York, and India uses Asia/Kolkata. Task due/follow-up dates continue to use the existing Eastern contract. The clocks are two views of the same instant, pause ticking in hidden tabs, and do not announce every second.

The operations brief, taglines, public-feedback/source footer and staff-oriented presentation have been removed. Authentication and database permissions remain in force. Keep the work visible without extra onboarding or simulated assistant activity.

## Clean start

Use Today → Task list settings → Clear active tasks. The dialog lists the actual reviewed active tasks and count. Archive removes them from active Today, intake and portfolio task views. It does not mark them completed, delete them, change leases/properties/renewal cases, or erase receipts, source evidence, work events or activity history. Restore individual tasks through Tasks → Saved records after choosing an intake session.

The UI uses the existing `ops_task_set_archived` RPC once per reviewed task, with the recorded ID and `updated_at`. No direct table writes or new database migration are introduced. Terminal and already archived tasks are excluded. No write occurs on page load, opening the dialog, or cancelling it. A stale/denied request stops the sequence. It is not an atomic batch: a failure can leave a confirmed subset archived; an unclear response may already have committed. The UI reports that distinction, refreshes and requires another review instead of blindly retrying. Missing versions or a potentially capped 1,000-row snapshot block the bulk action.

A non-mutating live availability check with null task/version parameters was rejected with HTTP 401 / 42501, permission denied for `ops_task_set_archived`. This confirms the endpoint is present and anonymous execution is denied; it does not validate an authenticated archive. Only the authenticated permitted account can run the reset. Agent-side tests use fictional records; no live task list was archived by these tests. A signed-in live reset is still a separate user action.

## One-task production test

1. Complete the clean start and verify Today shows the actual remaining task counts. Lease-review records remain separate from tasks.
2. In Tasks, create a **new intake session** and copy its session brief. That supplies the real session ID, work date/timezone, known task IDs and versions. Do not invent or reuse a different conversation's session ID.
3. Describe one real task naturally, including the next action and an explicit due/follow-up date. If a time is given, identify Eastern or India time. Resolve date ambiguity before import. Do not infer duration or completion.
4. Give the mediator/Gemini the current session brief and the existing [intake rules](TASK-INTAKE-AI-ADDENDUM.md). Paste the resulting `oaktown.task-intake.v1` export into Ops. This application does not call Gemini automatically; checking JSON in chat is not proof of a Gemini response.
5. Preview, verify the task/context/date, and save once. Confirm the saved receipt has a real task ID/version; return the receipt to the mediator. Repeating the same accepted export must not duplicate tasks or work entries.
6. Open Today and verify the task appears in the correct date group. Reload and verify persistence. Due/overdue displays are dashboard tracking; scheduled email, push, sound or background notifications are not implemented.
7. Report a real change/completion using a fresh session snapshot and proposal reference. Verify the saved status and history. Record work time only if explicitly supplied, and ensure completed work is distinct from a completed task.

Stop on a save error or missing receipt; do not claim that a task, reminder or completion was saved without server confirmation. Keep credentials out of chat and repository files, and keep real task/tenant records out of public screenshots and tests.
