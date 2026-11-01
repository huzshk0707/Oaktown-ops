# Today Dashboard v1 — Read-only daily operations

**Status:** Feature-branch proposal; not deployed. No Supabase migrations, task writes or automated reminders.

## Purpose

Give Oaktown Rentals staff a single daily entry point without misleading signals. The first iteration reads existing RLS-protected tables (Tasks, renewal cases, properties and units). It does not copy tenant contacts into browser storage, modify tasks, automatically sign leases, or generate legal events.

### Features

- Staff-only **Today** navigation with an integrated sign-in action, refresh and error state.
- Task summary: **Overdue**, **Due today**, **Open tasks with no date**, **Waiting/blocked**, and **Recorded lease ends within 45 days**.
- Dated queue (overdue, due today and next seven days), followed by undated active tasks. Sorted by saved priority, never inferred from titles.
- Tasks that are completed/cancelled or archived are excluded from the active workload.
- Dates use America/New_York (Louisville office timezone), not the local device timezone; date-only values remain date-only without fabricating times.
- **Lease-end dates to verify:** uses renewal_cases.recorded_end for applicable cases, linked to properties/units. It is **not** an automatic renewal notice, final signature verification or a due-date calculation.
- Read-only navigation to **Tasks** and **Leases & renewals** for approved edits.
- Clear signed-out state, no local storage of dashboard data and no stale display after sign-out or failed reads.

## Live data limitation

At initial development (November 1, 2026), production had 40 tasks. None had a saved due_at, intake_details.due or intake_details.follow_up date, so the dashboard should honestly show an **undated backlog**, not claim tasks are overdue. It should not promote task-title phrases like "follow up" into a deadline without a confirmed date.

## Remaining follow-ons

1. Approved staff workflow to **assign and edit task due/follow-up dates** (prefer reviewed, timestamped updates; not inferred automatically).
2. Per-user assignments and configurable daily views (requires staff design and verified owners).
3. Source-grounded renewal action suggestions, based on approved lease policies and verified signing history.
4. Optional notifications, only after role, consent, timezone and delivery policies are defined.
5. Production staff acceptance testing, sorting, accessibility and mobile layout review.

## Testing

Node tests cover DST-safe date classification, date-only vs timestamp due dates, archived/completed exclusions and lease-end windows. Chromium tests use fictional data to verify sign-in, read-only cards, navigation, failed reads and protected-state clearing. No real portfolio mutations are part of the tests.
