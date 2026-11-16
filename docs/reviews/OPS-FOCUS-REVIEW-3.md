# OPS-FOCUS-REVIEW.3 — Phase 4 SOD and journal review

Independent review by **hp**, 2026-11-16; [PR #79](https://github.com/huzshk0707/Oaktown-ops/pull/79).
Target: draft #73 at `676e8961a6cb552f6916c655d966a8150f2c3ede`, based on
Phase 3 `536ebcade697e5c7aa59e76e7e65f3c89535cdb1`. App/schema/auth/data and
feature branches were not changed. All operational fixtures, sources and actors
used below are fictional. Previous reviews #76/#78 remain complete; their two P2
findings are carried forward rather than reimplemented. Ravi's Phase 6 #77 is
independent work and was not edited or taken over.

## Assessment and release boundaries

No additional implementation defect was established by the scoped checks. Two
**existing design limits** require a rollout decision; they must not be described
as stronger guarantees merely because UI tests pass:

1. **Generic journal approval is not server-attested native review.** Phase 4
   writes an authenticated editor/admin event with server actor/time, exact
   readback and immutable UUID retry identity. The generic journal does not
   validate the SOD envelope or enforce a separate native approval operation.
   A disposable probe confirms an editor can insert a malformed event using the
   reserved approval event name; attribution/access controls still apply. This
   is not an anonymous or viewer write bypass. The UI's intended review flow is
   a client workflow, and source-version preflight is not a transactional lock
   between task state and plan approval. Ravi's pending #77 is explicitly adding
   a stronger submission/review/receipt boundary; no activation or completion of
   that work is assumed here.
2. **Selected original source bodies become durable staff-journal data.**
   Accepted source content, sender/date/reference and review metadata are stored
   inside approved snapshots. Active-staff SELECT policy includes active viewer
   roles via the database API, even though browser sign-in currently allows only
   admin/editor. The probe confirms an active viewer reads the selected source
   body; inactive and anonymous access is blocked. The approval dialog discloses
   authorized-staff readership. Retention/deletion policy, approved audience and
   permitted source content still need an owner decision before real email
   evidence is persisted through this workflow. Browser-only drafts are not a
   secure resumable draft store and an exported JSON is another retained copy.

[Runnable disposable probe](probe-morning-journal.cjs) ·
[Observed boundary results](focus-phase-4/journal-boundaries.json).
These observations confirm documented architectural limits, not newly invented
production facts, current staff membership or proof that any live source was
saved. No real source content, credentials or live database operation was used.

## Architecture / acceptance matrix

| Area | Finding and observed behavior |
| --- | --- |
| Shared operations | Morning consumes OpsToday, not an independent task cache/client. It hosts the existing OpsSod editor by moving its DOM surface; there remains one SOD editor. Saved task ordering uses the existing Focus model, including >1,000 tasks. The prior offset-pagination finding remains inherited. |
| Manual intake | Explicit source kind/date and optional sender/timestamp/reference; unknown facts stay unknown. Text rules are deterministic suggestions, not ChatGPT/AI or mailbox synchronization. Embedded HTML/instructions are displayed as text. No email-reading or sending integration is fabricated. |
| Provenance | Reviewed source ID/revision, reported date, optional external reference and original body survive accepted plan citations. Saved task IDs/versions stay distinct from manual work; task-linked manual instructions retain both identities. Stable external-ID/content checks warn on duplicates. |
| Deposits | Submitted/received/pending/failed/reconciliation are explicitly reports. Verified credited lane remains Not connected; pasted text cannot select it or change a financial ledger. Classifying or approving a report is not verification of funds. |
| Task creation boundary | Accept for SOD changes the in-memory plan only. Creating an operational task hands a reviewed pending proposal to the existing Task Intake workflow, with its own context, confirmation and Save. Plan generation/approval/Start do not create or alter tasks. |
| SOD approval | Exact text/revision/work date/source snapshot is previewed and explicitly confirmed. UI locks while refreshing/checking/saving/verifying. Server stamps actor/time; independent GET must match the exact expected event. Lost/uncertain outcomes retain the same UUID and block blind new approval; primary-key replay cannot append a duplicate. |
| Authorization | Existing RLS rejects viewer/inactive/nonstaff/anonymous inserts and disallows normal authenticated update/delete. Role/attribution/append-only checks pass in actual PostgreSQL. No new permissions, service key, mailbox token or alternate auth path. Generic JSON/native-review limitation remains as described above. |
| Refresh/draft safety | Unsaved source wording and approved snapshots stay distinct. Changed/deleted/completed task sources mark the current draft stale; microsecond changes and Eastern work-date rollover are detected. Failed/incomplete reads retain drafts and disable approval/execution. Explicit restoration confirms before replacing a dirty draft. |
| Sessions and races | Account/date/history/interaction guards reject late callbacks. Sign-out/expired sessions clear private UI and source text. Canceled approval/task-intake/Start preparations cannot restore a prior session. Uncertain writes never claim rollback or silently issue a new event. |
| Start execution | Requires a current approved draft and current source versions in Phase 4; refreshes again before entry. It preserves approved wording and the existing Focus sort/actions. Only associated active saved IDs are marked; planning-only rows remain separate. Progress does not rewrite saved plan context. |
| History semantics | Phase 4 lists up to ten approvals for the current actor/current Eastern date and restores explicitly. This is the documented personal-history behavior, not the later Phase 5 shared daily dashboard's automatic latest-plan read. Do not undo Phase 5 by replaying this older UI. |
| Retention | Unapproved intake/drafts are visit-only, with unload warnings; approved selected evidence is durable in generic journal JSON. No app-specific retention or secure cross-reload unapproved-draft recovery is implemented. Decision needed before expanding real-data use. |

Immutable source references:
[manual sources/proposals](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/morning-model.js),
[approval and recovery](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/morning-center.js#L183-L233),
[Start/current-source check](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/morning-center.js#L234-L249),
[SOD draft/restore](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/sod.js),
[guarded journal test](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/tests/morning-journal-database.cjs),
[original scope and limitations](https://github.com/huzshk0707/Oaktown-ops/blob/676e8961a6cb552f6916c655d966a8150f2c3ede/docs/MORNING-COMMAND-CENTER.md).

## Independent validation

| Exact-head command | Outcome |
| --- | --- |
| `node --test tests/morning-model.test.cjs tests/sod-model.test.cjs` | **17 passed**, none failed/skipped |
| `playwright test tests/morning-center.e2e.spec.cjs --reporter=line --workers=1` | **19 passed**, including six-theme scoped axe, 1280/1440/1920 geometry, 1,007 tasks, source citations, denied/expired/late sessions, approval readback/replay, draft/restore, Task Intake and Focus transition |
| `PGDATABASE=oaktown_portfolio_ci OAKTOWN_PSQL_BIN=<own-disposable-wrapper> node tests/morning-journal-database.cjs` | Passed real PostgreSQL role/RLS, server attribution, append-only/duplicate-ID, exact readback and unchanged task-record assertions |
| `PGDATABASE=oaktown_portfolio_ci OAKTOWN_PSQL_BIN=<own-disposable-wrapper> node docs/reviews/probe-morning-journal.cjs <output-json>` | Confirmed staff-readable source body, rejected inactive/anonymous reads, accepted malformed approval JSON under authorized editor, and unchanged task records |

Node 24, Playwright 1.56.1, axe 4.10.2 and a network-isolated PostgreSQL 16 cluster
were used. The disposable CI schema fixture was already prepared from exact
Phase 3; `git diff 536ebca 676e896 -- supabase` is empty. The Phase 4 journal test
and probe each create/drop separate clones from `oaktown_portfolio_ci`; they do
not mutate the template or connect to live Supabase. The corresponding portable
CI setup is `.github/workflows/checks.yml` at the exact target hash. Source export
uses `git archive <full-sha>` into an empty directory.

The exact target's historical full CI is
[43779360227 — success](https://github.com/huzshk0707/Oaktown-ops/actions/runs/43779360227)
(reported 211 unit / 254 browser). It is separate from this independent focused
rerun; no claim is made that every historical suite was rerun locally here.

## Desktop evidence and reproduction

Run the exact export's `scripts/capture-morning-center.cjs` with its local server
on port 8765, pinned test tooling and `OAKTOWN_MORNING_CAPTURE_DIR=<output>`.
It uses existing fictional source/task/API fixtures, one explicitly approved
fictional plan and **zero operational task writes**. No new mobile screenshot,
gesture or component is added. Captures and machine-readable evidence are in
[focus-phase-4](focus-phase-4/); the acceptance source commit remains the exact
Phase 4 export, not a rebuilt app or a production staff session.

Final capture inventory and local review-only link/scope checks are recorded in
the PR running log after the capture process completes. The original immutable
feature captures remain in
[Phase 4 source evidence](https://github.com/huzshk0707/Oaktown-ops/tree/676e8961a6cb552f6916c655d966a8150f2c3ede/docs/ui-review/focus-board-phase-4).

## Disposition / exact next step

This review establishes no new P1/P2 implementation bug beyond the inherited
pagination and midnight-Defer findings from #76/#78. It confirms the two existing
journal-authority/source-retention release limits above. Keep all feature draft
restrictions. Phase 6 attestation work and production activation remain separate;
source availability, CI and a receipt do not prove a live installed ChatGPT link,
mailbox synchronization, bank clearance or physical human approval.

**NEXT STEP:** claim unowned **OPS-FOCUS-REVIEW.4** and consolidate #76, #78 and
#79 findings, exact-head test evidence, minimal correction tasks and owner
retention/approval/merge decisions into one review summary. Do not reimplement
Ravi's Phase 6 integration or merge/deploy feature drafts.
