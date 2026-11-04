# Working on Oaktown Ops

## Current context

Start with `docs/ROADMAP.md` and `docs/TECHNICAL-AUDIT-2026-11-04.md`.
Historical discovery/release notes preserve past decisions; their module status,
record counts and deployment claims may be superseded. The repository is private.
Repository visibility, website hosting and database access are separate controls.

## Architecture and working behavior

- Buildless HTML/CSS/JavaScript. `index.html` is the workspace; `generator.html`
  contains the existing notice/document studio. Keep the current UI and PDFs working.
- Keep pure rules/models separate from DOM code. Reuse existing currency/date rules.
- Respect the script order and existing `window.Ops*` interfaces when changing modules.
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
