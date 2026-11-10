# Daily workspace and task library

November 9, 2026. Baseline: merged PR #52, main `b3cfbce`.

Today is the daily workspace: restored separate themed summary cards, Morning
Plan & SOD email, urgent/overdue/due-today work, selected focus and EOD report.
The existing plan and report remain review-and-copy workflows.

Tasks replaces the Task Intake navigation label:

- All work: searchable active tasks and follow-ups, work-level browsing, optional
  task breakdown and recorded lease ends in Renewal watch.
- History: completed work and separately disclosed archived history, retaining
  title/code search, read-only profiles and reviewed restoration.
- Add / import: the existing intake sessions, preview, reviewed save and receipts.
- Settings & connections: the existing ChatGPT connection, archive controls and
  reviewed Master Backlog import, available below the task views.

Today shortcuts open All work, completed history, or expanded archived history.
Selecting Focus from a work level returns to Today without changing saved status.
Task subviews have URLs (`#/tasks`, `#/tasks/history`, `#/tasks/intake`), arrow-key
tab navigation and browser Back/Forward/refresh behavior. The shared task editor
is outside workflow panels so it remains visible and usable from either page.
Both pages share the existing authenticated task read/refresh path and clear
private results on sign-out/account change. Task intake initializes when its
subview is opened, including a restored URL.

Verification uses fictional data and mocked APIs: navigation and history, direct
sign-in to Tasks, task focus and editing, read-only access, sign-out, reviewed
intake/archive behavior, SOD/EOD, all six themes and narrow-screen reflow.
Local verification passed 160 model/API tests and 163 browser tests. The visual
inspection covered 120 combinations of themes, viewports and task views.
CI and publication evidence are tracked in the implementation PR. Source checks
and a successful Pages deployment do not certify a live staff data operation.

Future work: contextual animated reminders and swipe interactions, a final name
for Today, and separately scoped EOD improvements. This increment does not add
snoozing or gesture-based task completion.


## Personal EOD attribution — November 10

The EOD is Huzy's personal accomplishment report, not a generic list of every
completed task in the portfolio. The report accepts only completed tasks whose
`intake_details.eod` contains both `completed_by: "Huzy"` and a verified
`work_date: "YYYY-MM-DD"`. A dated, explicitly attributed
`task_work_recorded` journal activity can also supply a personal action.
Older imported completions or a task merely *assigned* to Huzy do not prove who
performed the work. Only work confirmed as Huzy's is included.

The report uses the owner's example layout, subject
`Daily Task Status / Update – Mon DD, YYYY`, salutation `Hey Leslie,`,
the sections `Today’s Focus & Completed Work`, `Next Day Priorities`,
`Pending`, `Updates`, clarification offer and warm sign-off. Sections without
reviewed input remain N/A; the report must be reviewed before it is copied or
sent. No email is sent automatically. Optional tracked time remains opt-in.

Tasks → History defaults to `My completed work today`, with an
`All completed tasks` option for prior, Leslie-performed and unattributed
completions. The date is interpreted in America/New_York. Work dates are
reported dates, not necessarily when a later data entry was saved.

The initial November 10 correction records two personal Mockernut actions
(a tenant HVAC-filter message and filing the inspection report) separately
and associates the completed physical inspection with Leslie. Repair work
remains an independent pending task. Those live records were corrected through
the management connection; no tenant data or records are included in source
fixtures. No schema migration is part of this UI patch. Future ChatGPT task
updates should save `intake_details.eod` explicitly rather than assuming the
person assigned was the person who performed the task.
