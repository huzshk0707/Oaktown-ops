# v0.4 — Workflow organization and shared cloud account

Notices now contains Notice & mailing, Tenant message and Court follow-up. The court form is connected to the current notice rather than linking to the old prototype. Duplicating a notice clears its court history.

Properties is a shared directory outside the workflow. It includes the newer preview's batch import, searchable selection, and property/addressee editing. Imports preserve charges on linked notices.

One persistent account handles Supabase access across the app. Sessions refresh before expiry; sign-out removes saved auth. Drafts remain local until explicitly saved, and remain on the device after logout. Cloud batches are scoped to their owner and active admin/editor membership; property records remain shared according to existing staff policies.

The additive Supabase change adds atomic property saves, timestamp tracking, a notice_batches table with RLS, and version-checked batch saves. There is no destructive data migration. Schema reference: ../supabase/schema/ops_workspace_v04.sql.

Verification: SQL rollback tests passed for atomic property creation, draft creation/update, stale property/batch rejection, unauthorized reads/inserts and anonymous privileges. No test records persisted. GitHub Actions covers browser workflow and original document download behavior.

Known scope: leases/renewals, listings and maintenance are explicitly upcoming. Same-address multiunit records remain constrained by the existing database unique key. Cloud save/open is explicit, not background autosync. No sending, filing or reminder delivery is automated.

Supabase security advisor reports the pre-existing leaked-password protection setting is disabled; no new database security findings. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
