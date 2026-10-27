# Oaktown Ops

[Open the workspace](https://huzshk0707.github.io/Oaktown-ops/)

Oaktown Ops brings property records and operational workflows together. v0.4 keeps the green Ops design and groups notice creation, tenant messages and court follow-up inside one **Notices** workflow.

The v0.5 Lead Copilot is available for fictional test drafting only. Its lead cloud storage and real applicant screening remain disabled; see [the release boundary](docs/PR-6-REVIEW.md).

## Available now

- Notice & mailing: reference-layout seven-day notices, USPS Firm Book, PDF/ZIP downloads, JSON import/export.
- Tenant message: copy text from the selected notice.
- Court follow-up: authorization, attorney confirmation, dates, owner and notes attached to the selected notice, retained after refresh.
- Properties: search, select one or several, import into notices, add and edit records in Supabase.
- One shared account: persistent Supabase session with refresh; sign in at launch or use local drafts. No separate login for each workflow.
- Explicit **Save to Supabase** / **Open saved batch** for notices and their court records. Conflicting saves are rejected. Cloud batches belong to the signed-in user; properties are shared with approved staff.

Leases & renewals, listings and maintenance have navigation destinations marked upcoming. Their operational forms and task systems are not implemented yet.

## Working with data

Draft edits save in browser storage immediately. They reach Supabase only when you choose **Save to Supabase**. Property form saves write the property and addressee together. Opening a saved batch replaces the local batch after confirmation; export JSON first if needed.

Signing out disconnects cloud access but keeps local drafts on that browser. Use a trusted device. The static website and standalone generator remain publicly accessible; protected database records require approved staff membership and row-level security. Only a publishable key is in the client.

Existing address uniqueness excludes the unit field, so separate unit records at the same address cannot yet be added. Conflicting addresses produce an error rather than overwriting a property.

This software assists preparation and recordkeeping. Verify legal applicability, recipients, landlord identity, charges, dates and postal requirements before use. Messages, notices, filings and reminders are not sent automatically.

## Source and checks

All project development is kept in GitHub. Root files serve the current app; historical previews and legacy files remain available in the repository.

- `index.html`, `workspace.css`, `workspace.js`: navigation, account UI, property editing, court follow-up and cloud batch controls.
- `cloud.js`: shared Supabase session and API client.
- `generator.html`, `vendor/`: document layouts and local download tools.
- `supabase/schema/ops_workspace_v04.sql`: applied additive schema/RPC reference.
- `docs/RELEASE-0.4.md`: release scope and verification.
- `supabase/migrations/`: historical Portfolio Master migrations already applied; do not rerun them. See [database status and rollout blockers](docs/DATABASE-UPGRADE-V05.md).

GitHub Actions runs Node checks and Chromium tests for downloads, address search, shared sign-in, court persistence, property writes, batch restore and conflicting saves. Browser tests use fictional API mocks. Database regression tests use disposable PostgreSQL services with fictional fixtures; CI never applies migrations to live Supabase.

[Share feedback](https://github.com/huzshk0707/Oaktown-ops/issues/new?template=feedback.yml). Do not include tenant information in public issues.
