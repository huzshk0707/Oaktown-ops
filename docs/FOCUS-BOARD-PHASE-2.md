# Focus Board visual upgrade and Center Focus Mode — Phase 2

Review base: Phase 1 `08888e6c53f74aca8b9e68f316a019f07e41a48d`, the current
head of draft PR #70 when inspected. Implementation branch:
`feature/focus-board-phase-2`; its draft PR targets `feature/focus-board-phase-1`.
PR #70 is left unchanged. Neither branch is merged or published by this work.

## Inspected architecture and decisions

Phase 1 notes remain in [FOCUS-BOARD-PHASE-1.md](FOCUS-BOARD-PHASE-1.md).
The existing `index.html` section and `focus-board.js` controller are extended,
not replaced with another application. `OpsToday` remains the single task snapshot
and refresh owner; `ops-task-reader.js`, `cloud.js`, Today/Tasks business models,
permissions, database schema and routes are unchanged in this increment.

- **Presentation model:** `focus-board-model.js` adds pure urgency appearance and
  detail projection functions. The Phase 1 `order`, `lane` and date rules are kept.
  Only saved text and exact linked IDs/labels from the shared snapshot appear.
  Description uses `intake_details.description` when available; notes use the
  existing task `notes` field. Next action, waiting-on and blocker fields are
  displayed when recorded. Unknown metadata is not dumped into the interface.
- **View/controller:** `focus-board.js` owns selected ID, modal ID and transient
  interaction tickets, not task records. Center clicks/taps, Enter/Space on the
  deck and the selected card's real button open the native dialog. Neighbors
  select first. Horizontal drags remain carousel navigation only.
- **Modal:** `index.html` defines one native `dialog`, with a scrollable content
  region, stable actions and a named title. Native modality makes the background
  inert; a Tab boundary guard and explicit logical-card restoration support
  keyboard use. Escape, Back to Board and an outside-backdrop click close it.
  Closing restores the same task/board scroll when still available.
- **Review:** Review Task prepares through the existing
  `OpsOperations.refresh(true)` and calls `OpsOperations.openSource('task', id)`.
  That unchanged path navigates to the existing Tasks Review editor, refreshes
  its snapshot/permissions, and retains its read-only-profile fallback. No editor
  is duplicated. Closing/signing out/navigating away invalidates a pending
  preparation before handoff. Opening Review does not submit its form.
- **Motion:** small Web Animations and CSS transitions provide directional card
  entry, a brief settling effect, modal opening/closing and progress/accent
  changes. There is no animation library or continuous/flashing effect. Existing
  Motion settings and the OS reduced-motion preference suppress/cancel motion.
  Viewport changes cancel carousel motion so cards remain centered immediately.
- **Visual layer:** all overrides in `focus-board.css` stay scoped to Focus Board
  or its dialog. Charcoal/navy depth, cyan accents, amber for today/urgent and
  restrained red for overdue support explicit text labels. Priority badges also
  identify the actual priority independently of the urgency accent.

## Data, refresh and session behavior

Opening, closing, Previous/Next and carousel gestures change only view selection.
They contain no task mutation, defer status, migration, new authorization path or
write endpoint. Deferral remains a future model decision separate from business
workflow status. The production landing route and Plan my morning remain intact.

While the modal refreshes, all task detail content is cleared and Review/Previous/
Next are disabled. On success it updates the same task by immutable ID. If the
selected task is no longer active/accessible, the modal explains that state;
it does not silently show another task's details. Back to Board chooses the
remaining active selection. On read failure the modal shows a retry state,
without stale notes or titles. Sign-out/account change clears/closes it immediately,
bypassing cosmetic close motion. Late read/preparation results cannot restore it.

Long notes use plain text, retain line breaks and scroll inside the panel. No
record text is interpreted as markup. Related records are shown only from saved
property/unit/lease/renewal links; missing labels retain the exact saved ID.
No guessed occupant, approval, payment, completion, contact or deadline is added.

## Files changed

- `focus-board.js`, `focus-board.css`, `focus-board-model.js`, `index.html`:
  HUD, activation, modal, review handoff, lifecycle and presentation.
- `tests/focus-mode.e2e.spec.cjs`, `tests/focus-board.e2e.spec.cjs`,
  `tests/focus-board-model.test.cjs`:
  interaction/security/ordering projection coverage.
- `tests/focus-accessibility.e2e.spec.cjs`, `.github/workflows/checks.yml`:
  repeatable scoped accessibility checks; pinned axe tooling in browser CI only.
- `tests/focus-board-fixtures.cjs`: additional fictional linked-record/error
  scenarios shared by existing and new board tests.
- `docs/workflow-state-inventory.json`, roadmap/audit and this guide:
  modal states, guards, inspection and review evidence.
- `docs/ui-review/focus-board-phase-2/*`: fictional review screenshots.

## Verification and captures

Coverage includes center activation vs neighbor selection; Enter/Space, Escape,
Tab wrapping/restoration; Previous/Next; native mobile touch; Review editor and
read-only fallback; loading/empty/error/retry; updates/removal/denied refresh;
sign-out and canceled late replies; untrusted long notes; reduced motion; and
more than 1,000 active tasks. Navigation asserts zero task writes. Existing
workspace, document, auth, task, model and disposable SQL checks are retained.

Board and modal layout checks cover 320, 390, 768 and 1440px. Scoped axe scans
cover six appearances on desktop board and phone modal. Automated checks do not
constitute a complete accessibility certification or a real staff operation.
Exact-commit CI results are recorded in the Phase 2 draft PR.

Required review scenes (all fictional `DEMO-*` task records):

1. [Desktop board](ui-review/focus-board-phase-2/desktop-board.png)
2. [Mobile board](ui-review/focus-board-phase-2/mobile-board.png)
3. [Desktop Center Focus](ui-review/focus-board-phase-2/desktop-center-focus.png)
4. [Mobile Center Focus](ui-review/focus-board-phase-2/mobile-center-focus.png)
5. [Overdue task](ui-review/focus-board-phase-2/overdue-board.png) and
   [its detail panel](ui-review/focus-board-phase-2/overdue-center-focus.png)
6. [Reduced-motion board](ui-review/focus-board-phase-2/reduced-motion-board.png)
   and [detail panel](ui-review/focus-board-phase-2/reduced-motion-center-focus.png)

Reduced motion intentionally preserves the information/layout; animations are
suppressed rather than replacing the appearance with a different design.

## Known limits and next boundaries

- Task updates become visible through the existing refresh path; no realtime
  subscription, offline task store or second fetch system is introduced.
- Review opens the established full-workspace editor/profile. Its existing Save
  remains an explicit user action outside this view-only navigation phase.
- Description/notes/associations show only fields already available in the shared
  snapshot. The modal cannot infer missing context or unseen/private source files.
- No Complete, Defer, Undo, gesture mutation, landing-route replacement, or
  “Morning done” behavior is implemented. Those need a separate reviewed design.
