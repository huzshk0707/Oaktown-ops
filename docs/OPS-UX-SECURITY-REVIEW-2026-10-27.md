# Oaktown Ops UX and security review — October 27, 2026

This follow-up is a UI/accessibility and workflow clarity patch. It deliberately does **not** change the seven-day Notice PDF, USPS Firm Book, five-page Renewal Lease PDF master, renewal field mapping, Supabase production schema, or the actual sending/serving/signing state transitions.

## Staff-first workflow updates

- A signed-out user sees an in-page staff access introduction and a **Sign in to Oaktown Ops** button. The authenticated property search is concealed while signed out, but the local notice editor remains available for local drafts. Account sign-in can also be opened from the top bar.
- Notices has three clear stages: **1 · Select & draft notices**, **2 · Tenant message**, and **3 · Court follow-up (if needed)**. Property selection is part of stage one rather than an unnumbered prerequisite.
- Button terminology changes to **Create drafts**, **Save to cloud** and **Open cloud batch**. The only currently approved generator remains the **Kentucky 7-day rent notice**; no unsupported notice types or jurisdictions are exposed as valid options.
- Property editing and notice-addressee maintenance remain under the **Properties** tab, with clearer headings and user-facing wording. The authenticated normalized portfolio browser is still distinct from the legacy address-level editor because their data scopes differ.
- An explicit local/cloud status explains that browser drafts are **not automatically shared**. Cloud saves still require a user action and retain version-concurrency controls.
- Opening a saved cloud batch now creates a **one-level in-memory undo snapshot**. The operator must still explicitly confirm replacement; **Undo opening batch** restores the previous local draft, title, and cloud pointer. Closing the tab or reloading erases this transient undo; it is not a permanent server version history.
- A **Forgot your password?** link can send a Supabase password reset email. Implicit-flow recovery URLs with a one-time token are handled in memory, scrubbed from the browser address bar, and submitted as a password update. The recovery token is not saved with ordinary local session data. Password reset email redirect allow-list configuration in Supabase Auth must include the deployed Oaktown Ops URL.
- Sidebar Unicode glyphs are replaced by fixed SVG icons with \`aria-hidden\`; navigation focus rings and the brand accessible name are clarified.
- Staff-facing error and save copy avoid exposing backend names. The separate generated PDF code and operational statuses are preserved.

## Database/RLS security verification (read-only)

Examined the connected production Supabase project using read-only catalog queries and the security advisor. No schema changes or production data writes were performed.

- All **21 existing public base tables** returned **RLS enabled**.
- No **PUBLIC** or **anon** role table grants were returned from \`information_schema.role_table_grants\` for tables in \`public\`; the \`authenticated\` role has grants. This finding is table-grant scope only; it does not by itself prove every API endpoint/function is secure.
- Reviewed representative policies for \`staff_memberships\`, \`properties\`, \`property_addressees\`, \`units\`, \`people\`, \`leases\`, \`tenancy_people\`, \`renewal_cases\`, \`notice_batches\` and \`ops_events\`. Protected portfolio reads require active staff membership; protected edits require admin/editor membership. Notice batches are owner-bound by \`user_id = auth.uid()\`. The staff membership self-read policy is scoped to the requesting user's ID.
- No \`SECURITY DEFINER\` routines were found in \`public\`. This is a narrow check, not a complete function privilege/access audit.
- **Supabase security advisor warning:** Leaked Password Protection is currently disabled. This is a Supabase Auth dashboard setting; it was **not** automatically changed. Review the setting before broader staff rollout: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- A code review confirms the frontend uses a publishable key, not a service-role key. This does not replace penetration testing or network-level unauthorized-user testing.
- Do not place tenant names, rent balances, legal papers or signed lease PDFs into public GitHub Issues.

## Audit trail boundaries and next security work

- A downloaded notice is **not** necessarily delivered, served or filed. The existing Notices workflow stores court follow-up data with draft batches, but there is **no comprehensive server-side event history for each PDF generation or mailing/service act** in this patch. Avoid falsely representing downloads as legal service events.
- Renewal status updates remain explicit operator-confirmed \`ops_events\` records. Renewal PDFs remain download-only.
- Future audited workflows should separately record *generated*, *downloaded*, *sent*, *service confirmed*, and *filed* only with their own timestamp and responsible staff actor; proof of mailing or filing should require supporting confirmation.
- Recheck role authorizations and the password-recovery redirect allow list in a staging environment before opening access to additional users; also consider short session TTL and MFA for sensitive operations.
- The in-memory undo is limited to the most recently opened cloud batch; permanent multi-revision cloud history would require a separate approved schema/design.

## Regression checklist

Check local and cloud notice saves, importing multiple units at one street address, signature/Court workflow integrity, five-page Renewal PDF downloads, staff sign-in and password recovery, direct navigation between Properties/Notices/Renewals, and protected state clearing on sign-out. All automated browser tests use fictional tenants and properties.
