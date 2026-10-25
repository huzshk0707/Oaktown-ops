# Oaktown Ops v0.3 private Supabase pilot

This is an **isolated, not-yet-production** pilot at `private-pilot.html`. The existing v0.2.2 Notice Studio is not replaced.

## Scope
- One verified administrator email: `huzaifashaikhmaths@gmail.com`
- Supabase project `oaktown-ops`; publishable key only in frontend
- Supabase Auth password sign-in; optional email link if configured
- Query the `staff_memberships`, `properties`, and `property_addressees` tables using the signed-in user's JWT
- Display property and addressee details only after authorization
- Explicit user-confirmed handoff creates a **new browser-local notice** in the existing generator; it does not overwrite an existing notice, store ledger data in Supabase, or send a notice

## Security
- Database RLS policies restrict access to active staff members; currently only one admin is approved.
- The public GitHub repository and GitHub Pages host must never contain a service-role or secret key.
- A publishable key is expected in public browser code. Data security depends on RLS and authorization, not obscurity.
- Sessions are stored in **sessionStorage** for this pilot; signing out clears the browser session.
- The existing generator uses **localStorage** for notice content; do not use shared/public computers and clear browser site data if needed.
- Notice generator itself is **not login-gated**. Do not claim the full website is private. Do not deploy real tenant content as static source.
- Real names are in Supabase only, not hardcoded in this repository.
- The landlord/entity for each of the 13 records is NULL. The pilot deliberately passes an empty owner field to the notice generator, requiring manual confirmation before document generation.
- Tenant/occupancy verification and actual ledger amounts are outside this pilot.

## Manual verification checklist
1. Sign in with the approved account; confirm the property list loads with 13 entries.
2. Sign out and reload; verify no property or tenant names are displayed.
3. Try a wrong password; verify no data loads.
4. Test another authenticated account; confirm no rows can be read via RLS.
5. Select one property and verify the street, ZIP and notice addressee against Supabase.
6. Click handoff, confirm new notice is created with tenant and address, **blank owner and blank charges**.
7. Check existing PDF and ZIP functionality remains unchanged.
8. Validate Supabase Auth email link redirect allowlist before relying on email sign-in.
9. Verify the public main site and preview-v02 remain unchanged.

## Limitations
This is a pilot and not a finished access-controlled application. A future milestone should gate the entire UI behind login, use a proper Supabase Auth client for refresh/PKCE handling, eliminate or encrypt sensitive browser-local notice persistence, and automate authorization/negative tests. Do not treat this as ready for live eviction notices.
