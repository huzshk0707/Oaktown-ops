# Tasks intake v1 — rollout and contract

This change implements Tasks → intake inbox. Today, automatic reminders, EOD generation and full timesheet editing remain future work. Nothing sends a message or contacts an AI service.

## Review flow

1. An approved editor signs in and creates a server-issued intake session for one AI conversation.
2. Copy session brief includes session ID, Eastern work date, task IDs/updated_at versions, and imported references. Give it to the chosen AI.
3. Paste a full `oaktown.task-intake.v1` JSON export. Legacy exports without session_id can be explicitly bound to the selected session during review.
4. Review the consolidated final state and original evidence; resolve every new task to a property/unit or General operations. Accept suggestions and clearing separately. Resolve outstanding questions before checking the final review confirmation.
5. Save in one transaction and return the receipt to the AI. Receipts include final task IDs, resolved context, state and updated_at versions. Sources, proposal history and activities are preserved. Dates without a time remain dates; a time is never invented.
6. Reuse the same session for retries and follow-ups. Session-scoped references prevent duplicate proposals/activities across different batch IDs. Different AI chats use different sessions.

## Contract and limits

- Export schema stays `oaktown.task-intake.v1`; optional session_id and proposed_clear_fields are additive fields. Unknown schema versions, unknown change fields, null changes, invalid dates, negative minutes, missing evidence and forward references are rejected.
- Updates reference a known task ID or an earlier/imported proposal. A corrected unsaved proposal can keep its reference; after import, altered content under an existing reference is rejected. Use a new update reference and refresh the snapshot.
- Source references resolve within each export. Full export limit: 200 KB client / 300 KB reviewed request server, 50 proposals, 100 sources, 100 activities. Snapshot limit: 1,000 tasks; no silent truncation.
- No AI confidence score substitutes for review. Cross-session semantic duplicates are not auto-merged. Staff must inspect the supplied task snapshot and matches.
- Raw paste and current review live only in memory. Reload/sign-out clears them. Confirmed evidence/receipts live in protected database records.
- Time is represented only by `task_work_recorded` events containing activity_ref, work_date, minutes and duration_basis. Observations/duplicates produce history but never a time entry.
- Proposed clear fields: waiting_on, blocked_reason, due, follow_up, completion_summary. An obsolete waiting_on must be explicitly approved for clearing before a pending/completed task can save.
- Explicit context resolution applies to new tasks. This importer does not reassign existing task context. Existing due_at is untouched unless due is explicitly changed or cleared. Date-only due is stored in intake_details rather than an invented midnight.
- No browser-held service key. Active editor/admin required for all RPC actions; session ownership is checked. New task assignment defaults to the signed-in actor.

## Database rollout — applied

PR #24 was merged and its reviewed SQL was applied to Oaktown Ops as Supabase migration `20261031235822_oaktown_task_intake_v1` after user approval. `supabase/schema/task_intake_v1.sql` remains the reviewed source snapshot, intentionally outside the historical migration directory. Do not reapply it or rerun historical Portfolio Master migrations.

The deployed setup:
- Adds ops_tasks.intake_details JSONB with an empty default.
- Allows context-free tasks only when workflow_key is general.
- Adds private sessions, immutable item mappings and receipts.
- Adds a narrow public SECURITY INVOKER RPC calling a private SECURITY DEFINER implementation. That implementation checks auth.uid(), active editor/admin membership, and session owner on every request. Private tables are RLS-enabled with no client grants.
- Saves tasks, work events, source evidence, deduplication mappings and receipt atomically; locks session and existing task rows, checks optimistic versions.
- Does not alter existing notice, property or renewal APIs.

Production verification confirmed the RPC exists, anonymous execution is denied, private tables have RLS with no direct client read/write grants, and the private implementation uses a fixed empty search_path and checks active editor/session ownership. No fictional task or activity was imported into production. An authenticated user should perform the first real intake after reviewing its evidence.

The UI still fails closed in environments without this setup: it displays “Cloud task saving is not enabled yet” and permits signed-in preview only. There is no fallback to unsafe direct table writes.

The security advisor reports intentional RLS-without-policy informational notices for the private RPC-only tables ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). The existing Auth leaked-password-protection warning predates this change ([setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No new security warnings were introduced.

Rollback: disable the new RPC execution grant and leave additive records/columns intact. Do not delete saved work or reverse the General operations constraint while such tasks exist.

## Validation

The supplied fictional Unit 8 conversation is committed under tests/fixtures. Node tests cover consolidation, source validation, ordering, duration, clearing, stale versions and replays. Playwright covers review, missing backend, lost-response retry, XSS, sign-out and 320/768/1024/1440px layouts. Disposable PostgreSQL tests apply the draft only to the CI database and verify final state, cross-batch deduplication, atomic rollback, conflict rejection, session ownership and role restrictions.

No production task or tenant data is used in CI, screenshots or GitHub artifacts.
