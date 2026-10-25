# Oaktown Ops v0.3 — Main release

Promotes the tested `preview-v03/` Oaktown Ops shell to the GitHub Pages root, preserving `preview-v02/` and `preview-v03/` for comparison and rollback.

## Included
- Familiar Oaktown Ops interface with notice generator, tenant message, and court follow-up navigation.
- Supabase Auth administrator sign-in and RLS-protected property lookup embedded **in the main shell**, rather than a separate standalone property login page.
- Dropdown loads imported properties from `public.properties` and notice addressees from `public.property_addressees`, then passes the chosen record to the embedded generator.
- Existing notice and USPS Firm Book rendering remains unchanged except the import handler.
- Single notice PDF and batch ZIP use local `vendor/` scripts and their accompanying licenses; no extra CDNs required.
- Previously published root v0.1 interface copied to `legacy.html`. Earlier previews remain available.
- Tests upgraded to include generator integration, static v0.3 checks, and browser PDF/ZIP downloads.

## Confirmations and caveats

- The 13 properties and their addressee names already live in Supabase. **No import or schema change** is part of this GitHub release.
- The Supabase frontend key is publishable by design; RLS controls access to records.
- The whole application **is not** protected by login: `generator.html` can be loaded directly without credentials, but it cannot retrieve protected property data by itself.
- Drafts and any imported notice content are saved in browser localStorage (shared across paths on the same origin); the old **Save Property** button saves locally, not to Supabase.
- The importer never auto-fills unverified landlord names. Verify landlord, tenancy, balance, dates, legal wording and service method before use.
- Do not use shared devices for personal tenant information. No data transmission of notices, certified mail acceptance or attorney filing is implied.
- Live authenticated Supabase flow and real-world PDF content require manual confirmation by the authorized admin.

## Rollback

The v0.2 workspace is available at `/preview-v02/` and the prior v0.1 prototype at `/legacy.html`. Reverting the v0.3 root files in Git restores the earlier public homepage without deleting any records in Supabase.
