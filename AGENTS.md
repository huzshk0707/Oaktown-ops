# Working on Oaktown Ops

## Shared AI handoff rules — ravi, hp and felix

These are permanent working rules for every AI account. The account names are
coordination labels, not GitHub credentials or operational staff identities.
Keep all existing project/security rules below. Current user instructions govern
scope, approval, draft-only work, merging and deployment.

1. **Start every session** by reading `AGENTS.md`, `HANDOFF.md`, `TASKS.md` and
   `git log -15`. Fetch current refs, inspect `git status --short --branch`,
   `git worktree list`, open PRs and remote branches. Continue the exact **NEXT
   STEP** in the active task's handoff; do not restart finished work. Use current
   GitHub state rather than assuming a dated status report is still current.
2. **One branch per task**, named `<account>/<short-task>` (for example
   `hp/source-review`). Open a **DRAFT PR immediately** after the first small
   checkpoint; include the owner, scope, base and precise next action. Split big
   tasks into numbered steps in `TASKS.md`. Existing branches keep their names.
3. **One account per branch.** The branch's `HANDOFF.md` and PR description record
   its owner and UTC heartbeat/claim expiry. Refresh the claim at each checkpoint,
   at least every 15–20 minutes, including while waiting on long checks. A claim
   lasts 30 minutes. Before editing, confirm the remote owner, unexpired claim and
   latest tip still match. Work on a separate task while another claim is active.
4. **Take over safely.** Explicit user reassignment, owner release, or an expired
   claim permits a takeover after checking recent PR/commit activity. Fetch and
   check out the latest branch in its existing clean worktree or a separate one.
   Run `git status`; inspect and commit recoverable leftover task changes FIRST,
   with a WIP note explaining unfinished files. Never blindly stage secrets,
   unrelated work or another active account's edits. Do not reset/clean/stash
   away unknown changes. Preserve existing branches and worktrees.
5. Publish an ownership-only checkpoint before implementation: record your account,
   UTC time, 30-minute expiry and exact NEXT STEP in `HANDOFF.md`, then commit and
   **normal-push** it and update the PR log. If the remote tip changed or the push
   is rejected, stop, fetch and reread ownership; never force-push or blindly
   rebase over a competing claim. The first accepted claim wins. A previous owner
   returning after expiry must reread the claim and stop if someone took over.
   This is a cooperative Git protocol, not a server-enforced security lock.
6. **Checkpoint continuously.** WIP commit and push about every 15–20 minutes
   (20 minutes maximum), after every meaningful step, and before long/risky work
   or ending a turn. Keep changes small; WIP commits may be incomplete. Add the
   handoff note in the same commit. Verify the remote branch contains the pushed
   commit. Do not leave completed or deliberately checkpointed work unpushed.
   A failed push is a visible blocker, never reported as saved remotely.
7. **Keep the PR description as a running log:** done / in progress / next
   checklist; owner and claim; key decisions; exact tests/commands and outcomes;
   latest pushed checkpoint; and the exact NEXT STEP, including file/command.
   Use `.github/PULL_REQUEST_TEMPLATE.md`. Update `HANDOFF.md` after every
   milestone, not just at the end; assume a quota cutoff can arrive at any time.
8. **Leave a recoverable state.** Never leave half-written files without a
   committed note identifying the file, stopping point, last stable commit and
   expected broken checks. Prefer complete small edits or a plan checkpoint
   before a large edit. Store durable review evidence in the repo/PR; links to
   one account's local `/workspace` alone cannot support another account.
9. **Preserve others' work.** Do not delete or rewrite another account's branches.
   Do not force-push, including `--force-with-lease`. Never amend already pushed
   commits; use a follow-up commit. Do not merge unrelated PRs, deploy, change
   credentials/permissions or execute operational actions merely to hand off.
10. **Finish explicitly.** Run the relevant tests, record exact results, update
    `TASKS.md` and `HANDOFF.md`, commit/push and mark the task PR ready when done.
    Preserve a user's explicit instruction to keep a particular PR draft.
    Ready is not merge approval. Release the claim and record the next bounded
    task or blocker. This setup's main push is authorized for handoff documents
    only; it does not authorize merging existing feature PRs.

### Where to resume

- `main`'s `HANDOFF.md` is the repository landing snapshot and `TASKS.md` is the
  priority index. Each active task branch owns its detailed handoff; live open
  PR descriptions are the shared registry of parallel work. Do not concurrently
  edit main's handoff from several task branches as though it were a global lock.
- An older branch may predate these files. Read the canonical shared rules with
  `git show origin/main:AGENTS.md`, `git show origin/main:HANDOFF.md` and
  `git show origin/main:TASKS.md`; then read that branch's PR/log and handoff if
  present. No unrelated merge into an existing review PR is required merely to
  read the protocol. For takeover, add its own checkpoint without renaming it.
- Handoff checklist: branch/base/PR; owner/expiry; last pushed commit; changed
  files and unfinished point; checks and exact commands; decisions and limits;
  **one exact NEXT STEP**. Never put private customer data, tokens or passwords
  in these notes. Other accounts need their own authorized GitHub/tool access.
- Only pushed commits and PR notes survive an account/environment loss. These
  instructions are not a background autosaver and cannot recover never-pushed
  edits. Frequent checkpoints bound that loss; do not promise zero-loss recovery.
- Ready-to-copy account starts: [hp](docs/ai-accounts/hp.md) and
  [felix](docs/ai-accounts/felix.md). Both follow this same protocol.

## Current context

Start with `docs/ROADMAP.md` and `docs/TECHNICAL-AUDIT-2026-11-04.md`.
Historical discovery/release notes preserve past decisions; their module status,
record counts and deployment claims may be superseded. GitHub reported the repository public at the November 15 audit.
Repository visibility, website hosting and database access are separate controls.

## Cross-chat Oaktown operating rules

For operations requested through ChatGPT, follow
`docs/CHATGPT-PROJECT-OPERATING-PROTOCOL.md`. A ChatGPT Project's shared
instructions do not grant OAuth or database permissions. Routine operational
task writes must use the scoped authenticated task API, not the elevated SQL
management connection. Attribute completed work to its actual performer,
and do not conflate Leslie's inspection with Huzy's personal EOD actions.

## Architecture and working behavior

- Buildless HTML/CSS/JavaScript. `index.html` is the workspace; `generator.html`
  contains the existing notice/document studio. Keep the current UI and PDFs working.
- Keep pure rules/models separate from DOM code. Reuse existing currency/date rules.
- Respect the script order and existing `window.Ops*` interfaces when changing modules.
- Consult `docs/WORKFLOW-STATES.md` and the source inventory for workflow changes.
  Keep the shared reviewed-write lifecycle for task/renewal writes separate from
  business statuses and navigation. Run `node scripts/workflow-states.cjs --check`
  when adding a first-party entrypoint script; map its state owner and tests.
- `cloud.js` owns the shared verified staff session; `portfolio.js` provides the
  protected property/unit/lease view. Do not create a second authentication path.
- Improve modules in small reviewed changes. A framework rewrite is not the current priority.
- New-lease page 8 is a fixed full template with N/A for confirmed absent areas.
  Unknown facts remain unknown. The complete ten-page exporter is still unfinished.
- Preserve document clauses/layout and original unit identity; never infer signatures,
  execution, approval, payment, legal service or a verified condition from a preview.

## Data and database changes

- Use fictional records in tests, screenshots and examples. Do not commit tenant
  documents, contact details, credentials, sessions or raw live responses, even here.
- Original lease references live in restricted Drive; Supabase indexes their references.
- Inspect current schema and aggregate-only diagnostics before proposing data fixes.
  Do not guess how to reconcile conflicting tenant/property relationships.
- Create migrations with the Supabase CLI. Treat already-applied versions as history.
  Check the specific new migration's status in the audit record before rollout.
- Test additive changes and their rollback in disposable PostgreSQL. Record current
  preflight results, expected effect and recovery steps before a production change.
- RLS and existing active-staff membership checks remain required. Keep privileged
  credentials out of the browser. Do not grant direct access to private intake ledgers.
- A schema rollback test is not evidence of a full database/Drive/Auth backup restore.

## Verification and handoff

- Fresh checkouts first install the pinned connector packages with
  `npm ci --no-fund --no-audit --prefix supabase/functions/oaktown-task-api`.
- Unit checks: `node --test tests/*.test.cjs`.
- Browser checks: the Playwright version and commands in `.github/workflows/checks.yml`.
  Use mocked APIs/fictional inputs; do not use a real staff session for test fixtures.
- SQL checks: replay the workflow's SQL chain only in `oaktown_portfolio_ci`.
  The database guards in test files are intentional; never remove them to run on live data.
- For document changes, inspect rendered output, page count, field fit and signature
  areas. Test the relevant unit counts and all six themes for UI changes.
- Report implemented, staged, applied, deployed and verified separately. Record
  remaining gaps and the next bounded task in the canonical roadmap/audit notes.
- Follow the user's current authorization. These instructions do not add a new
  approval requirement or override their preferences.

## Release tags and branch cleanup

- Follow `docs/RELEASE-PROCESS.md`. Release tagging starts at `v0.5.0`, the exact
  requested baseline `b829f73422ba87f0a7fc3a0ec60d21e45c7441c0`.
- After a release is merged, verify CI and Pages for that exact main commit,
  create the next unused annotated SemVer tag, push it and independently verify
  its remote peeled commit. Default to a patch increment within the current line.
  Record the release scope, checks and remaining limits in the annotation.
- Existing release tags are immutable: never move, overwrite or delete one.
- Delete a feature branch only when its current tip is merged, it has no open PR,
  and the deletion is guarded by that exact expected SHA. Preserve unmerged,
  protected/default and historical release branches. Keep `design/*` references
  while tracked documentation still cites them; check URL-encoded citations too.
- A source tag does not apply database migrations or establish actual tenant,
  payment, signature, sending or live staff verification state.

## Current desktop direction

New Ops UI work is desktop only: optimize 1440/1920px and retain usability near
1280px. Preserve existing responsive/security regressions; do not add mobile
components, gestures, screenshots or test suites without an explicit request.
Focus Board PRs #70–#73 remain draft review work; do not merge or deploy them
as a consequence of installing these handoff rules.
