## PR #94 browser regression fix — 2026-11-22T07:23:58.308Z

- Owner: chatgpt; claim 2026-11-22T07:23:58.308Z – 2026-11-22T07:53:58.308Z. Existing PR head before claim: 915c3425e163d35ebc21492b2417847735f4dff8.
- Verified: browser job failed 1/305 tests due to intentional advanced room-position collapse; test tried selecting hidden #newlease-roomSection in tests/lease-template.e2e.spec.cjs:20. Prior run: 304 passed.
- NEXT STEP: Expand .lease-draft-placement in the existing browser test, rerun exact-head CI, inspect before any authorized merge. No backend/production writes.

## Active lease rehearsal UX PR #94 — 2026-11-22

- **Owner:** chatgpt. **Branch:** `chatgpt/lease-rehearsal-ux`. **Base:** main d4e4df5ff8455e7cd5641e818cb98cc0e1c3d4b7. **Claim:** 2026-11-22T07:16:22.837Z to 2026-11-22T07:46:22.837Z UTC.
- **Scope:** staff-only fictional one-bedroom rehearsal UI; no real tenant details or approved master PDFs committed; no runtime backend/schema change, operational write, approval, deployment or merge.
- **Completed:** rehearsal launcher (no unit linked), print-vs-pet deposit distinction, five-step progress, advanced room placement collapsed, review issue edit links, style/version updates, fictional regression test and `docs/LEASE-REHEARSAL-UX.md`. `TASKS.md` tracks the draft PR.
- **Static checks:** modified JS and browser test parse successfully; CSS braces balanced; changed code/docs/test free of real applicant and Cherokee identifying strings. CI `checks` and `portfolio-schema` passed at earlier implementation and current head `0e5a2098cf8a`; `browser-downloads` was running at 2026-11-22T07:16:22.837Z.
- **Current last implementation tip:** `0e5a2098cf8a160e551d7236778a1f47bd7294de` (before this handoff-only commit).
- **Claim released at 2026-11-22T07:17:17.723Z. NEXT STEP:** review exact final-head GitHub Actions browser result and fictional Page 8 preview, fix any failure, then request staff UX acceptance. Keep PR draft and do not merge or deploy without separate authorization; separate clean-master and Supabase migration activation remain outstanding.

## ChatGPT Morning Plan integration

- Owner felix. Claim released 2026-11-22 07:12 UTC after implementation and local verification. [PR #93](https://github.com/huzshk0707/Oaktown-ops/pull/93) targets `main` from `felix/morning-plan-consent`. The verified personal-consent migration from `93001e3` is preserved.
- `read_morning_priority_snapshot` reads the complete active priority pool through the scoped task RPC. Its 25-row pages carry a total and cursor. A change in the pool invalidates the cursor. The three plan tools keep exact proposal submission, native staff review and independent approval readback.
- Verified with 240 Node tests, workflow inventory, Deno type check, the disposable PostgreSQL 16 workflow, and 61 targeted Chromium cases. The database test compares snapshot ordering to the browser model and checks stale versions, duplicate intent, authorization denial and existing scoped task create and update.
- **NEXT STEP:** Review PR #93 and its final GitHub Actions run, then use [the manual rollout steps](docs/CHATGPT-TASK-CONNECTION.md#manual-rollout-after-pr-review) after separate authorization.

## Individual task archive

[PR #92](https://github.com/huzshk0707/Oaktown-ops/pull/92) targets main from `codex/single-task-archive`. Owner Codex, claim released after local verification. The task editor shared by Tasks and Focus offers More actions → Archive task. Its confirmation uses the saved title, checks editor access and the reviewed version, and verifies the one-task receipt against refreshed data. Existing History Restore verifies identity, version and saved status. Bulk settings and connector permissions are outside this change.

Local verification passed for 239 Node tests, workflow inventory and 58 Chromium cases in the Today suite (57 together plus the Focus Center entry case). The disposable database job passed for the archive/restore field, history and isolation assertions in checkpoint `3150157`. NEXT STEP: review PR #92 and its final checks. After separate deployment approval, staff can manually archive the designated fictional task and restore it through Tasks → History.

# Current handoff — 2026-11-22 Oaktown Ops delivery plan

**Status:** [PR #88](https://github.com/huzshk0707/Oaktown-ops/pull/88) reconciles the November 22 plan with Huzy’s first-screen direction. Huzy authorized merging the documentation after review. Codex reviewed the three documentation files against main `b91b4c7`, the agreed Friday workflow and the current Morning implementation. The UI work has its own handoff in [PR #89](https://github.com/huzshk0707/Oaktown-ops/pull/89).

## What is already finished

- Focus and Morning release PR #84, Morning UX PR #86, Page 8 frontend PR #85 and lease source provenance PR #87 are **merged to main**. The final main `b91b4c7` had successful [CI](https://github.com/huzshk0707/Oaktown-ops/actions/runs/44090288462) and [Pages](https://github.com/huzshk0707/Oaktown-ops/actions/runs/44090286047) runs. The old stacked PRs were closed; no open PRs existed before draft #88.
- Current task API backend is an ACTIVE Supabase Edge Function (v3); morning-plan migration `20261116051226` is registered. Page 8 frontend publication does **not** mean its separate backend is installed.
- This PR changes **only** `docs/ROADMAP.md`, `TASKS.md` and `HANDOFF.md` and preserves prior dated plans as history. It does not modify runtime/test code, migrations, credentials, any Supabase row, or platform authorization.

## Read-only operational status checked 2026-11-22

- 46 tasks total, **36 active** of which 4 are `waiting`. **34 active** lack both a due timestamp and structured follow-up field.
- Scoped task-agent registered clients: **0**. No valid active ChatGPT task client/consent was established by this check. A deployed backend must not be described as a completed OAuth activation.
- `morning_plan_approved_v1` event count: **0** at review; this says nothing about outgoing SOD emails sent from Gmail.
- Page 8 migration `20261116060547_lease_preparation_page8_editor.sql` is **absent from Supabase's registered migration list**; the private preparation schema and RPC were absent on read-only inspection. Do not apply automatically or rewrite migration history.
- Accounting issue [#83](https://github.com/huzshk0707/Oaktown-ops/issues/83) remains discovery-only.

## Product intent and constraints

For Huzy's **7 PM–5 AM IST** shift (Louisville working hours), start with current urgent/waiting/one focus task, work through one Focus action at a time, capture new instructions without disruption, and end with an accurately attributed EOD. ChatGPT reasons using Gmail/supplied texts, saved Supabase task/history and verified Oaktownbrain SOPs; Huzy reviews change proposals; authorized scoped actions save and independently read back; the UI displays the same saved source of truth. No parallel ledger or competing command center.

## Active priority and precise handoff

1. **First build: OPS-SHIFT-BRIEF.1 in PR #89.** Confirm that Morning immediately shows what needs attention, who is holding the next action, and the exact task to open in Focus. Keep SOD drafting and approved-plan review available.
2. **Operational gates:** Assess OAuth registration and consent read-only before the fictional ChatGPT task connection test. Reconcile and verify the Page 8 backend and approved original sources through a separate operator step.
3. **Follow-up build:** Improve the existing Needs Planning workflow one task at a time. Finish actual-performer EOD attribution and rehearse the statement and Gary’s hours across the Friday shift. Keep the external timesheet as the time record.
4. **Later work:** Quick capture and reviewed intake in the same daily ChatGPT Project, property inspection-to-maintenance, and separate Oaktown Records and Brain projects.

**NEXT STEP:** Review the first-screen implementation and fictional desktop preview in PR #89. The wider plan and exact acceptance criteria are in [the roadmap](docs/ROADMAP.md) and [TASKS.md](TASKS.md).

## Documentation review

- Baseline evidence is dated November 22. This review changes the roadmap, task index and handoff. PR #88 branch ownership is released after the documentation checkpoint.

---

## Historical handoffs — prior November 17 checkpoints (non-authoritative)

### Morning integration reviewed — hosted gate pending

- Owner codex, heartbeat 2026-11-17 13:03 UTC, expiry 13:33 UTC. User authorized #86/#87 merge and closure of historical PRs. Current branch ravi/morning-motion; runtime integration 659d85e.
- #87 merged at 1d9fea2. Resolved four conflicts against current main preserving the complete lease generator, template provenance, Morning UI, both CI captures and both task histories.
- Local combined validation: 239 Node/API tests, 28 Morning/lease browser cases, workflow inventory 30/69 and diff check passed. Source reviewed; no new write/auth/backend path. Full hosted CI 44088330057 pending at runtime checkpoint; this completion note changes docs only.
- Closed #71/#72/#73/#75/#77/#81/#82 after verifying exact current tips are ancestors of main. Closed #76/#78/#79/#80 as completed historical reports; evidence and branches retained.
- NEXT STEP: confirm all hosted jobs on the final branch pass; mark #86 ready and merge with expected SHA, verify exact-main CI and Pages, create next unused annotated patch tag. Then update PR with publication proof and release claim. No production SQL or operational writes.

### Authorized merge continuation

- Owner codex; heartbeat 2026-11-17 12:57 UTC; expires 2026-11-17 13:27 UTC. Previous ravi claim expired; user requests review/merge #86 and #87 plus old-PR closure.
- Exact #86 head 92cbfaa reviewed; all CI jobs pass. #87 reviewed and merged separately. Current #86 conflicts with newer lease work; preserve both implementations with a normal merge of current main, then rerun combined checks. No production schema changes.
- NEXT STEP: resolve main integration, run combined UI/lease regressions and hosted CI, merge #86 only when passing. Preserve branches and retain older review evidence in closed PRs.

### Handoff — Morning UX and motion

- Last updated: 2026-11-17 07:53 UTC by ravi; claim expires 08:23 UTC.
- Current task / branch / PR: OPS-MORNING-UX / `ravi/morning-motion` / PR #86; base main e96beea.
- Done: inspected live main, release #84, open PRs and branch ownership. Integrated release already merged; active #85 lease editor belongs to another account and is outside scope.
- In progress: implementation and fictional desktop captures complete; full regression run underway; before/after screenshots and optional fictional WebM saved. Changed workspace.js, index.html, daily-center.js/css; existing test entry URLs now explicit Today; new morning-motion browser tests. No backend changes.
- NEXT STEP: inspect the latest PR #86 CI after this checkpoint; fix any regression, review screenshots in docs/ui-review/morning-motion, then record final validation and release claim. Local 222 unit/API and 26 existing Morning/daily browser checks passed. Initial full local sweep: 270/277 passed; the remaining seven found one access-refresh test race, legacy navigation-helper assumptions and the need to keep submitted-plan review available inside planning. All are corrected; 18 targeted Morning/plan/connection checks and the Focus gesture retry pass. Await exact-head full CI. Existing Focus gesture test exposed a cancel-during-access-refresh setup race; targeted retry passed, and test now waits for the actual enabled handle before keyboard activation. No write behavior changed. The same pending-plan panel moves between overview and planner; no duplicate review workflow or requests. New test caught return-focus timing, now fixed; full run includes it.
- Known limits: old local ravi/focus-release worktree has unpushed Python smoke helper/workflow edits from the previous interrupted session; untouched and superseded by hp’s published verification helper. Do not replay or discard those files automatically. No backend changes or operational writes required here.
- Tests: Node unit suite; targeted then full Playwright with fictional fixtures at desktop widths; workflow inventory; all six themes and reduced motion. Document exact results in PR.
- Decisions: separate task branch; no overlap with lease work. User asks for Grok-inspired motion, not fake reasoning, invented progress or a blocking splash. Existing auth, writes, approvals and direct links remain intact. Earlier release authorization completed through #84; this UI iteration will be independently reviewable.

#### Previous main handoff (historical)

### Handoff — authorized Focus merge and publication
### Source provenance follow-up complete

- Owner codex; claim released. Branch `codex/lease-source-provenance`, PR #87, base merged main bef12a8. **No merge/deploy/production writes.**
- Recovered original Page 8 builder; exact source/font fingerprints and PyMuPDF version enforced. Rebuilt PDF hash exactly equals the merged asset. Three rendered sizes match; original-vs-repaired comparison has zero changed pixels outside documented repairs.
- Existing source/PDF/model tests passed (17). No runtime, template binary or migration changes. Superseded local runtime changes are preserved outside Git as a recovery patch; merged #85 remains authoritative.
- NEXT STEP: review #87's builder/provenance evidence. For operational activation, obtain/review a clean unsigned full master and separately authorize/install the staged lease migration. Existing full CI/Pages at main bef12a8 passed; do not redo #85 or infer database installation from frontend publication.

### Source provenance follow-up

- Owner codex, heartbeat 2026-11-17 12:24 UTC, expires 2026-11-17 12:54 UTC. Base merged main bef12a8. Separate follow-up; do not merge or deploy.
- Checked shared completion: PR #85 merged at bef12a8; exact-main CI 44050224515 and Pages 44050221138 both passed. Preserve that implementation. Its database migration remains staged and clean-master acceptance remains outstanding.
- Earlier local runtime edits were superseded by 2666400; saved a recovery patch outside Git without overwriting current work. A clean checkout under /tmp avoids the full /workspace filesystem.
- NEXT STEP: recover the original blank-checklist repair builder, compare its rendering with the retained asset, document reproducible source evidence, and open a separate review PR. No app/SQL/data changes.

### Current continuation — source integration complete; authorized merge pending CI

- Owner **hp**, heartbeat **2026-11-17 08:43 UTC**, expires **2026-11-17 09:13 UTC**. Latest user explicitly authorizes completion and merge of PR #85; older no-merge instructions below superseded. Existing branch retained, normal pushes only.
- Completed source-profile UI: explicit placement suggestions, original blank Page 8 preview, measured mapping on a matching clean master; no automatic full-master substitution. Fixed slash-containing condition bindings, baseline fit and moved-room labels; grouped fields validated in staged SQL. Existing engine rejects known signed/premarked full-master hashes.
- Tests: 239 Node pass; 13 lease browser flows pass plus desktop/themes and ten-case rendered preservation (five synthetic, five retained original blank). Disposable SQL passes including grouped coverage/invalid binding denial. Source-only PDFs generated; original five-bedroom output inspected. Final minor label fix rerun/hosted checks next.
- Migration staged, NOT applied. SHA 943d7b05ede488f7ddfa884896993b9b32de1e2cc16bd62e3dd8751639e91efa; rollback unchanged. Source provenance and builder limitation in lease-assets/README.md. Full clean unsigned master still required for final operational export; no production record writes.
- NEXT STEP: finish checks on pushed head, mark #85 ready, merge using expected SHA, verify exact-main CI/Pages and create next unused annotated tag. Then release claim and record activation blockers. Do not restart prior implementation.

#### Previous checkpoints (historical instructions superseded above)

### Current continuation — source-backed Page 8 (WIP)

- Owner **codex**, heartbeat **2026-11-17 07:26 UTC**, expires **2026-11-17 07:56 UTC**. PR #85 / `hp/lease-page8-editor`. **Do not merge or deploy.**
- Five requested completed references were accessed through the authorized Drive connector. All are 12-page packets with condition sheet at actual PDF page 8; do not use signature/completion packets as blank ten-page masters.
- Original old blank page 8 is vector text. Corrected only its displaced Bedroom 3 / Bedroom 4 Ceiling/Floor fields and cleared preselected satisfactory X, retaining all sections/signatures. New blank-only `lease-assets` contains no tenant records. The updated blank master still has a filled page 8 and signed/premarked page 7: clean unsigned master remains a final-export prerequisite.
- WIP `lease-template-profile.js` supplies source-measured positions and optional layouts, grouped observations, and replacement with the original blank Page 8. Engine group/baseline support added; UI and SQL integration/tests NOT complete. Existing 11 focused model/engine tests passed before these changes.
- Live migration list inspected read-only: lease preparation migration 20261116060547 is not applied. No production writes.
- NEXT STEP: integrate source layout/preview controls with existing controller, validate grouped bindings in the staged SQL, then run source-render and browser/database regressions. Asset builder/evidence still to document before acceptance.

### Current continuation — original lease source validation

- Owner **codex**, heartbeat **2026-11-17 07:11 UTC**, claim expires **2026-11-17 07:41 UTC**. Continuing existing `hp/lease-page8-editor` / PR #85 at 85c321d; previous hp claim expired. Clean working tree, current main e96beea; no competing updates found.
- Current user instruction explicitly requires **DO NOT MERGE OR DEPLOY**. This supersedes every older merge/release instruction below. No production records or schema changes during testing.
- Existing editor/persistence/original overlay implementation is preserved. Drive references are now accessible and downloaded outside Git; compare actual page indexes and structure before claiming visual fidelity.
- NEXT STEP: inspect the original page-8 samples and current template mapping engine; add a source-backed reusable mapping workflow or identify exact clean-template blockers, then run original-render comparisons and existing regression suites.
- This ownership-only checkpoint contains no runtime edits or private source documents.

#### Prior handoff (historical; merge instructions superseded)

### Handoff — lease generator / page 8 editor

- Owner **hp**, heartbeat **2026-11-16 07:42 UTC**, claim expires **2026-11-16 08:12 UTC**. Branch `hp/lease-page8-editor`, base latest main **e96beea6dbb7b3c18dd891bd5b164823b11e55cc**. New task OPS-LEASE-PAGE8; ownership-only checkpoint, [draft PR #85](https://github.com/huzshk0707/Oaktown-ops/pull/85), opened immediately after ownership push. User explicitly requests implementation **and merge**, overriding the pasted generic no-auto-merge instruction.
- Startup read latest main AGENTS/HANDOFF/TASKS/log -15, status/worktrees/fresh refs/open PRs/remote branches; no competing lease task claim. Existing release #84 completed at v0.5.2 (task branch final 19ec364); do not redo it. New branch from clean main; no leftovers.
- Inspection: five-page renewal generator uses sanitized master backgrounds; new-lease form is visit-only and page 8 is vector reconstruction, not verified exact original. Existing unit/lease portfolio and lease-reference catalog must be reused; no duplicate property/lease database. User specifies 3/4/5 bedrooms, editable labels/locations and independent multi-column placements; absent rooms N/A label with blank dependent fields supersedes old N/A-every-line behavior.
- Source blocker: supplied Drive folder redirects to Google sign-in over public HTTP. User says Drive access is granted; this execution's callable tools currently expose no Drive/search/download connector or desktop/browser session tool. Checking authorized available access only; do not borrow credentials or claim original matching from reconstructed PDFs. Need approved blank ten-page master and five completed examples for exact comparison. Continue editor/persistence/template-preserving infrastructure independently; never invent original coordinates/clauses or silently mark a template verified.
- Milestone: separate room identity/location/label/section/column/row model; explicit presets+Custom controls; blank N/A dependents; den in unused bedroom slot, independent master bathroom and collision/unplaced-room guards; no six-bedroom support. Legacy preview remains explicitly reconstructed draft; original engine still next. Existing account/unit clearing preserved. **20 model/PDF tests + 8/8 existing lease browser tests passed**, Node syntax and workflow inventory (30 families/66 scripts) passed.
- Milestone 2: original-PDF additive engine and fictional ten-page fixture implemented. **5/5 new PDF tests + 6/6 room tests passed**: page order/dimensions/original content streams preserved, exact source hash, blank-master/overlap/overflow/signature guards, final receipt and mapping coverage. Private native-session draft/review/approval RPC, immutable approval snapshots/receipts, unit/lease validation, CAS/retry and guarded rollback implemented. **Real disposable DB test passed** for native roles/sessions, owner isolation, linkage, concurrent saves, replay, approved condition-only reuse/redaction and zero task changes. No production apply.
- Milestone 3 WIP: strict Ready validation added server-side for facts/services, active placement collision/unplaced rooms, map bounds/signature rectangles and omission of entered observations. **Disposable SQL suite passes**, including new rejection cases. Original canvas/map editor and native saved draft/Ready/Approve/readback/final-download controller wired into existing form with shared state/auth; app/model/PDF engine syntax and inventory pass. Existing browser rerun **7/8 passed**, one horizontal-overflow failure in existing six-theme/mobile regression. No production change; not ready to merge.
- Milestone 4: real PDF.js rendering and complete mocked draft→Ready→Approve→readback→unsigned download flow pass. Lost-response immutable retry, pending input lock, sign-out clearing and Custom room controls covered. Pinned PDF.js 5.4.149 replaces incompatible 6.x API. Existing six-theme narrow regression repaired (download-button wrap): **12/12 combined lease browser checks passed**. Strict receipt metadata, approved template profiles and checkbox bindings added after that run; final rerun pending. No production schema apply.
- Milestone 5: 233/233 Node and 18/18 focused browsers passed at the prior implementation check, including saved reload, unit change, missing backend/revoked role/CAS/readback failure, all desktop widths/themes and ten-page rendered pixel preservation across five fictional variants. Advanced mapping hidden from routine profile use; renewal Prepare Lease entry added. Fictional screenshots/PDFs generated and inspected. Latest condition-history/strict map/actual-page-8 default changes are under final rerun; do not confuse earlier green count with that rerun.
- Final acceptance checkpoint: **233/233 Node**, **22/22 focused browsers**, syntax/inventory and disposable SQL pass. Explicit profile reuse/live preview/overflow, stale-load edit retention, late-save signout, condition-only history reuse and pending dynamic-input lock covered. Server rejects missing approval version, invalid fees, empty active observations, omitted service/occupant/label/location and both-page late charges. Full engine revalidates readiness on final export. Refreshed fictional desktop/PDF examples inspected. Migration SHA **910ec43cfbf9389aa1a5d15fb31494b5cdd9ca07b8e9b2a61493bb3c2080a60c**, rollback **cb162af9b21b8fa72aabb9319afa54d18d43c32ad51b913e02e6337d7d4e258c**; packet updated. Still staged, not live.
- Previous full CI at 09d10db passed 280/282 browsers; two Ready status checks exposed the live-preview callback overwriting the save status. Fixed by cancelling pending automatic previews and separating automatic PDF status from saved-review status; all 22 focused checks now pass. Hosted final rerun required for this checkpoint, not inferred from older CI.
- **NEXT STEP:** inspect `gh pr checks 85` for the newly pushed exact head; require all three jobs (including complete browsers/captures/SQL) green, then perform the user-authorized merge with that exact head. Verify merged-main CI and Pages at the same SHA, tag next unused v0.5.x, and release claim. Backend installation and real-source comparison remain the explicit OPS-LEASE-PAGE8.ACTIVATE follow-up; no live test records or unrelated merges.
- Remaining acceptance: original Drive files unavailable through current exposed tools despite user authorization. No guessed original map or claimed Leslie visual match. UI supports one-time advanced original mapping and approved profile reuse. Supabase management credentials/tool absent; native RPC actions fail visibly and cannot approve/export if backend is absent. Need authorized operator installation plus real-source map/visual review; do not invent either result.
- Test resources: own container hp-lease-page8-pg, network none, fictional oaktown_portfolio_ci; OAKTOWN_PSQL_BIN=/tmp/hp-lease-bin/psql. Server session 87513 serves current repo on 127.0.0.1:8765. Browser/Node tooling outside repo at /workspace/.cache/oaktown-tools; Playwright browser cache /workspace/.cache/ms-playwright. No user/private documents in Git.
