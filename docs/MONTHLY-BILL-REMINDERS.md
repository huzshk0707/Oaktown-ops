# Monthly bill reminders

Today includes a staff-only recurring reminder panel. Private payee labels,
instructions and monthly dates are configuration in `ops_bill_private.rules`,
not browser source or a production seed migration. Canonical operating guidance
lives in the private Brain; current reminders and confirmations live in Supabase.

## Staff workflow

The attention list opens three days before a configured reminder window by
default. An unconfirmed month stays visible after its date; the wording asks
for confirmation instead of declaring a bill unpaid. This month's full schedule
can be expanded. Each month starts independently; previous confirmations and
sent reminders never complete the next month. Older unconfirmed months remain
visible. Work dates use America/New_York, including midnight and year boundaries.

Copy a reminder or add it to the existing morning plan/SOD. Neither action sends
a message or records payment. Record **Reminder sent** only after sending it.
Record **Payment confirmed** or **Autopay payment verified** with a short source
note after checking the evidence. Reopening also requires a note. This module
does not move money, file taxes, book a ledger entry or access bank/card accounts.

Today alerts need the app to be open/refreshed. The optional ICS export provides
monthly calendar events at 9 AM Eastern, with lead-time and day-of display alerts.
Import once into a calendar that supports alerts. Imported events do not sync
changes, payment confirmations or completed months; avoid duplicate imports.
The start of a configured range is the calendar event date; the range stays in
its description. A statement must establish the exact due date where needed.

## Authorization and records

The existing shared verified staff session calls two public invoker RPCs:
`ops_bill_reminders()` and `ops_bill_reminder_record(...)`. Their private helpers
check active membership, restrict writes to editors/admins, pin search paths,
and expose no underlying table grants. The private tables have RLS enabled with
no client policies by design. Anonymous access and the separate task-agent role
receive no grants. No privileged key is shipped in the browser.

An update locks the rule, compares the reviewed occurrence revision, and writes
the monthly state and attributed append-only audit event atomically. The client
reads back the exact rule/month, revision, action, note, timestamps and event ID
before reporting success. Stale/failed/unverifiable saves require a refresh.
Sign-out/account changes clear labels, notes, copied-text fallback and SOD input;
late responses cannot restore private state.

## Deployment and recovery

Migration: `20261109221343_monthly_bill_reminders.sql`. Supabase CLI created the
review draft as `20261109213957`; the Management API assigned live version
`20261109221343`. The repository filename now matches that live history entry;
the reviewed SQL contents are unchanged.
It is additive: one private schema, three tables and four narrow functions. It
does not rewrite tasks, portfolio data, leases, existing policies or auth setup.
No production schedule or current confirmation is in the migration or fixtures.

Before rollout, inspect the target migration history, active-staff schema,
new-name collisions and security-advisor baseline. Run the migration, access/
validation/attribution checks, concurrent first-write check, and the actual
guarded rollback in disposable `oaktown_portfolio_ci`. Record actual production
application and private configuration readback separately from source merge.

An empty installation can be removed with
`supabase/rollback/monthly_bill_reminders.sql`. It refuses to discard any rule
or history. After configuration/use, preserve the tables and revoke the two
public RPC grants to stop access while investigating. Regrant only after review.
This is a feature recovery path, not a claim of a full platform backup restore.

Fictional Node/browser/SQL fixtures cover recurrence, date windows, monthly
reset, leap/year boundaries, autopay wording, SOD/clipboard/calendar export,
receipt mismatches, staff roles, audit attribution, competing writes, failure
clearing and six-theme mobile reflow. Release evidence belongs in the PR and
the private Brain integration note.

## Review baseline — November 9, 2026

The target project is the existing Oaktown Ops database. Preflight found no
reminder schema or migration-name collision and confirmed the active-staff
membership columns used by the guards. The existing security-advisor baseline
has six information-level private RLS/no-policy findings and two warnings:
existing archived-task definer access and leaked-password protection disabled.
The new private tables intentionally follow the same no-client-policy design.

Local verification passed 176 Node tests, 53 relevant integration browser tests,
the final six reminder browser scenarios, role/attribution/validation SQL, the
concurrent first-write check and the actual guarded/empty rollback. Visual review
uses fictional schedules at desktop/phone widths across six themes. Production
migration and private setup are applied and independently read back: six rules,
matching stored function fingerprints, denied anonymous/task-agent execution and
private table access, with existing record counts unchanged. Initial occurrence
and audit counts were zero; setup did not fabricate payment/sent confirmations.
The two preexisting advisor warnings are unchanged; the three new private tables
add expected information-level RLS/no-policy findings. See [PR #58](https://github.com/huzshk0707/Oaktown-ops/pull/58)
for database evidence and [PR #59](https://github.com/huzshk0707/Oaktown-ops/pull/59)
for combined source/publication evidence. Actual staff use remains separate from
fictional tests and deployment records.
