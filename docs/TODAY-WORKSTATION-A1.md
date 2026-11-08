# Today workstation — A1 design and handoff

Status: **source implementation on a separate PR branch**; not a production deployment or database import.

## Approved operating principle

Today should show what deserves attention, help an authorized staff member complete work, and preserve what happened. It is a task **workstation**, not a replacement property/lease database or accounting ledger.

## A1: existing saved records, no schema changes

1. **Urgent and due (cross-level)** — shows actual overdue, due-today and explicit urgent tasks across all saved work levels. An undated task is never considered overdue merely for lacking a date. Waiting items retain their actual saved status.
2. **Focus now** — choose a saved level and one task. The level preference is kept on the signed-in user's device; it does not alter task priority, deadline or status. Review, Complete and Waiting open the *existing reviewed task editor*. No one-click write is claimed.
3. **Other work levels** — collapsible groups from the saved work_level identifier/label inside task intake_details, falling back to workflow_key when no level is stored. This is a presentation group, **not a claimed parent-child relationship**. Actual parent-child import mapping belongs to A2.
4. **Action Centre** — shows **actionable saved tasks only**. Raw renewal_cases no longer become synthetic action rows. Explicit saved tasks with workflow_key=renewal still appear, and their exact renewal links are preserved. The universal search and full Renewals module still include renewal cases.
5. **Renewal watch** — counts imported cases marked Pending and displays recorded lease ends within 45 days, expressly **not** a legal/renewal follow-up deadline. Data must be checked against executed leases and recent staff updates.
6. **Task history & archive** — searchable completed/archived entries on Today. Restore uses the existing staff-only ops_task_set_archived RPC with the observed task version and explicit confirmation. A successful RPC must be corroborated by a fresh Today read. Restoring removes the archive flag and preserves the saved status: completed or canceled work is not reopened. Work-level summaries label terminal tasks as closed rather than implying all were completed. The journal is preserved; no permanent deletion from Today.
7. **EOD, reference library, global Ctrl/Cmd+K search, PDF generators, notices, property profiles and verified staff auth** stay available.

### Why the legacy Tasks tab remains temporarily

It currently owns the only reviewed manual task-creation/import workflow and a historical delete-archive capability. Removing it now would break staff functionality. It is explicitly marked **Legacy task intake** and is slated for retirement only *after* a tested Today New Task path and archive/history replacement exist. Existing bulk archive is retained under advanced Today settings; nothing is archived automatically.

### Data boundaries

- Today's task lists come from existing RLS-protected ops_tasks, not the Drive workbook. The **Master Backlog is not imported in A1**.
- The dashboard does not create missing deadlines, current tenants, executed leases, approval events or notification messages.
- No production task rows, renewals, people, property links or policies change in A1.
- Full profiles, property-unit/lease relationships and source-linked library documents remain separate secured records.

## A2: reconciled Master Backlog (separate reviewed migration)

1. Re-query existing tasks and source IDs; verify OAK-002 with Leslie before archive or merger.
2. Categorize the 37 workbook entries: 4 marked done and 33 *not marked done* (not automatically 33 independent new tasks).
3. Map parent levels, subtasks, recurring procedures and verification gates. Retain stable M/W/A IDs and timestamps; reconcile existing source keys and duplicates.
4. Dry-run every proposed create/link/update/archive, compare expected counts, and review conflicts. Make reversible/controlled schema changes only if required and independently tested.
5. Make Supabase authoritative only after a verified import; Drive becomes a reference/export snapshot. Replace legacy intake with staff-reviewed Today New Task; do not remove its path beforehand.

## B: ChatGPT task integration (separate authorization and PR)

Exact task ID matching, staff-scoped audited operations, optimistic version checks, read-back verification, and no unrestricted AI SQL or automatic tenant notices.

## Acceptance checks

- Staff sees actual urgent work regardless of selected level and cannot mistake an unknown date for overdue.
- Focusing a level changes only a UI preference; no backend writes occur.
- Complete and Waiting do not persist until the reviewed task form is saved.
- A viewer cannot edit or restore; sign-out removes private lists.
- An archived task can be viewed, searched and restored after explicit confirmation, with RPC version and read-back verification.
- Search filters both completed and archived titles after a refresh; restoring a completed task keeps it completed. Stale versions and failed read-backs never claim verified restoration.
- Focus, history and the review editor initialize from the saved dashboard snapshot even if their scripts load after its data event; the Review button still opens the existing editor and focus scrolling respects the motion preference.
- Raw renewal cases remain searchable and in Renewals; they do not duplicate tasks in Action Centre.
- Six themes and mobile widths do not cause horizontal overflow.
- Full existing notice/renewal/new-lease and EOD behavior remains untouched.
- Actual deployed hosting and staff end-to-end experience must be tested separately after merge.
