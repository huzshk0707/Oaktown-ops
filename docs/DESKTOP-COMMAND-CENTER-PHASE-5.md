# Phase 5 — saved daily operations

Review branch: `feature/focus-board-phase-5`, based on Phase 4
`676e8961a6cb552f6916c655d966a8150f2c3ede`. Target:
`feature/focus-board-phase-4`. This increment is source-only, in a draft PR;
no production migration, merge, deployment, email or financial operation.

## Dashboard and retained planning

The Morning Command Center now opens with saved priorities, latest approved SOD,
assignments, follow-ups/blockers, a disconnected deposit source, and Start Focus
Board. Eastern/India clocks, current Eastern date, selected plan date, last
successful refresh, search, Appearance and Full workspace share the existing HUD.
Layouts are developed at 1280, 1440 and 1920px. Existing responsive workflows and
regression tests remain; this phase adds no mobile features or mobile captures.

Phase 4 intake, text-rule suggestions, deposit *reports*, draft generation,
source review, task-intake handoff, journal approval/export and personal approval
history remain under **Manual planning & source review**, closed by default.
No intake function or stored source/approved plan was deleted. Automatic dashboard
reads never restore a saved plan into the editor or replace unsaved wording.
Explicit restoration of the current reviewer's plan retains its confirmation.
Manual tools are optional; an approved SOD is context, not a prerequisite to
viewing existing work in Focus Board.

`daily-model.js` validates read envelopes and derives task projections;
`daily-center.js` presents them. `OpsToday` remains the only shared task snapshot
owner. No second task fetcher, Supabase client, realtime feed or durable browser
cache is introduced. Priorities use `OpsFocusBoardModel.order` unchanged. Owner
groups use saved staff IDs first, labels otherwise, preserving unassigned work.
Waiting/blocked status, recorded waiting/blocking text and saved follow-up
schedules supply the follow-up panel. No owner, date, priority or status is inferred.

## Existing authorized journal read

Reuse `public.ops_events`, with the current `OpsCloud.api` staff bearer/session:

```text
GET /rest/v1/ops_events
  ?select=id,entity_type,entity_id,event_type,actor_id,occurred_at,summary,event_metadata
  &entity_type=eq.morning_plan
  &event_type=eq.morning_plan_approved_v1
  &event_metadata->>work_date=eq.YYYY-MM-DD
  &order=occurred_at.desc,id.desc&limit=100&offset=0
```

The selected date defaults to `OpsTodayModel.today()` (America/New_York), including
before midnight when UTC/India have advanced. Pagination reads complete pages;
an excessive history over 10,000 entries yields an explicit incomplete-read error
instead of claiming a latest result. The dashboard reads all approvals visible
to the authenticated staff session, rather than filtering only its own actor.
Existing RLS determines visibility; browser login still requires admin/editor.
The generic journal's active-staff read policy also allows database viewers, but
this phase does not expand browser sign-in. No grants or policies are changed.

Only consistent `oaktown.morning-plan.v1` / `oaktown.sod-draft.v1` envelopes qualify:
event/plan identity, revision, Eastern date, actor/time, text, rows, source references,
and required draft metadata must agree. Malformed, draft and unresolved envelopes
are ignored and reported. Newest server approval time wins across plan IDs;
revision numbers belong to each plan, not a global daily sequence. PostgreSQL
fractional timestamp precision is preserved for ordering ties. Actor UUID, receipt
time, revision and source labels/verification/version/reference remain visible.

The generic journal enforces active staff access, editor/admin insert rights,
server-stamped actor/time and append-only history. It does **not** enforce this
SOD JSON schema or prove an independent human approval ceremony. Client envelope
validation is a display guard, not a new server authorization guarantee. Trusted
staff must review their approved content. Selected original evidence in Phase 4
approvals is already readable to authorized staff; the dashboard displays source
references without automatically expanding message bodies. Fictional browser/SQL
tests verify these boundaries; no live private data was inspected.

## Refresh and execution

Refresh runs the existing `OpsToday.refresh()` and then the authorized plan read.
All counts and groups derive from that shared snapshot. A successful full read
updates the Eastern refresh timestamp. Loading, no-plan, ignored invalid records,
failed/stale reads and denied access have explicit states. Network failure retains
the previous immutable approval with a stale label; denied journal access clears
it. Failed task reads clear task presentation. Date/account request tickets reject
late callbacks. Sign-out/expired sessions clear private dashboard content, plan
context and refresh metadata. No new private local/session storage is used.

Date selection and unsaved draft wording survive refresh. A current-day selection
advances on the Eastern date rollover; deliberate historical selections remain.
Saved-plan task-version conflicts are warnings: current shared tasks stay
authoritative, while approved wording remains immutable historical context.

Start Focus Board navigates to the existing board, preserving sorting, selection
and Complete/Defer/Undo/Review implementations. Current-day approved task IDs
highlight still-active saved tasks. Planning-only items never become cards or
tasks. Historical/stale approvals do not mark current work. The existing Review
approved SOD action returns to Morning. No navigation write occurs.

## ChatGPT integration boundary

ChatGPT handles authorized email reading, summarization and proposed priorities.
Supabase stores reviewed operational records. Ops reads and manages saved work.
No mailbox OAuth, Gmail parser, AI engine or automatic sending was added.

Existing MCP contract (see [task connection](CHATGPT-TASK-CONNECTION.md) and
`supabase/functions/oaktown-task-api/server.mjs`):

1. `search_tasks({query?, task_code?})`, `get_task({task_id})` and
   `get_task_history({task_id})` read saved work under scoped OAuth.
2. `preview_task_change({operation, request_ref, task_id?, expected_updated_at?,
   changes, clear_fields, source_note})` stores a temporary proposal. Show the
   exact before/after, field clears and source note to the user.
3. After user approval, `apply_task_change({proposal_id, preview_token,
   reviewed:true, confirmation:"APPLY <proposal_id>"})` uses server-issued values,
   verifies current permissions/version, saves once and independently reads back.
   Retry only the identical proposal after an uncertain response. A receipt
   without matching read-back is not verified success.

The connector cannot insert approved morning plans or read/write deposit records.
Source code/deployed endpoint do not establish current ChatGPT OAuth installation
or consent. No connection was fabricated or production write attempted here.
Approved-plan writes currently require the existing explicitly reviewed browser
journal flow. A future ChatGPT plan-write contract must provide a narrowly scoped
server-validated envelope, active-staff/client authorization, explicit exact-plan
review, server actor/time, immutable retry identity, version conflict policy and
independent event read-back. That missing contract is documented, not bypassed
through elevated SQL or a service key. No duplicate SOD table is needed for this UI.

## Deposit limitation

No authoritative ledger or bank source exists in the inspected application
contracts. **Not connected** is therefore the only financial integration state.
The dashboard does not convert pasted reports or approved wording into submitted,
received, credited, pending, failed or unresolved financial records. Phase 4's
optional report classifications stay explicitly unverified. Connecting deposits
requires its own authorized source and evidence/status contract.

## Review evidence

Screenshots: [desktop review](phase-5-desktop/README.md). All use fictional API
records and zero write requests. CI runs existing Node, Chromium, Deno, audit
and disposable PostgreSQL checks, plus Phase 5 read/model/browser tests. The
database test checks cross-staff read, inactive/nonstaff/anonymous denial,
server attribution, append-only history and zero operational task changes.
Browser tests cover latest valid approval/pagination, Eastern date, counts,
assignments, missing deposits, stale/denied reads, draft preservation, late
callbacks, expired sessions, Focus navigation, existing action regressions,
desktop fit and the existing six-theme accessibility checks.

Local verification and hosted CI results are recorded in the draft PR. Screenshots
and mocked tests certify source behavior only; production authentication and
fresh live staff verification remain outside this review.
