# Oaktown Ops

**v0.3 — Oaktown Ops Notice Studio with Supabase property lookup.**

[Open Oaktown Ops](https://huzshk0707.github.io/Oaktown-ops/) · [Earlier v0.2 studio](https://huzshk0707.github.io/Oaktown-ops/preview-v02/) · [v0.3 release notes](docs/RELEASE-0.3.md)

## What is available

- Green Oaktown Ops workspace with seven-day notice creation, Tenant Message copy, and separate Court Follow-up prototype.
- Original reference-layout seven-day notice and USPS PS Form 3877 Firm Mailing Book previews, printing, single notice PDF downloads, and batch ZIP downloads.
- Administrator sign-in to Supabase and a selector for the **13** pilot properties already stored in the Supabase database (provided the signed-in account has approved staff membership).
- Select a property in the workspace and click **Load into Notice Studio** to create a new notice with its address and unverified notice addressee prefilled.
- JSON import/export and existing browser-local drafting tools in the embedded generator.

## Data and security limitations

**This is an early pilot, not a fully private tenant-management system.**
- Supabase property and addressee records are behind authenticated row-level-security policies. The public website includes only a publishable Supabase key, not a service-role secret.
- The document generator page is still directly available to anyone with the site URL, though it cannot fetch the protected property data without authorized credentials.
- Notice drafts are kept in **browser localStorage**, not Supabase; they persist on the current browser profile only and could be exposed to people who use that device.
- The older **Save current address to property database** button in the embedded generator saves to **localStorage**, not Supabase.
- Landlord names for the imported pilot records were not verified. Confirm the legal landlord, tenant, amounts, notice wording and legal applicability before printing or serving notices.
- Neither email delivery nor USPS submission nor court filings are automated.

## Repository layout

- `index.html`: current v0.3 Oaktown Ops workspace (GitHub Pages root).
- `generator.html`: embedded 7-day notices and USPS Firm Book generator.
- `styles.css`, `vendor/`: workspace styles and local PDF/ZIP libraries.
- `legacy.html`: preserved v0.1 manual court-follow-up prototype.
- `preview-v02/`: preserved v0.2 preview and vendored assets.
- `preview-v03/`: preserved v0.3 preview and initial isolated sign-in pilot.
- `docs/RELEASE-0.3.md`: release and verification notes.

## Testing

GitHub Actions runs Node integration tests and Chromium Playwright checks for single PDF and batch ZIP downloads. Live Supabase login and property imports require manual testing with an authorized account; no credentials are stored in the repository.

[Report an issue](https://github.com/huzshk0707/Oaktown-ops/issues/new?template=feedback.yml) — do **not** include tenant information in public issues.
