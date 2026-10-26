-- Applied to connected Oaktown Supabase project on 2026-10-26.
-- Database migration ID: 20261026171941
-- This file contains schema only. No actual tenant/contact records.

-- Oaktown Ops v0.5 performance follow-up: index every foreign-key lookup used by portfolio operations.
create index if not exists bookings_guest_person_idx on public.bookings(guest_person_id);
create index if not exists import_batches_imported_by_idx on public.import_batches(imported_by);
create index if not exists lease_signatures_person_idx on public.lease_signatures(person_id);
create index if not exists leases_tenancy_unit_idx on public.leases(tenancy_id,unit_id);
create index if not exists ops_events_actor_idx on public.ops_events(actor_id);
create index if not exists ops_tasks_property_idx on public.ops_tasks(property_id);
create index if not exists ops_tasks_renewal_case_idx on public.ops_tasks(renewal_case_id);
create index if not exists ops_tasks_tenancy_idx on public.ops_tasks(tenancy_id);
create index if not exists ops_tasks_unit_idx on public.ops_tasks(unit_id);
create index if not exists renewal_cases_lease_idx on public.renewal_cases(lease_id);
create index if not exists renewal_cases_tenancy_idx on public.renewal_cases(tenancy_id);
create index if not exists verification_issues_property_idx on public.verification_issues(property_id);
create index if not exists verification_issues_unit_idx on public.verification_issues(unit_id);
create index if not exists verification_issues_verified_by_idx on public.verification_issues(verified_by);
