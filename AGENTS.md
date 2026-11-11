# Working on Oaktown Ops

## Current context

Start with `docs/ROADMAP.md` and `docs/TECHNICAL-AUDIT-2026-11-04.md`.
Historical discovery/release notes preserve past decisions; their module status,
record counts and deployment claims may be superseded. The repository is private.
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
