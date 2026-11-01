# Completed tasks and EOD work reports

Today → Completed tasks lists non-archived tasks whose status is `completed`, across intake sessions. Completion summaries, actual property/unit links and the existing task editor are available there. Cancelled tasks are excluded. Sign-out and failed refreshes clear the list.

Today → EOD work report generates a text report for a chosen `America/New_York` work date. It lists saved work and tasks marked complete on that Eastern date. Time is optional and off by default. When included, reported and estimated minutes are separate; unknown durations stay unknown. A task completion never adds inferred time. Work already represented by a completed task is not repeated in the default report.

The report reads existing `ops_events` (`task_work_recorded`, nested `activity.work_date`) and completed `ops_tasks` through the signed-in session and existing RLS. Event ordering uses `occurred_at`. Work dates and completion timestamps are treated separately; UTC completion windows are widened before Eastern-date classification to cover daylight-saving changes. Results reaching the API's 1,000-row ceiling fail explicitly instead of exporting a potentially partial report.

Generate, copy and download do not write to the database or send messages. Reports remain in memory. Changing the date or time preference invalidates an old report; sign-out clears it and late responses are ignored. Downloaded reports are local `.txt` files. The format is a starting point for a later user-supplied EOD/SOD format; this release does not generate SOD reports.

General intake batches explicitly confirm General operations. Their property names remain summary text, with no property/unit/lease relationship. A property-specific proposal permits a real property/unit selection; intake does not automatically choose a lease. Multi-property relationship support is not added by this release. New task and session UUIDs continue to be issued by the database, and existing IDs are supplied by the directory/session brief.

No database update is required. Existing receipts, task history and durations are unchanged.
