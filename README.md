# Oaktown Ops

[Open the workspace](https://huzshk0707.github.io/Oaktown-ops/)

Oaktown Ops brings property records and operational workflows together. v0.4 keeps the green Ops design and groups notice creation, tenant messages and court follow-up inside one **Notices** workflow.

## Available now

- **Notices:** Search the full portfolio in the Notices tab, select one or more units, and click **Make Notices**. The existing notice editor opens editable drafts (including when recipients are still unknown); complete and verify each notice before download. Includes the reference-layout seven-day notice, USPS Firm Book, PDF/ZIP downloads, JSON import/export.
- Tenant message: copy text from the selected notice.
- Court follow-up: authorization, attorney confirmation, dates, owner and notes attached to the selected notice, retained after refresh.
- **Properties:** Browse 112 property/land groups and 124 units in the protected portfolio view. The old duplicate directory and address editor are under a collapsed **Address management (advanced)** section; the previous notice-loading controls are hidden.
- One shared account: persistent Supabase session with refresh; sign in at launch or use local drafts. No separate login for each workflow.
- Explicit **Save to Supabase** / **Open saved batch** for notices and their court records. Conflicting saves are rejected. Cloud batches belong to the signed-in user; properties are shared with approved staff.

Leases & renewals retains its read-only imported case/task browser and now includes a **Renewal Lease Generator** (property/unit and expiring-lease selection, suggested editable dates, rent/late fees, occupants/pets, utility and appliance choices, verified field review). After confirming the fields, staff can **download an unsigned five-page renewal lease PDF** from the sanitized document master. **The PDF is not saved to Supabase, signed, sent, or applied to the active lease.** See [renewal generator limitations and document QA](docs/RENEWAL-LEASE-GENERATOR.md). Listings and maintenance remain upcoming.

## Working with data

Draft edits save in browser storage immediately. They reach Supabase only when you choose **Save to Supabase**. Property form saves write the property and addressee together. Opening a saved batch replaces the local batch after confirmation; export JSON first if needed.

Signing out disconnects cloud access but keeps local drafts on that browser. Use a trusted device. The static website and standalone generator remain publicly accessible; protected database records require approved staff membership and row-level security. Only a publishable key is in the client.

The relational `units` table supports multiple rentable spaces at one property address, while the older advanced property editor still edits address-level records. Notice drafts use **unit IDs** to avoid combining tenants from different units. Unknown notice addressees remain blank and cannot produce a valid final notice until completed.

This software assists preparation and recordkeeping. Verify legal applicability, recipients, landlord identity, charges, dates and postal requirements before use. Messages, notices, filings and reminders are not sent automatically.

## Source and checks

All project development is kept in GitHub. Root files serve the current app; historical previews and legacy files remain available in the repository.

- `index.html`, `workspace.css`, `workspace.js`: navigation, account UI, property editing, court follow-up and cloud batch controls.
- `cloud.js`: shared Supabase session and API client.
- `renewal-generator.js`, `renewal-rules.js`, `renewal-pdf.js`, `renewal.css`, `renewal-assets/`: protected renewal UI, field calculations, five-page unsigned PDF renderer and sanitized master pages.
- `notice-picker.js` / `notice-picker.css`: signed-in property/unit search, multi-selection, and Make Notices action.
- `generator.html`, `vendor/`: document layouts and local download tools.
- `supabase/schema/ops_workspace_v04.sql`: applied additive schema/RPC reference.
- `docs/RELEASE-0.4.md`: release scope and verification.
- `supabase/migrations/`: historical Portfolio Master migrations already applied; do not rerun them. See [database status and rollout blockers](docs/DATABASE-UPGRADE-V05.md).

GitHub Actions runs Node checks and Chromium tests for downloads, address search, shared sign-in, court persistence, property writes, batch restore and conflicting saves. Browser tests use fictional API mocks. Database regression tests use disposable PostgreSQL services with fictional fixtures; CI never applies migrations to live Supabase.

[Share feedback](https://github.com/huzshk0707/Oaktown-ops/issues/new?template=feedback.yml). Do not include tenant information in public issues.
