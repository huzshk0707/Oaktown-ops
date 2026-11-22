# ChatGPT task connection

This adds the Oaktown side of a scoped OAuth task plugin. It does not make an
ordinary ChatGPT Project acquire tools automatically. The user confirmed access
to **Custom MCP servers / Create plugins**; use that flow, rather than build a
new custom GPT around retiring Actions functionality.

## What it does

The task tools find saved tasks, read an exact record/history, prepare a proposal,
and save an approved proposal with independent read-back. The Morning tools
support the separate workflow below. For task changes, the sequence is:

**Find → Preview → User approval → Save → Audit → Read back → Verify.**

Create initially supports General operations tasks. Updates preserve property,
unit, tenancy, lease, renewal and parent/code identity; the plugin cannot change
those links. Allowed changes are title, status, priority, staff label, next action,
waiting/blocking detail, completion summary, work level and explicitly reported
date-only Eastern schedules. Clearing fields is explicit. There is no archive,
delete, SQL, outreach, payment, signing, legal-service or automatic-time tool.

An immutable request reference makes preview retries safe. A server-issued
proposal/token expires after 15 minutes. Save accepts only that stored proposal,
an affirmative boolean review and its exact confirmation. A stale version is
rejected. Retrying a saved proposal returns its original receipt without another
task/event. Actor and receipt time are server-derived. A failed or changed
read-back is reported as unverified; it is never silently overwritten.

The review flag and confirmation are a protocol requirement, not cryptographic
proof that a human read the preview. The bundled skill requires user approval
and the save tool carries write/destructive confirmation annotations. Keep the
host's write-confirmation settings enabled. Connection consent is separate from
approval of individual changes.

## Authentication and permissions

- Supabase's OAuth server handles sign-in, consent, authorization codes, PKCE
  and token rotation. The existing Oaktown staff session handles the consent UI.
- A registered OAuth client gets `oaktown_task_agent` through the custom access
  token hook. This NOLOGIN/NOINHERIT role has no table grants and cannot call
  existing intake/editor/archive APIs. The MCP server never reads a service-role
  key; it forwards the verified user's scoped token to the task RPC.
- JWT verification requires ES256/RS256, the project's exact issuer, the exact
  resource audience, a nonanonymous staff identity, role, client and session.
- Every scoped OAuth task call rechecks active editor/admin membership, the enabled client,
  live Auth session and unrevoked OAuth consent. Task preview and apply also
  require write permission. Disabling a
  client or revoking the OAuth grant blocks later calls. Private configuration,
  proposals and receipts have RLS and no client table access. Public functions
  are invoker wrappers around narrowly checked private implementations.
- Administrators manage client access in Tasks → Settings & connections → ChatGPT task connection.
  This configures a client; it does not prove a successful ChatGPT connection.

## Morning Priority Snapshot and SOD

1. Call `read_morning_priority_snapshot` with the Louisville/Eastern `work_date`
   and no cursor. Pass each `next_cursor` back with the same date. Stop after
   `has_more: false` and verify the number collected against `total_active`.
   Each page has at most 25 tasks and reports its starting `offset`. A task
   change between pages invalidates the cursor. Discard the earlier pages and
   restart when the service reports a changed snapshot.
2. Call `read_daily_plan` for the same date and keep the current `approval_id`,
   including null when the day has no approval. Draft Huzy's SOD for Leslie and
   show him the exact text and sources. Use **Good Morning Leslie,** and choose
   specific daily priorities plus relevant recurring responsibilities. Keep
   workers and vendors in their recorded assignment or dependency roles. Pick
   the maintenance items that matter to the shift.
3. On Huzy's request, submit the reviewed text with `submit_daily_plan`. Include
   the current `expected_approval_id` and use snapshot `task_id` and
   `updated_at` as each selected task's ID and `expected_updated_at`. Give the
   proposal a unique `request_ref` and reuse that reference and payload on retry.
   The response records a pending staff review.
4. Huzy opens **Morning → Plans awaiting staff review**, reviews the exact
   text and evidence, then approves in his native staff session. Call
   `get_plan_submission` for the same request and report approval only when
   `approved` and `verified` are both true. The tool independently checks the
   immutable journal event. Use `read_daily_plan` again to confirm the current
   daily head. Email delivery is a separate action.

The snapshot follows the Morning and Focus ordering of overdue, today, urgent,
then remaining work. The earliest recorded deadline or follow-up sets the
schedule. Categories can overlap and identify urgent, overdue, due today, high
priority with a saved next action and no dependency, scheduled follow-up, waiting
or blocked, and other active work. The result includes the approved task fields
for planning, including saved assignment labels, property/unit links, dates and
exact versions. Blank fields preserve unknown values. Archived and terminal tasks
are excluded. The snapshot reads current tasks relative to the requested date,
so a past date is not an historical reconstruction.

The snapshot works with task OAuth read access. Plan reads and submission use
separate administrator-enabled capabilities and Huzy's own native consent in
**Tasks → Settings & connections → ChatGPT task connection → Your daily-plan
access**. Choose at most 50 task and planning-only rows for a proposal. Source
notes remain available for native review, while the scoped plan read returns
references. Use the minimum reviewed information in the SOD text.

### Manual rollout after PR review

1. On project `wjdzaexhhjsjtdgxivyw`, check the migration catalog and compare the
   installed definitions of `ops_agent_private.morning_plan(text,jsonb)` and
   `ops_agent_private.run(text,jsonb)` with the PR's expected SQL. Record their
   owners, grants, and security settings. The snapshot migration uses PostgreSQL
   16 or later.
2. Apply the reviewed `20261122064143_morning_plan_personal_consent_alias.sql`
   and `20261122070313_morning_priority_snapshot.sql`, in that order, through the
   approved Supabase migration path. Record the actual registered versions.
   For a linked CLI push, check `supabase db push --linked --dry-run` first and
   proceed only if it lists these exact pending files. With a catalog mismatch,
   use the approved single-migration path for each file. An unexpected installed
   definition causes the corresponding migration to abort.
3. After both migrations are verified, deploy the reviewed `oaktown-task-api`
   Edge Function. Preserve the existing gateway JWT-verification setting and
   OAuth configuration. Check `/health` for version `1.2.0` and refresh tools
   in the connected ChatGPT host. Confirm `tools/list` includes the read-only,
   OAuth-scoped snapshot and the existing three plan tools.
4. Verify personal consent listing in native Oaktown, and use an authorized
   scoped OAuth session to read all snapshot pages and the daily head. Verify the
   complete proposal/review/readback loop with fictional data in a test project
   or separately authorized staff acceptance session.

If rollout is interrupted after the database step, the previously deployed Edge
Function can continue to use the existing task and plan actions. Recover a failed
Edge deployment by restoring the previous Edge release while investigating.
Disposable PostgreSQL and browser tests do not establish live ChatGPT consent or
production deployment.

## One-time activation

Server URL:

`https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp`

1. Confirm the deployment record below. The database migration and Edge Function
   are already deployed; do not reapply the migration. Gateway JWT verification
   is **off** because the function performs its own asymmetric JWT verification.
   Metadata/tool discovery is public; task operations require scoped OAuth.
2. In Supabase → Authentication → OAuth Server, enable OAuth and set the
   authorization path to `/` with Site URL
   `https://huzshk0707.github.io/Oaktown-ops/`. This serves the consent dialog at
   the existing signed-in workspace with `?authorization_id=...`. Confirm this
   Site URL also remains correct for password recovery links.
3. Check for an existing Custom Access Token Hook before changing settings.
   Configure `public.ops_task_agent_token_hook` as the hook, composing any
   existing hook deliberately rather than silently replacing it. Ordinary
   browser sessions are returned unchanged. Use an asymmetric signing key;
   legacy HS256 tokens are intentionally rejected by the task endpoint.
4. Create the ChatGPT custom MCP connection/plugin with the server URL. Use a
   predefined OAuth client in Supabase, with the **exact redirect URI displayed
   by ChatGPT**. Keep dynamic registration disabled for this initial internal
   setup. Enter its client ID/secret only in the secure ChatGPT connection form,
   never in chat, Git, the Oaktown client-access form or plugin manifests.
5. In Oaktown's administrator panel, register that public client ID and name.
   Start with read-only access, then enable reviewed task changes after the
   smoke checks below. Complete OAuth in ChatGPT and explicitly approve the
   Oaktown connection. Only known enabled clients are accepted by the consent UI.
6. Add the bundled `plugins/oaktown-ops/skills/task-dashboard/SKILL.md` to the
   plugin's instructions. The portable plugin manifest/MCP config are in the
   same folder; they contain no registered app IDs or secrets. Packaging source
   is not proof that a plugin has been registered/installed in ChatGPT.

Owner-only Supabase Auth settings and ChatGPT installation/sign-in cannot be
completed through the available repository/database tools. Report these as
pending until verified; do not claim direct in-chat writes are connected merely
because the code was merged or the endpoint deployed.

## ChatGPT custom plugin registration compatibility

The ChatGPT plugin creator can probe the MCP endpoint with HTTP
`Accept: */*` during registration. HTTP wildcards permit both supported
MCP response types, but the pinned MCP SDK initially returned **406** because
it requires literal `application/json` and `text/event-stream` strings.

The handler normalizes this wildcard/no-Accept case before handing the
request to the SDK. Explicitly incompatible types still receive 406.
This fixes transport negotiation only; the OAuth client ID/secret, consent,
asymmetric signing key, token hook and Oaktown client enablement are separate
requirements. Keep the plugin set to OAuth with the registered confidential
client and `client_secret_basic`; do not switch to No authentication.

Production investigation: function-edge logs showed repeated
`POST /functions/v1/oaktown-task-api/mcp` → **406** with
`Accept: */*`, followed by successful OAuth-resource metadata GET → **200**.
The developer must deploy the reviewed Edge Function change after PR merge;
merging source alone does not update the deployed function. After deployment,
retry ChatGPT registration. If it still fails, inspect the next server request,
status and OAuth discovery, rather than guessing credentials.

## Activation smoke checks

Use an approved staff test account and clearly labelled fictional test tasks.
Do not use the administrative SQL connector to impersonate a staff session.

1. Connect and retrieve a known task; confirm exact identity/version and that
   direct table/legacy RPC access is denied under the scoped token.
2. Preview a fictional create. Confirm no task was created before approval.
3. Approve, save and read back the exact receipt. Retry the same proposal and
   confirm one task/event. Then inspect Tasks → Settings & connections → recent ChatGPT saves.
4. Test a stale update, read-only client and revoked grant/client. Confirm denial,
   no overwritten record, and clear feedback when read-back fails.
5. Confirm normal staff sign-in, editing, notices, renewals and existing exports.

The staged Master Backlog migration/import remains separate. Missing A03/M/W
codes must be reported as missing; no task is inferred or imported automatically.

## Recovery and verification limits

Disable the OAuth client to revoke access without losing task history. The
matching rollback refuses to drop configured clients or proposal/receipt data.
Before an empty-schema rollback, disable the Auth hook in Supabase so sign-in
does not reference a removed function. Never discard receipts to force rollback.
Schema rollback tests do not establish a full platform/Auth backup restore.

CI uses fictional PostgreSQL sessions/consents, signed test JWTs, real MCP HTTP
transport, concurrent SQL sessions and mocked browser APIs. It does not establish
that owner Auth settings, live OAuth consent, ChatGPT host permissions, or an
actual user-approved in-chat write have been completed.

## Deployment record — November 8, 2026

- Supabase applied migration **20261108071838_authenticated_task_connection**.
  The source was created with CLI 3.0.0 under the earlier staging timestamp
  20261108061801; its filename now matches the provider's recorded applied
  version. The SQL body was unchanged. Applied migration history was not edited.
- `oaktown-task-api` is deployed and reported **ACTIVE**, version 1. Explicit
  SDK import-map entries support the hosted Edge bundler as well as local Deno.
- Read-only production checks found no direct table/legacy-intake permission
  for the task role and no public definer wrapper. Existing task count/content
  and event count were unchanged. Client/proposal ledgers were empty.
- The Master Backlog migration/import was not applied. Auth settings, signing
  keys, registered OAuth clients and real tasks were not changed by rollout.
- Local real Deno HTTP discovery/anonymous denial, signed JWT tests and the
  disposable database suite passed. Direct live HTTP checks were blocked by this
  execution environment's network policy; provider ACTIVE status is narrower
  evidence than a successful live OAuth flow.
- Owner OAuth/hook configuration and plugin installation/sign-in remain
  pending. No successful user-approved in-chat write is claimed.

Sources checked November 8, 2026:
[OpenAI plugin connection](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[OpenAI authentication](https://developers.openai.com/plugins/build/auth),
[Supabase OAuth setup](https://supabase.com/docs/guides/auth/oauth-server/getting-started),
[token security](https://supabase.com/docs/guides/auth/oauth-server/token-security),
[Auth hooks](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).
