# OPS-FOCUS-REVIEW.1 — Focus Board Phases 1 and 2

Reviewed by **hp**, 2026-11-16. This is an independent source/fictional-fixture
review, not operational staff activity, feature implementation, product sign-off
or merge/deployment permission. Review PR: [#76](https://github.com/huzshk0707/Oaktown-ops/pull/76).

## Finding — P2: offset pagination can silently omit current tasks

Both reviewed heads use the same offset-based shared reader at
[`ops-task-reader.js:12–18`](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/ops-task-reader.js#L12-L18).
If an authorized deletion removes a row before the current page boundary while
a task collection spans multiple pages, subsequent offsets shift. The next page
can skip a still-current task without repeating any ID. The duplicate-ID guard
therefore cannot detect this case, and `OpsToday` can publish the result as ready.
This is a read-completeness bug introduced with Phase 1's pagination, inherited
unchanged by Phase 2; it is not an authorization bypass or a task write.

Reproduction against **each exact source head**, using only generated fictional IDs:

1. Start with IDs `000000` through `001001` (1,002 rows).
2. Reader receives the first 1,000 rows; delete `000000` before the second read.
3. The next `offset=1000` returns `001001`, skipping the current `001000`.
4. Read resolves successfully with 1,001 unique IDs, including deleted `000000`
   and excluding current `001000`. Equal total counts do not establish completeness.

[Runnable reproduction](reproduce-focus-reader.cjs) ·
[Observed output](focus-phase-1-2/reader-deletion.json).
The reproduction exits zero only when this documented bug is observed; it is
**not a passing functional-completeness test**. Existing stable-page, duplicate,
legacy-schema and stale-account tests all pass and do not exercise this deletion.

Suggested bounded follow-up **OPS-FOCUS-READER-CURSOR**: replace offset traversal
with a supported immutable-ID cursor/keyset contract, retain account/failure
checks, and add deletion/insertion page-boundary regressions. If the product
requires one point-in-time task snapshot, specify a server snapshot/RPC contract;
keyset traversal alone is not a transactional snapshot. Do not fix this by
silently returning partial pages or claiming the current guard detects every
concurrent change. No reader or feature code was changed in this review.

## Exact review targets and current hosted evidence

| PR | Head reviewed | Base | Exact-head hosted run |
| --- | --- | --- | --- |
| [#70](https://github.com/huzshk0707/Oaktown-ops/pull/70) | `08888e6c53f74aca8b9e68f316a019f07e41a48d` | main | [43756605147 — success](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43756605147) |
| [#71](https://github.com/huzshk0707/Oaktown-ops/pull/71) | `70f63c43232f8efe7ec58ac769b949dbc31498b9` | Phase 1 | [43760761164 — success](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43760761164) |

Verified through live PR/check and run head-SHA reads, not dated guide claims.
Both remain draft. Both branches predate HANDOFF.md; canonical rules were read
from current main `065a88cdd3ef358190a47ba2a258a66d35b9c848`. No live owner claim
was present for this review substep. Feature PRs/branches were left unchanged.
The published Phase 5 work (#75) was recognized as already complete and was
not restarted or included in this Phase 1/2 review.

Earlier full hosted records are green: Phase 1 reports 191 unit / 204 browser
checks; Phase 2 reports 193 unit / 215 browser checks, plus schema, dependency,
Deno and inventory jobs. New local results below are focused independent
reruns, not a claim to have re-executed those entire historical suites.

## Acceptance and architecture assessment

| Area | Assessment and evidence |
| --- | --- |
| Shared data | Board reads `OpsToday.getData()`/`getState()` and calls its refresh. Phase 1 extracts the stateless reader from Today; it creates no editable task cache, second staff client or new endpoint. Phase 2 does not change that reader, Today, `cloud.js` or business classification. Pagination caveat is the finding above. |
| Deterministic order | Existing Eastern schedule/status interpretation is reused. Exclusive overdue → today → urgent → remaining lanes; stable date, priority, title and ID ties; terminal/archive exclusion; recorded follow-up stays distinct from due date. Pure-model tests pass without record mutation. |
| Carousel | Buttons, arrows, Home/End, neighbor selection and drag navigation preserve view-only behavior. Existing tests reach 1,007 records, preserve selection on successful refresh, stop at boundaries, distinguish vertical gestures, and assert zero task writes. |
| Center Focus | Only Phase 2 adds the native dialog. Selected-card activation and Enter/Space open exact saved context; neighbors select rather than opening a different task. Text uses textContent; untrusted long notes are not interpreted as HTML. Related labels come from saved associations, with exact IDs when unavailable. |
| Keyboard and focus | Native modality plus Tab boundary handling keeps focus in the dialog. Background carousel arrows are disabled while a dialog is open. Escape, Back and backdrop close restore the logical selected-card button; navigation changes exact selected IDs. Scoped six-theme axe and existing keyboard tests pass. This is not a full assistive-technology certification. |
| Review integration | Phase 2 `focus-board.js:100–112` calls existing `OpsOperations.refresh(true)` and `openSource('task', id)`. `operations.js:128–143` refreshes Today and routes to the established editor only when current data allows editing, otherwise uses the existing profile fallback. Entry does not submit Save. Tests verify editor/profile paths and canceled late preparation. |
| Refresh and security | Loading/errors clear rendered private task context; task removal disables Review rather than substituting another record. Account/interaction guards invalidate late reads/preparations; sign-out immediately clears/closes the modal. Fictional denied-read tests pass. `cloud.js` and permissions are unchanged; no real staff session was used. |
| Motion and layout | Existing OS/app reduced-motion paths suppress effects; viewport changes cancel card motion. Existing resize/reduced-motion tests pass. Independent desktop checks verify centered cards, no document overflow, fitting modal/body and focus restoration at 1280/1440/1920px. |
| Existing workflows | Today remains the default, `#/focus` opt-in; Full workspace returns through existing routing. No Complete/Defer/Undo controls exist in these phases. Those belong to review step 2, not a deficiency to reimplement here. |

Source anchors for the Phase 2 assessment:
[render/selection](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/focus-board.js#L36-L62),
[dialog/review lifecycle](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/focus-board.js#L64-L112),
[keyboard/session guards](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/focus-board.js#L123-L153),
[order/detail projection](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/focus-board-model.js),
[existing Review route](https://github.com/huzshk0707/Oaktown-ops/blob/70f63c43232f8efe7ec58ac769b949dbc31498b9/operations.js#L128-L143).

## Independent checks and repeatable commands

Exports were made with `git archive <full-sha> | tar -x -C <empty-directory>`.
They preserve the exact reviewed app code without checking out, claiming or
editing either feature branch. Node 24, Playwright **1.56.1**, axe **4.10.2** and
its downloaded Chromium were used. Review scripts take an explicit source export
so another account can reproduce this without private chat or retained local files.

| Target | Command from export root | Result |
| --- | --- | --- |
| Phase 1 | `node --test tests/focus-board-model.test.cjs tests/ops-task-reader.test.cjs` | 6 passed, 0 failed/skipped |
| Phase 1 | `playwright test tests/focus-board.e2e.spec.cjs --reporter=line --workers=1` | 6 passed; existing fictional navigation/security/layout cases |
| Phase 2 | `node --test tests/focus-board-model.test.cjs tests/ops-task-reader.test.cjs` | 8 passed, 0 failed/skipped |
| Phase 2 | `playwright test tests/focus-board.e2e.spec.cjs tests/focus-mode.e2e.spec.cjs tests/focus-accessibility.e2e.spec.cjs --reporter=line --workers=1` | 17 passed; zero navigation writes; existing six-theme scoped axe passes |
| Each export | `node docs/reviews/reproduce-focus-reader.cjs <export>` from this review branch | Documented deletion bug reproduced on both heads, 2 read callbacks / 0 writes |
| Phase 2 export served on 8765 | `node docs/reviews/capture-focus-desktop.cjs <phase2-export> <output-directory>` from this review branch | 3 desktop sizes passed; 0 task changes, writes or page errors |

For browser commands, serve only the matching export on local port 8765 with
`python3 -m http.server 8765 --bind 127.0.0.1 --directory <export>`. Use the CI-pinned
Playwright tools; when installed outside the export, provide NODE_PATH and
PLAYWRIGHT_BROWSERS_PATH for that installation. Only stop a server you started.
No localhost preview link is a durable deliverable.

Existing mobile/security regression cases were retained and run as part of the
existing suites. This review creates no mobile feature, gesture, screenshot or
mobile-only test suite. No database schema, task write, deployment or live
Supabase operation was necessary for this view-only audit.

## Desktop evidence

All screenshots show generated fictional DEMO tasks; no tenant/staff credentials
or real operational records were used. The capture script verifies that the served
controller bytes equal the supplied exact-head export. Geometry, source-controller
SHA256, zero writes/page errors and Escape focus restoration are recorded in
[desktop-acceptance.json](focus-phase-1-2/desktop-acceptance.json).

| Width | Board | Center Focus |
| --- | --- | --- |
| 1280 | [Board](focus-phase-1-2/phase2-board-1280.png) | [Center](focus-phase-1-2/phase2-center-1280.png) |
| 1440 | [Board](focus-phase-1-2/phase2-board-1440.png) | [Center](focus-phase-1-2/phase2-center-1440.png) |
| 1920 | [Board](focus-phase-1-2/phase2-board-1920.png) | [Center](focus-phase-1-2/phase2-center-1920.png) |

Visual inspection of the 1440 board and 1920 modal confirms readable selected-task
hierarchy, recessed neighbors, recorded fact labels, visible navigation/Review,
shared clocks/header controls and a bounded modal. Passing fit/axe checks does not
establish product acceptance or certify every long-content/assistive-device case.
Original source-head captures remain available for
[Phase 1](https://github.com/huzshk0707/Oaktown-ops/tree/08888e6c53f74aca8b9e68f316a019f07e41a48d/docs/ui-review/focus-board-phase-1)
and [Phase 2](https://github.com/huzshk0707/Oaktown-ops/tree/70f63c43232f8efe7ec58ac769b949dbc31498b9/docs/ui-review/focus-board-phase-2).

## Disposition and exact next step

Review substep 1 is substantively complete with one confirmed P2 finding. No
additional carousel/modal/Review defect was established by these scoped checks.
Do not convert that statement into blanket security or merge approval. The
pagination finding remains open for a separately claimed bounded fix.

**NEXT STEP:** claim unowned `OPS-FOCUS-REVIEW.2` using the current main protocol,
fetch `feature/focus-board-phase-3`, and inspect
`git show origin/feature/focus-board-phase-3:docs/FOCUS-BOARD-PHASE-3.md` alongside
its action model/database/browser tests. Carry this read-completeness finding
into consolidation step 4; do not reimplement Phases 1/2 or merge their drafts.
