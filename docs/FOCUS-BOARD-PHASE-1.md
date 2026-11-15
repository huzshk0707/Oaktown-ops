# Focus Board — Phase 1

Review branch: `feature/focus-board-phase-1`. Baseline: main `d5b4dfb` (v0.5.1).
This is an opt-in interface at `#/focus`, reachable through the Focus Board
Preview navigation entry. The full workspace remains at its existing URLs.
This branch is for review; it must not be merged or published automatically.

## Architecture inspected

| File | Existing responsibility | Phase 1 integration |
| --- | --- | --- |
| `index.html`, `workspace.js` | Buildless shell, screens, history/hash routes | Add a separate Focus Board section and `#/focus`; existing route meanings stay intact |
| `cloud.js` | Verified staff session, API calls, server permissions and account epochs | Reused unchanged; no second sign-in or credential path |
| `today.js` | Shared task fetch, snapshot, refresh and session clearing | Reuse `OpsToday.getData()`/`refresh()`; add a read lifecycle signal without changing task business rules |
| `today-model.js` | Active/terminal classification and Eastern schedule interpretation | Reused unchanged |
| `today-workstation-model.js` | Work-level labels from saved fields/workflow | Reused unchanged |
| `operations.js` | Search, quick actions and existing source workflows | Move the existing search button into the slim header during Focus Board mode; restore on exit |
| `workspace-clocks.js` | America/New_York and Asia/Kolkata clocks | Reuse the existing header clocks |
| `workspace-experience.js`, `workspace-theme.js` | Appearance dialog, themes and motion preference | Reuse existing controls; dark board surfaces use a theme-specific accent |
| `ops-task-reader.js` | New stateless extraction of the task request previously in Today | Shared paginated reader, including legacy additive-schema fallback; no cache or independent task store |
| `focus-board-model.js` | New pure projection | Active-only deterministic ordering; no writes |
| `focus-board.js`, `focus-board.css` | New board view/controller and scoped visual layer | Only selected task ID and pointer gesture state are owned here |

Focus Board reads the same in-memory task snapshot as Today/Tasks, through
`OpsToday`. It derives a sorted view on demand; it does not maintain a second
editable task collection, local task cache or database. The shared reader orders
pages by exact ID, fetches beyond 1,000 records and rejects repeated IDs rather
than returning a silently incomplete list. A changed account invalidates in-flight
reads. The existing verified staff boundary and backend access controls still apply.

`ops-today-state` reports `signed_out`, `loading`, `ready` or `error`. Empty is a
ready snapshot with zero active tasks. The board clears rendered cards during
loading/error and on sign-out; late replies cannot repopulate an old account.
`ops-today-data` retains its existing contract for other workspace modules.

## Deterministic order

All non-archived tasks classified as active by `OpsTodayModel` are included.
Existing terminal statuses (`completed`, `cancelled`, `canceled`, `closed`, `done`,
`declined`) are excluded without rewriting any status. Waiting/blocked work stays
active. Unknown statuses retain the current model's active semantics.

Each task belongs to the first matching lane:

1. **Overdue:** earliest recorded due/follow-up date is before the Eastern work day.
2. **Today:** that recorded date equals the Eastern work day.
3. **Urgent:** remaining tasks with saved priority `urgent`.
4. **Remaining:** every other active task, including undated work.

Within a lane: earliest recorded date first (undated last), then priority
`urgent → high → normal → low → other`, then lower-case title, then exact immutable
ID. String comparison uses code-unit order rather than the viewer's locale.
The final ID tie-break makes ordering independent of API/input order. A task can
appear in only one lane. At an Eastern day boundary, only the view is reclassified.

The schedule follows the existing `OpsTodayModel.scheduled()` interpretation:
`due_at` converted to America/New_York, valid date-only `intake_details.due.date`,
and `intake_details.follow_up.date`; earliest wins. The card displays **Due date**
and **Follow-up** separately. A follow-up does not become a fabricated due date;
its lane reads Follow-up overdue/today when applicable.

Task code is displayed where recorded, with the exact record ID also present.
Owner uses the saved label, then assigned user ID, otherwise Unassigned. Work
level uses the existing work-level model. Missing dates say Not recorded.

## Interaction and accessibility

- The selected card is large and centered; up to two neighboring cards on each
  side are smaller/dimmer. Every task is reachable regardless of total count.
- Left/right arrows, previous/next buttons, neighbor clicks and horizontal
  touch/mouse drags navigate. Home/End jump to the first/last active task.
- Navigation stops at the boundaries; controls indicate that state. There is no
  auto-advance. Selection is retained by ID across refresh if the task is active.
- Vertical gestures scroll normally. A horizontal drag needs at least 56px and
  clear horizontal intent. Canceled/vertical gestures do not select a new card.
- The deck is keyboard-focusable and labeled as a carousel. The selected slide
  has a position label; a polite live region announces position/title. Decorative
  neighbor copies are hidden from assistive technology. Buttons provide the
  equivalent action without requiring gestures.
- Keyboard events defer to open dialogs and form fields. Search and appearance
  use their existing dialog behavior. Both the device reduced-motion preference
  and the existing Motion control disable board transitions.
- Full workspace exits to the previous workflow/subtab (Today for direct entry).
  Browser Back/Forward and direct URLs continue to work. Sidebar/header layout
  overrides exist only while `focus-board-mode` is active.

Phase 1 has no Complete, Defer, Snooze or task-write controls. Swipe navigation
does not change status or save a task. Opening a source through global search
continues into its existing reviewed workspace; it is not a new board action.
No Phases 2–5, confirmation/Undo design, write endpoint or migration is added.

## Verification and review

Model/reader tests cover lane order, ties, Eastern timestamps, terminal/archived
exclusion, original-record preservation, multi-page reading, schema fallback,
malformed/repeated pages and stale-session rejection. Fictional browser tests
cover keyboard/buttons/neighbors, native touch input and mouse drag, over 1,000
active tasks, shared refresh data, loading/empty/error/retry, sign-out/late reads,
permission denial, all six appearances at 320/390/768/1440px, reduced motion,
and restoration of the original workspace. Navigation tests assert zero task
writes and unchanged source records. Existing workspace/browser checks remain.

Screenshots/preview use fictional fixtures. Branch CI and screenshot evidence
will be linked from the draft PR. Passing mocked tests do not certify a live staff
operation; no real task was edited for this development preview.

### Review captures

[Desktop](ui-review/focus-board-phase-1/desktop.png) ·
[Phone](ui-review/focus-board-phase-1/mobile.png).
These screenshots contain fictional tasks (`DEMO-*` codes), not operational data.
Local checks passed 191 Node tests and all six dedicated board scenarios. A scoped
axe scan of the board/header reported zero WCAG 2 A/AA and 2.1 AA violations across
all six appearances. This automated scan is not a full accessibility certification.
The draft PR records the final full-suite CI result for its exact head.
