# Connected workspace

This increment evolves the existing buildless UI and preserves all six appearance
preferences, the renewal/notice PDFs and the current task intake/editor APIs.

## Daily use

- **Search / quick actions** is available above the workspace. Press **Ctrl+K** or
  **Cmd+K**; type an address, unit code, person, email, lease, renewal ID, task title
  or reference filename. Arrow keys select a result, Enter opens it and Esc closes.
  Sign-in is required for private results. Quick actions open existing workflows.
- **Today → Action Centre** opens a combined view of active tasks and renewal
  follow-ups. Latest saved renewal journal updates take precedence over imported
  statuses when that journal is available. Completed, canceled and archived work
  is excluded. Recorded lease-end dates are context, never invented task deadlines.
  Confirmed task imports and archive/restore actions refresh the connected view.
- Filter by overdue, today, waiting, undated, renewals or maintenance tasks.
  **Save this view** stores only that preset on the current device. **Compact**
  changes list spacing; these preferences contain no tenant data or search queries.
- Search opens a **property profile** with its units, lease history, recorded rent
  schedules, related work and an expandable activity timeline. Each unit has a
  separate scope. The existing unit browser has an **Open connected unit profile**
  button, so the existing navigation is retained.
- Lease profiles link source-associated people. Historical links and saved statuses
  do not establish current occupancy or executed contracts. Timeline entries show
  the recorded staff ID, timestamp, source and any explicitly reported work date.
  Archived tasks stay out of active work; their linked journal entries retain a
  read-only source view with the original archive status.
- **Reference library** browses the existing private lease catalog and opens the
  original in Drive. Drive checks its own permissions. No filename matching assigns
  a reference to a property, tenancy or current lease.

## Scope and data handling

The connected store reads protected properties, units, leases, people, tenancy
relationships, tasks, renewal cases, rent schedules, journal entries and reference
metadata. It pages stable ID-ordered API results in 1,000-row pages (hard safety
limit 100,000 per collection, with failure rather than silent truncation). This is
an in-memory view, not a transactional snapshot or new authoritative data store.
It shares `OpsCloud`'s verified administrator/editor session and existing RLS.
Sign-out/account change clears protected data, search results and profile dialogs;
late responses cannot repopulate them. No second authentication path is created.

Core read failures remove stale connected results. Optional journal/rent/catalog
failures are labeled separately. Missing journal data uses clearly marked imported
renewal statuses; it does not claim completed current tracking. Existing task edits
refresh and use the Today review dialog/RPC with concurrency checks. Navigation,
search, filtering, timeline viewing and document viewing do not write work records.

Maintenance counts represent saved maintenance **tasks**, not a work-order system.
Approvals are **not tracked**; lead/application modules are **guides only**. Notices
and generated drafts remain in their existing workflows. Document categories,
verified property/unit associations, versions, uploads, work orders, recurring
maintenance and listing/application integrations are subsequent bounded features.

## Module boundaries

`operations-model.js` contains pure search, relationship and action projections.
`operations.js` owns the authenticated read lifecycle and connected UI;
`operations.css` uses existing semantic theme variables. Small public adapters in
`workspace.js`, `portfolio.js` and `today.js` route to existing views and editors.
No financial, deposit, scheduling or legal delivery rules are introduced.
