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
