# Phase 6 — scoped plans and release readiness

Review base: PR #75 / `712ec3d90f28652c686c3ad017906d70c3cd7248`.
Branch: `ravi/phase6-integration`; draft PR #77 targets Phase 5. This source
preparation does not merge existing PRs, activate clients, apply production SQL,
deploy an endpoint or write real operational records. Desktop only.

## Inspection before implementation

Read main's shared protocol and PR #75's architecture/controllers/models, existing
task API, OAuth migration, task connection UI and approval code. hp separately
owns Phase 1/2 review in #76; that work and its branch are untouched.

The existing task contract is `ops_task_agent(action,payload)`, using the caller's
verified OAuth JWT through the Edge Function, not a service key. Its custom
`oaktown_task_agent` role is NOINHERIT, has no task/journal table privileges and
can call only scoped functions. Each operation rechecks active editor/admin,
resource audience, nonanonymous session, live `auth.sessions`, unrevoked OAuth
consent and enabled client. Task writes also require `can_write`; proposals,
locked versions, idempotent receipts and independent readback already exist.

Native browser configuration accepts `authenticated` tokens with no `client_id`;
OAuth tokens cannot configure their own client. The existing `reviewed` task
flag/confirmation enforces a delegated write contract, not physical-human proof.

Phase 4/5 plan writes currently POST `morning_plan_approved_v1` JSON directly to
the staff journal. RLS and actor/time stamping establish who inserted it, but
neither the JSON nor Phase 5's display validator proves a separate review step.
The API cannot currently submit/read approved plans. Deposit and mailbox services
remain unconnected; they are outside this increment.

## Read-only live preflight — 2026-11-16 01:22 UTC

Aggregate/catalog reads only; no tenant/task/message rows or credentials fetched.

| Check | Observed |
| --- | --- |
| Task API Edge Function | ACTIVE, version 2; gateway JWT check off intentionally, own asymmetric JWT verification in source |
| Task RPC, token-hook function, custom role, journal | Present |
| Provider OAuth client records | 1; this alone does not establish an active ChatGPT connection |
| Registered / enabled / task-write-enabled task clients | 0 / 0 / 0 |
| Active OAuth consents | 0 |
| Stored task proposals / receipts | 0 / 0 |
| SOD journal approvals | 0 |
| Agent direct journal INSERT | Not granted |
| New plan-review RPC | Absent |

Function existence is not proof that the Auth hook is selected, OAuth settings
are enabled, the redirect matches ChatGPT's current callback, or installation is
complete. Those need operator-side verification and a real scoped sign-in.
No unapproved test task was created. Existing security advisors report the known
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [archive SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
warnings. Private RPC-only tables' no-policy notices are not a reason to grant
table access. This phase does not change those unrelated production controls.

The changelog URL returned HTTP 403. Current OAuth/token-hook/RLS/security docs
were consulted through the Supabase documentation connector. CLI 3.1.0 help was
checked; the new migration filename is CLI-generated, not invented.

## Proposed authorization contract

Keep the existing task RPC and its five tools intact. Add an explicitly enabled
plan capability per existing client, defaulting **off**, plus explicit per-user native plan consent. Existing task OAuth consent must not silently expand when an administrator enables a new domain capability. Task write permission
must not silently become plan submission/read permission.

1. **Agent proposal:** the scoped connection can read authorized attested plans
   and submit a bounded source-cited plan for staff review only. Its immutable
   request reference supports identical retries. It receives a pending receipt
   and a route to native Ops review, never an approval token or approved result.
2. **Native staff review:** a normal Supabase staff session, without OAuth
   `client_id`, opens the exact stored plan in the existing SOD approval dialog.
   The backend issues a short-lived review token bound to reviewer session,
   proposal and content. The staff member explicitly confirms that exact plan.
   The agent's token/role cannot invoke this approval path.
3. **Server commit:** validate envelope/source links and current task versions,
   recheck client/consent/staff permissions, lock the expected prior daily
   approval, then atomically append to the existing journal and save an immutable
   review receipt. Parallel replacement plans cannot silently supersede a newer
   approval; identical retries return the original receipt.
4. **Reserved journal boundary:** new SOD approval events require the matching
   private server review record. A direct INSERT with forged approved/reviewer/
   proof JSON fails even for an ordinary editor. Other journal events and task
   actions retain existing behavior. Old generic events are not retroactively
   certified or rewritten.
5. **Attested read:** dashboard and connector read an authorized function joining
   journal events to server review receipts. Format validation remains a display
   guard. Raw generic journal JSON is not a fallback approval authority. Missing
   migration/permissions produce a clear unavailable state.

The review ledger is request/receipt infrastructure in the existing private
agent schema, not another task database or alternative approved-SOD system.
The journal remains the saved SOD. No plan transition changes task records,
priorities, due/follow-up dates, notices, leases, deposits or external messages.

This can prove a server-authorized native-session review operation. It cannot
prove a biological human clicked or that message/payment claims are true.
Privileged database administrators remain trusted; ChatGPT must not use the
elevated SQL connector to bypass the scoped contract.

## Release and activation gates

- Stage migration/rollback and test only in disposable PostgreSQL. No production
  apply/deploy command is part of implementation. Confirm rollback preserves or
  refuses to delete review/audit history; do not destroy receipts to roll back.
- Recheck all exact heads and migration prerequisites in stacked order
  #70 → #71 → #72 → #73 → #75 → this PR. Preserve independent #76 review work.
  Approval of the review direction is not merge/deployment permission.
- Before activation, an operator confirms OAuth settings, existing hook
  composition, asymmetric signing and exact registered ChatGPT callback. No
  secrets in chat, Git, screenshots or public admin fields.
- Register the known client read-only first, complete a native consent and
  verify real read access. Add plan permissions and task-write capability only
  after their separate reviewed checks. Never auto-enable a discovered client.
- With an authorized disposable staff test identity and explicitly approved
  fictional record, test ChatGPT preview → user confirmation → task receipt →
  independent read → shared Ops refresh. Use a marked General-operations test
  task and an approved cleanup/archive plan; no real tenant/property task.
- Test plan submission → native review → server approval receipt → connector
  readback → dashboard refresh, including revocation, expired sessions, lost
  responses, replay, tampering and intervening task/plan changes. The connector
  must remain unable to approve its own plan or claim unverifiable success.

## Current implementation status

Backend foundation is implemented and tested in disposable PostgreSQL16: native/agent separation, reserved journal guard, explicit review, immutable receipt/readback, current task versions, daily-plan conflict and duplicate-retry protection, permission/session revocation, guarded rollback and zero task writes. The initial stale-source test correctly required rereading the fixture task version; the corrected suite passes. Per-user plan consent, UI/API wiring and final workflow/browser checks are still required. This checkpoint is not ready for production. Exact final validation/evidence will be recorded here and in draft PR #77.
