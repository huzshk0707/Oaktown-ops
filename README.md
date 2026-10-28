# Oaktown Ops

[Open the workspace](https://huzshk0707.github.io/Oaktown-ops/)

Oaktown Ops brings property records and operational workflows together. v0.6 retains the green Ops design and groups notice creation and tenant messages into a focused **two-step Notices** workflow. Court follow-up is deferred to a separate future add-on.

## Available now

- **Notices:** Search the full portfolio in the Notices tab, select one or more units, and click **Create drafts**. The existing notice editor opens editable drafts (including when recipients are still unknown); complete and verify each notice before download. Includes the reference-layout seven-day notice, USPS Firm Book, PDF/ZIP downloads, JSON import/export.
- Tenant message: shows the selected tenant's email only when an exact name match exists among people linked to that unit's lease/tenancy records, beside **Copy message**. Staff must verify imported emails before use; nothing is sent automatically.
- Court follow-up: not displayed in Notices. Previously saved court notes remain untouched inside existing batches for a future add-on.
- **Properties:** Browse 112 property/land groups and 124 units in the protected portfolio view. The original address-level editor remains under **Edit addresses & notice addressees** within Properties; the previous notice-loading controls are hidden.
- One shared account: persistent Supabase session with refresh; sign in from the staff access panel or use local drafts. No separate login for each workflow.
- Explicit **Save to cloud** / **Open cloud batch** for notices, retaining any previously saved court records. Conflicting saves are rejected. Cloud batches belong to the signed-in user; properties are shared with approved staff.

Leases & renewals retains its imported case/task browser and now includes a **Renewal Lease Generator** (property/unit and expiring-lease selection, suggested editable dates, rent/late fees, occupants/pets, utility and appliance choices, verified field review). After confirming the fields, staff can **download an unsigned five-page renewal lease PDF** from the sanitized document master. **The PDF is downloaded only—it is not saved to Supabase, signed, sent, or applied to the active lease.** Staff can separately select a renewal case to enter a one-line update (for example, “sent lease for signature”), verify or manually edit the suggested status, add an optional next action and notes, and save a dated update to the existing RLS-protected Supabase activity journal. Imported source status remains intact. See [renewal generator limitations and document QA](docs/RENEWAL-LEASE-GENERATOR.md). Listings and maintenance remain upcoming.

## Working with data

Draft edits save on this browser automatically and show **Saved locally**. They reach the shared cloud workspace only when staff select **Save to cloud**. Property form saves write the property and addressee together. Opening a saved cloud batch requires confirmation and offers a one-level **Undo opening batch** action. Export JSON for a durable independent backup.

Signing out disconnects cloud access but keeps local drafts on that browser. Use a trusted device. The static website and standalone generator remain publicly accessible; protected database records require approved staff membership and row-level security. Only a publishable key is in the client.

The relational `units` table supports multiple rentable spaces at one property address, while the older advanced property editor still edits address-level records. Notice drafts use **unit IDs** to avoid combining tenants from different units. Unknown notice addressees remain blank and cannot produce a valid final notice until completed.

This software assists preparation and recordkeeping. Verify legal applicability, recipients, landlord identity, charges, dates and postal requirements before use. Messages, notices, filings and reminders are not sent automatically.

## Source and checks

All project development is kept in GitHub. Root files serve the current app; historical previews and legacy files remain available in the repository.

- `index.html`, `workspace.css`, `workspace.js`: navigation, account UI, property editing, tenant-email display and cloud batch controls.
- `cloud.js`: shared Supabase session and API client.
- `renewal-generator.js`, `renewal-rules.js`, `renewal-pdf.js`, `renewal.css`, `renewal-assets/`: protected renewal UI, field calculations, five-page unsigned PDF renderer and sanitized master pages.
- `notice-picker.js` / `notice-picker.css`: signed-in property/unit search, multi-selection, and Create drafts action.
- `generator.html`, `vendor/`: document layouts and local download tools.
- `supabase/schema/ops_workspace_v04.sql`: applied additive schema/RPC reference.
- `docs/RELEASE-0.4.md`: release scope and verification.
- `supabase/migrations/`: historical Portfolio Master migrations already applied; do not rerun them. See [database status and rollout blockers](docs/DATABASE-UPGRADE-V05.md).

GitHub Actions runs Node checks and Chromium tests for downloads, address search, shared sign-in, legacy court-data preservation, tenant email privacy, property writes, batch restore and conflicting saves. Browser tests use fictional API mocks. Database regression tests use disposable PostgreSQL services with fictional fixtures; CI never applies migrations to live Supabase.

[Share non-sensitive technical feedback](https://github.com/huzshk0707/Oaktown-ops/issues/new?template=feedback.yml). Do not include tenant information in public issues.

## UX & security improvement review

Staff entry, SVG navigation, notice selection/copy, local vs cloud status, cloud-batch undo, account password reset, and a read-only RLS/security audit are documented in [the October 2026 review](docs/OPS-UX-SECURITY-REVIEW-2026-10-27.md). Notice PDFs and Renewal PDFs remain unchanged. Password reset requires the deployed app URL to be allowed in Supabase Auth Redirect URLs; confirm that setting before relying on staff self-service recovery.

## Notices follow-up patch — tenant emails and two-step UI

The Tenant message tab now displays a read-only tenant email from existing authenticated property/lease/contact records **only** when the notice has a clear unit link and the recipient name matches its tenancy-linked person. No email is guessed by street address, and an unclear/missing match shows a warning. Sign-out removes the email from the screen. Court follow-up controls and their third tab are removed, but the Notice Studio continues to preserve previously saved court objects when batches are opened or saved. No Supabase schema changes, email sending, or generated-document changes.


### Tenant name prefill for later-imported properties

The historical notice selector populated \`tenant\` from \`property_addressees.notice_addressee_text\` only. Newer Portfolio Master imports linked tenant names through \`tenancies\`, \`tenancy_people\`, and \`people\`, so many otherwise occupied units showed a blank tenant name. This is a **data-source mismatch**, not evidence the people records were absent. For an unaddressed unit, Notices now suggests names from one unambiguous current/ending-soon tenancy with tenant-role people linked by **unit UUID**. An older address-level addressee is still supported for a sole-unit property; no contact is copied between multiple units or from past-tenancy records. The user must check all imported identities before using any legal notice.

The **Correct landlord / sender name** and **Internal batch/reference (optional)** editor fields have been removed as requested, along with the unused reference CSV column. Previously stored sender/landlord values remain in the draft data and the original notice template still prints its existing sender identity and fixed PO Box. Historic reference values and court notes in old saved batches are not deleted. Mailing/Firm Book functionality remains unchanged. The statement section is unchanged pending separate instructions.
