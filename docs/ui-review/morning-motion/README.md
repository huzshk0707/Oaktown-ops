# Morning UX audit and review — 2026-11-17

Account: ravi. Base: released main `e96beea`. PR: [#86](https://github.com/huzshk0707/Oaktown-ops/pull/86).

## Audit findings and changes

| Priority | Finding on the released interface | Change |
| --- | --- | --- |
| High | Bare launch opened Today; the new daily command center was easy to miss. | Only a URL without a route opens `#/morning`. Explicit Today, Focus, task, property and lease links still work; unknown app routes retain Today fallback. Auth recovery hashes/ordinary anchors retain their handlers. |
| High | The manual planner appeared below a long, second dashboard with nested scrolling. | A visible **Prepare / edit SOD** control switches the existing overview to the existing planner. **Back to overview** restores the overview and keyboard focus. Neither action rebuilds the editor or loses draft text. |
| Medium | Flat, equally weighted panels made urgent work hard to scan. | Three real snapshot counts, restrained urgency borders with text labels, stronger central plan, clearer task typography and a prominent Focus action. |
| Medium | A disconnected deposit feed occupied the first screen while follow-ups sat lower down. | Follow-ups move into the first row. Deposit limitations stay explicit in a supporting panel; no simulated financial data. |
| Medium | Small loading text gave little sense of what the workspace was doing. | A three-part readiness strip reflects verified staff access, the shared task snapshot and the actual approved-plan request. Errors and missing plans remain textual. No percentages, fake AI reasoning or timed success. |
| Medium | Planner and workspace transitions were abrupt. | Finite staggered panel entrances, subtle orbit/line activity during real pending reads, generated-draft reveal and brief workflow/dialog entrances. Existing Focus navigation and focus-mode motion remain intact. |

The visual reference is the restrained reveal/progress language of AI workspaces such as Grok, interpreted for operational work. It is not a claim to reproduce Grok's internal processing. All controls are immediately usable; there is no splash-screen delay or animation-dependent navigation.

## Architecture and scope

`workspace.js` changes only the bare-entry fallback. `index.html` adds semantic presentation and controls. `daily-center.js` renders the existing OpsToday and approved-SOD state and toggles the existing planner. `daily-center.css` contains the desktop hierarchy and motion. No new runtime dependency, task fetcher, database, approval mechanism or write endpoint.

A valid direct link wins over the default entry. Full workspace remains one action away. The same SOD editor is mounted by the existing Morning controller. The preparation shortcut does not approve or generate a plan. Counts follow the selected Eastern date; deterministic task order stays authoritative. Sign-out clears private counts/content through existing events. The loading effect ends visually after a few cycles even if the server remains slow; the textual pending state remains until the actual response.

Device reduced motion and the existing Appearance motion toggle disable the new CSS animation/transitions, including pseudo-elements. Morning and Focus retain their existing dark HUD palette; the six appearance themes remain selectable for the full workspace. No new mobile layouts, gestures or mobile test suites.

The wider workspace receives only a short route entrance; its existing workflows are covered by the full regression suite. This is not a claim that every form and PDF workflow has been redesigned. The separately owned lease editor #85 is untouched.

## Desktop review

All captures contain fictional fixtures and zero operational writes.

- [Overview · 1280](overview-1280.png), [1440](overview-1440.png), [1920](overview-1920.png)
- [Planner](planner-1440.png)
- [Staff entry](staff-entry.png)
- [Reading approved SOD](reading-approved-plan.png)
- [Refresh failure](refresh-error.png)
- [Reduced motion](reduced-motion.png)
- [Existing Focus Board](focus-board.png)

Run the local server on port 8765; with the pinned CI Playwright dependencies, run `node scripts/capture-morning-motion.cjs`. `OAKTOWN_CHROMIUM_PATH` optionally selects the installed Chromium executable.

## Validation

Initial audit checks: 222 unit/API checks and 26 existing Morning/daily browser checks passed. New tests cover bare entry versus direct links/history/anchors, actual loading/error/sign-out states, planner draft and focus retention, live motion preferences, all six themes with axe, desktop widths 1280/1440/1920 and 1,005 tasks without writes. One initial focus-restoration defect was found and fixed by synchronizing control visibility before focusing the return button.

Full final results are recorded in the PR and final handoff. Existing workspace-specific tests now explicitly start at `#/today` rather than relying on the old root default; their assertions, security checks and mobile regressions remain intact. A dedicated new test covers the new root contract.

## Remaining work

Real mailbox, bank/deposit and external ChatGPT activation are separate integrations. This visual iteration does not imply they are connected. Human approval and reviewed task mutations retain their existing boundaries. Broader screen-specific redesigns should follow actual staff feedback after reviewing this change.
