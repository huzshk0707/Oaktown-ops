# Controlled Master Backlog import — staged A2 implementation

Status: **review PR only**. This branch does not apply a production schema migration or import any workbook data.

## Existing decisions

- The private Master Backlog contains 37 active-sheet entries, including four completed and nine requiring verification. The actual workbook and any tenant/financial material are NOT committed to GitHub.
- W03 has ten verified child task codes, M12–M21. M01–M05 share the Accounting level but are not children of M06. W02 was merged into M06; M36 is historical and must not be recreated without evidence.
- Preserve OAK-002 and the completed eight-property notice batch unchanged.
- The application continues to read work levels from intake_details.work_level; no duplicate work_level column.
- New task_code and parent_task_id fields allow exact M/W/A codes and known parent-child links.
- The initial import creates general-operation tasks WITHOUT property/unit/lease/renewal links until each association is verified.
- Four historically completed entries have status completed and completion_summary. Unknown completion timestamps remain NULL; a source date-only completed_on is preserved as metadata, not converted to an invented instant.
- No recurrence engine, automatic notices/messages, payments, archival, or tenant outreach.

## Private JSON manifest format

A fictional example (NEVER paste real sensitive workbook material in GitHub):

    {
      "schema_version": "oaktown.master-backlog.v1",
      "batch_ref": "master-backlog-20991231",
      "entries": [
        {"task_code":"W03","task_title":"Fictional renewal workstream","status":"pending","priority":"normal","work_level":"Renewals","next_action":"Review fictional cases","source_ref":"Active Tasks!A10:L10"},
        {"task_code":"M12","task_title":"Fictional signature follow-up","status":"waiting","priority":"high","work_level":"Renewals","parent_code":"W03","waiting_on":"Fictional coordinator","needs_verification":true,"source_ref":"Active Tasks!A11:L11"},
        {"task_code":"M13","task_title":"Fictional historic task","status":"completed","priority":"normal","work_level":"Renewals","parent_code":"W03","completion_summary":"Reported complete by fictional source","source_ref":"Active Tasks!A12:L12"}
      ]
    }

Optional fields: parent_code, next_action, waiting_on, blocked_reason, completion_summary, completed_on (known date only), needs_verification boolean, original_status and original_priority.

Only 1–50 rows; unknown fields, property IDs, lease IDs, automatic due dates and unsupported statuses are rejected.

## Planned staff import workflow

1. Independently reconcile every manifest entry against the source workbook and existing Supabase task records. Confirm 37 codes, 4 completed, 9 needs-verification and 10 W03 children before approving the real manifest.
2. Reviewer merges the PR after CI checks and security review. Production database migration is a separate approval; code deployment DOES NOT apply the schema.
3. After schema deployment, staff editor opens Today → Master Backlog import, pastes private JSON, and clicks Preview. This is read-only. The preview returns a state-bound approval token and conflicts stop saving.
4. Editor reviews every displayed row, checks the approval box, then types the exact IMPORT batch reference. Only then is Save enabled.
5. The RPC validates all entries again, uses active editor/admin membership and a reviewed preview token, creates roots before children atomically, logs source-linked activity events and stores a private receipt.
6. Replaying an identical approved batch returns its original receipt. Source-key/code conflicts reject. The browser re-reads every saved task and matches receipt IDs, codes, statuses and parent links; a failed read-back never claims success or overwrites later staff edits.
7. Refresh Today to inspect task codes, linked levels, status and remaining blockers.

## Deployment and recovery safeguards

- The staged migration and matching rollback are `20261108050604_master_backlog_controlled_import.sql` in supabase/migrations and supabase/rollback. This unapplied version was generated with Supabase CLI 3.0.0 during review, replacing the original authoring timestamp. Applied historical migrations are unchanged. Both scripts use bounded lock/statement timeouts.
- Run only against disposable oaktown_portfolio_ci in GitHub CI. Never use live Supabase for PR tests.
- Reviewer must verify table privileges, RLS, active editor membership, private receipt ledger access, version checks and secure function search_path.
- Rollback refuses to drop columns if any task codes, parent links or import receipts exist. This is deliberate data-loss protection. Schema rollback does not replace a verified Auth/Drive/platform backup.
- Production migration and the exact 37-task production import are separate explicit approvals. This PR authorizes neither.
- Existing task editor, intake, archiving, reference library, EOD, notices and lease workflows remain available.

## PR #45 security review

- SQL NULL modes and NULL review flags fail closed. Missing version/entries and malformed field types or oversized values are rejected independently of browser validation.
- The exposed RPC runs as invoker. Its private definer implementation checks the authenticated identity and active editor/admin membership before accessing data. Both use an empty search_path. Anonymous execution and direct receipt-table access are revoked; the private receipt ledger also has RLS enabled without client policies.
- The preview token is an optimistic state fingerprint, not a bearer credential or proof that a person read the preview. Staff authorization and an explicit true review flag are required independently. Preview does not store an approval or write tasks, events or receipts.
- Parent-chain checks lock and follow current ancestors. Disposable tests cover competing updates and stale repeatable-read snapshots, as well as sequential cycles.
- The browser holds the approved manifest fixed during requests, exposes all supplied fields in row details, clears private drafts on account changes/sign-out and requires saved identities to match the receipt before confirming success.
- Today also consumes an already verified shared session at initialization. A deterministic delayed-script regression covers the saved-session startup race exposed by the full CI browser run; sign-out still clears protected records.
- CI tests the real migration, staff role matrix, NULL/malformed input rejection, read-only previews, duplicate replay, stale tokens, concurrency, refusal of rollback after import and clean rollback before import. Browser tests use mocked APIs; they do not establish live Supabase behavior or production backup recovery.
- Production schema rollout and the real workbook import remain pending separate approval. Existing project-wide Auth/advisor findings are outside this migration's scope.

Read-only production check on November 8: migration history still ends at
`20261104220620`; neither A2 migration version is applied. Existing security
advisor warnings remain for the guarded archive-delete definer RPC and
[disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Three private intake ledgers intentionally have RLS without client policies.
These baseline findings do not certify the live project as free of security issues.

## Separate daily Task Dashboard AI

That AI interprets Leslie messages/screenshots, matches saved task IDs, proposes updates, waits for user confirmation, saves through an authorized audit-capable interface, reads back, and confirms. It does NOT receive arbitrary database write authority from this import feature.
