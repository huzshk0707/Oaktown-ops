# Completed tasks and EOD work reports

Today → Completed tasks lists non-archived tasks whose status is `completed`, across intake sessions. Completion summaries, actual property/unit links and the existing task editor are available there. Cancelled tasks are excluded. Sign-out and failed refreshes clear the list.

Today → EOD work report generates a personal draft for the selected `America/New_York` work date. Each attributed work entry can appear as its own bullet, including progress on open tasks. If the same task’s completion summary repeats a saved action, the draft lists the action once. Enter next-shift priorities one per line before generating. Time is optional and off by default. When included, the report shows reported and estimated minutes separately and identifies entries with unknown duration.

The report reads existing `ops_events` (`task_work_recorded`, nested `activity.work_date`) and completed `ops_tasks` through the signed-in session and existing RLS. Event ordering uses `occurred_at`. The explicitly saved work date determines the report, including for actions after local midnight. The activity needs explicit performer attribution. The v1 intake format can record progress and evidence but currently has no performer field. Results reaching the API's 1,000-row ceiling fail explicitly instead of exporting a potentially partial report.

Generate reads saved work. Copy and download export the draft in the browser. Changing the date, time preference or priorities invalidates the current report. Changing the date or signing out clears the typed priorities. Downloaded reports are local `.txt` files.

General intake batches explicitly confirm General operations. Their property names remain summary text, with no property/unit/lease relationship. A property-specific proposal permits a real property/unit selection; intake does not automatically choose a lease. Multi-property relationship support is not added by this release. New task and session UUIDs continue to be issued by the database, and existing IDs are supplied by the directory/session brief.

No database update is required. Existing receipts, task history and durations are unchanged.
