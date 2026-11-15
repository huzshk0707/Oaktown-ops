# Oaktown Ops — current product and UI/UX audit

Audited November 15, 2026. Baseline: main `8250da647f4e7146a4e39d7aa8c2e9d26bf1da09`, after PR #68.

## Assessment

Oaktown Ops is a useful staff operations workbench. Its strongest implemented areas are task management, portfolio browsing, notice preparation and deposit packets. The next gains should come from actionable daily work, complete personal EOD recording, recoverable drafts and focused reliability work. Additional themes and a framework rewrite would have lower value now.

This audit combines current GitHub release evidence, source review, read-only live database aggregates/advisors, and local Chromium inspection using fictional records. No production data, configuration or application code was changed.

## Verified current state

| Area | Current capability | Remaining boundary |
| --- | --- | --- |
| Release | PRs #50–#52 are merged; main has progressed through #68. No open PRs or issues were returned. Current main has successful checks, browser, schema and Pages jobs. | Pages publication is verified through GitHub; direct live-site loading was blocked in this environment. |
| Daily work | Today, separate Tasks workspace, All work/History/Add-import, filters, focus, SOD preparation, personal EOD output and stable URLs. | Prioritization depends on recorded task dates and owners. Completion alone does not establish personal EOD attribution. |
| Portfolio | Live counts: 112 properties, 124 units, 110 tenancies, 114 leases, 118 renewal cases, 46 tasks, 633 source links. All 13 existing relationship checks returned zero violations. | These checks do not certify every source fact, current tenancy, rent or executed agreement. |
| Notices | Ordered unit selection, CSV input, preview, PDF/ZIP and tenant-message preparation. | External payment exports, sending and legal service remain manual. |
| Renewals | Tracking journal, clearer reviewed-save feedback and five-page unsigned PDF. | Journal preflight and append are separate requests, leaving a simultaneous-writer race. |
| New leases | Guided preparation and page 8 condition-sheet output with visible limitations. | Complete ten-page export remains unavailable. |
| Applications/deposits | Application guide plus holding-deposit DOCX, vendor PDF, editable email and ZIP packet. | Temporary inputs; no saved application case, payment collection or executed-lease lifecycle. |
| Monthly reminders | Migration applied; six private rules configured; monthly confirmation and calendar export implemented. | Zero recorded confirmation/audit events at audit time. Calendar imports do not sync subsequent changes. |
| ChatGPT connector | Migration applied; task Edge Function ACTIVE. | Zero registered clients and proposals. Personal EOD performer/date fields are unsupported by its current write contract. |
| Maintenance/listings/leads | Maintenance can be represented as tasks; guide/prompt workflows exist. | No complete maintenance work-order or lead/application pipeline. |

Evidence: [current main](https://github.com/huzshk0707/Oaktown-ops/tree/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09), [passing checks](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43062109383), [Pages deployment](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43062109514), [merged UI PR #52](https://github.com/huzshk0707/Oaktown-ops/pull/52).

## Priority findings

### 1. Make daily work actionable

Live tasks comprise 30 pending, 4 waiting, 3 in progress, 8 completed and 1 archived. Of 37 active tasks, **35 have no recorded due date or follow-up**, including the `due_at` field, and **9 have no assignee**.

A date-driven dashboard can appear quiet despite substantial work. Undated does not mean overdue; deadlines must not be invented.

**Recommendation:** Add a visible Needs planning queue. Review owner, next action and confirmed follow-up date, with an explicit “no date needed” option. Show waiting tasks with their dependency and next check date.

**Acceptance:** Every active task has either a confirmed schedule or an explicit intentionally-unscheduled classification. Operational changes retain review and history.

### 2. Complete the personal EOD recording path

Personal EOD correctly requires actual performer and Eastern work date rather than assuming the assignee did the work. Two completed task records currently contain the qualifying Huzy attribution fields. Separate attributed work events can also contribute; this is not a total EOD action count.

The editor and scoped connector do not expose the complete attribution path needed by the reader. The connector's allowed fields exclude `intake_details.eod.completed_by` and `work_date`, and there are no registered clients.

**Recommendation:** Add a reviewed Record work / Complete task form with actual performer, work date, specific action and evidence note. Allow recording an action without closing unfinished parent work. Extend the scoped API with the same approval, audit and exact read-back protections; then verify a real authorized connection.

**Acceptance:** An approved action appears exactly once under the correct performer/date. Leslie's work never becomes Huzy's through assignment. Duplicate requests and revoked access remain covered.

Evidence: [operating protocol](https://github.com/huzshk0707/Oaktown-ops/blob/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09/docs/CHATGPT-PROJECT-OPERATING-PROTOCOL.md), [connector contract](https://github.com/huzshk0707/Oaktown-ops/blob/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09/supabase/migrations/20261108071838_authenticated_task_connection.sql).

### 3. Put the next action first on mobile

The mobile menu, compact header, separate Tasks view and clearer guide labels are useful improvements. Today still stacks search/library controls, shortcuts, five KPI cards, SOD and reminders before urgent tasks. Overdue and Urgent/overdue overlap conceptually.

With three fictional active tasks and one fictional reminder, the urgent section starts around **1,441 px** down a **390 × 844** viewport; the page is approximately 2,950 px tall. On desktop it starts around 946 px. Ten page/width combinations had no horizontal overflow or observed JavaScript page errors. The issue is hierarchy and vertical length.

**Recommendation:** Put Focus now and Needs attention directly below a compact date/status row. Use a short summary strip; disclose SOD, full monthly schedule and EOD on demand. Keep only a concise attention reminder above tasks. Move archive/history shortcuts into Tasks. Consolidate competing Refresh controls into a clear current-workspace refresh with last-updated and failure feedback.

**Acceptance:** A relevant actionable task is visible in the first mobile viewport under a typical signed-in state. Preserve keyboard/button alternatives if swipe or snooze is introduced later.

### 4. Protect unfinished document drafts

Lease preparation has a reload warning. Deposit preparation describes its temporary scope, but a fictional filled deposit draft reloaded with **no browser warning** and lost its address. Its controller has no `beforeunload` protection. Exported output cannot currently be resumed as an editable saved application case.

**Recommendation:** First add consistent dirty-draft protection to deposit/SOD forms; then permission-controlled resumable drafts. Show accurate per-module storage status and last-saved time. Preserve deliberate sign-out cleanup and account isolation.

**Acceptance:** Users can intentionally discard or resume unfinished work. A downloaded packet is never described as a saved case, sent email, received payment or signed lease.

Evidence: [deposit controller](https://github.com/huzshk0707/Oaktown-ops/blob/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09/deposit-preparation.js), [deposit scope](https://github.com/huzshk0707/Oaktown-ops/blob/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09/docs/DEPOSIT-PREPARATION.md).

### 5. Make renewal updates atomic

The checking/saving/verifying/review-required lifecycle handles uncertainty more clearly. A remaining server race exists because reading the latest event and posting the next one are separate requests.

**Recommendation:** A transactional append API accepting the expected prior event and stable request identity, with exact committed-event read-back. Test simultaneous updates, dropped responses and duplicate retries in the disposable database.

**Acceptance:** Stale competing writes require review; retrying the same approved request cannot add duplicate history.

Evidence: [workflow-state contract](https://github.com/huzshk0707/Oaktown-ops/blob/8250da647f4e7146a4e39d7aa8c2e9d26bf1da09/docs/WORKFLOW-STATES.md).

### 6. Finish the application-to-lease journey

Deposit packets are useful, but the journey still crosses temporary inputs, external sending and an incomplete lease exporter. Applications is labeled only Guide despite now containing a working packet tool.

**Recommendation:** Label it Applications & deposit packets; separate guidance from preparation. Carry reviewed facts into resumable application/deposit/lease drafts. Complete the ten-page exporter against approved templates and resolved business rules. Keep prepared, reviewed, sent, signed and received as distinct evidence-backed states.

**Acceptance:** A fictional reviewed case can be resumed, handed into lease preparation and exported with verified page count, content fit and blank signing areas.

## Further UI improvements

- Keep the selected property and Select → Edit → Review/export navigation visible in Notices; progressively disclose advanced bulk tools. The current default notice view is long, especially on mobile.
- Surface owner, next action, schedule and blocker in task rows. Add My work, Waiting on others and Needs planning filters backed by actual saved data.
- Reduce repeated explanatory copy while keeping essential limitations beside the relevant action.
- Perform a dedicated contrast, keyboard and screen-reader pass across all six themes. Existing theme/reflow checks do not establish accessibility conformance.
- Keep motion optional. Define whether snoozing changes a reminder, follow-up or due date before adding the interaction; preserve original deadlines.

## Operational controls and documentation

The project reports ACTIVE_HEALTHY, health advisors returned no findings, and all 30 inspected application/private tables have RLS enabled. Two security warnings remain: [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and [authenticated execution of the archived-task deletion SECURITY DEFINER function](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Review the latter's intentional staff/role guards rather than removing it blindly. Nine private-table no-policy findings are informational in the RPC-only design; broad client policies would be inappropriate.

The documented recovery exercise covered application data and original PDFs. Scheduled retention and complete Auth/provider/platform recovery remain unverified in the available evidence. Assign ownership and validate a bounded restore.

Current-status documentation has drifted: the roadmap introduction still describes PRs #40–#45; AGENTS.md says private while GitHub reports public; the roadmap calls the backlog migration unapplied while live history includes it. The live backlog migration version differs from the source filename. Reconcile evidence before another rollout; do not reapply based on the filename alone.

The latest remote tag is v0.5.0 at PR #67's merge; current main additionally includes the release-process documentation PR #68. A small version/build identifier and concise release/status page would make the deployed state easier to understand.

Zero backlog import receipts and zero reminder events mean no recorded evidence in those ledgers, not that real-world work did not occur. Do not automatically rerun imports or classify bills as unpaid.

## Recommended release order

1. **Daily usability:** shorter Today, Needs planning visibility, draft-loss protection and current-status documentation.
2. **Personal work reporting:** reviewed action attribution, scoped connector support and verified end-to-end connection; authorized task owner/date triage.
3. **Reliability:** atomic renewal journal writes, security-advisor disposition and recovery ownership.
4. **Larger product milestone:** resumable application/deposit/lease drafts and complete ten-page export, followed by maintenance/integrations.

## Verification limits

Live reads were aggregate-only. Screenshots use fictional fixtures and exact current-main source, not a real staff session. Public-site loading was blocked through this environment, so deployment is supported by the successful Pages workflow rather than a fresh authenticated live-site test. No fixes were implemented or merged during this audit.

## First implementation increment

The `feature/audit-daily-usability` follow-up implements the first bounded release:
Today places urgent work/focus before summaries and reminders; the Needs planning
entry opens a searchable active-task view for missing owner or recorded schedule;
summary cards use a shorter layout; deposit and SOD edits warn before leaving the
page. Clearing the deposit draft or signing out resets its warning. These are
view/draft protections, not durable saving or changes to actual task owners/dates.
The tests cover recorded timestamp schedules, completed/archive exclusion,
read-only navigation, session clearing, six themes and draft discard behavior.
CI, merge, publication and the immutable release tag are recorded in the PR.
The remaining audit recommendations retain the order above.
