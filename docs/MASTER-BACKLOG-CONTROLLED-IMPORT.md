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
6. Replaying an identical approved batch returns its original receipt. Source-key/code conflicts reject. The browser re-reads every saved task and verifies status/parent links; a failed read-back never claims success.
7. Refresh Today to inspect task codes, linked levels, status and remaining blockers.

## Deployment and recovery safeguards

- The migration and guarded rollback are in supabase/migrations and supabase/rollback. Review file/version with the official Supabase CLI before deployment (not available in authoring runtime).
- Run only against disposable oaktown_portfolio_ci in GitHub CI. Never use live Supabase for PR tests.
- Reviewer must verify table privileges, RLS, active editor membership, private receipt ledger access, version checks and secure function search_path.
- Rollback refuses to drop columns if any task codes, parent links or import receipts exist. This is deliberate data-loss protection. Schema rollback does not replace a verified Auth/Drive/platform backup.
- Production migration and the exact 37-task production import are separate explicit approvals. This PR authorizes neither.
- Existing task editor, intake, archiving, reference library, EOD, notices and lease workflows remain available.

## Separate daily Task Dashboard AI

That AI interprets Leslie messages/screenshots, matches saved task IDs, proposes updates, waits for user confirmation, saves through an authorized audit-capable interface, reads back, and confirms. It does NOT receive arbitrary database write authority from this import feature.
