-- Applied to connected Oaktown Supabase project on 2026-10-26.
-- Database migration ID: 20261026171822
-- This file contains schema only. No actual tenant/contact records.

-- Oaktown Ops portfolio data model, additive schema upgrade.
-- Existing public.properties IDs, notices, recipients and account records remain unchanged.
alter table public.properties
  add column if not exists portfolio_id text,
  add column if not exists asset_class text,
  add column if not exists portfolio_state text,
  add column if not exists portfolio_notes text,
  add column if not exists portfolio_verified_at timestamptz;
create unique index if not exists properties_portfolio_id_unique on public.properties(portfolio_id)
  where portfolio_id is not null;

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_code text unique,
  unit_label text not null check (length(btrim(unit_label)) > 0),
  unit_class text not null default 'residential',
  occupancy_status text not null default 'unknown',
  workflow_type text,
  managed_by text,
  verification_status text not null default 'unverified'
    check(verification_status in ('unverified','source_confirmed','user_confirmed','document_verified')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, property_id)
);
create unique index if not exists units_property_label_unique
  on public.units(property_id,lower(btrim(unit_label)));
create index if not exists units_property_idx on public.units(property_id);

create table if not exists public.property_aliases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  alias text not null check(length(btrim(alias))>0),
  source_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists property_alias_unique on public.property_aliases(property_id,lower(btrim(alias)));

create table if not exists public.unit_aliases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  alias text not null check(length(btrim(alias))>0),
  source_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists unit_alias_unique on public.unit_aliases(unit_id,lower(btrim(alias)));

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  source_person_key text unique,
  display_name text not null check(length(btrim(display_name))>0),
  email text,
  phone text,
  contact_verification text not null default 'unverified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists people_email_idx on public.people(lower(btrim(email))) where email is not null;

create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  tenancy_kind text not null default 'residential',
  status text not null default 'unknown',
  move_in_date date,
  move_out_date date,
  status_basis text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenancies_date_order check(move_in_date is null or move_out_date is null or move_out_date>=move_in_date),
  unique(id, unit_id)
);
create index if not exists tenancies_unit_idx on public.tenancies(unit_id);

create table if not exists public.tenancy_people (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  party_role text not null default 'tenant',
  from_date date,
  to_date date,
  created_at timestamptz not null default now(),
  unique(tenancy_id,person_id,party_role)
);
create index if not exists tenancy_people_person_idx on public.tenancy_people(person_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  tenancy_id uuid,
  source_lease_key text unique,
  lease_label text,
  contract_kind text not null default 'residential',
  lease_status text not null default 'unverified',
  source_status text,
  term_start date,
  term_end date,
  date_basis text,
  signature_status text not null default 'unverified',
  signed_document_ref text,
  turbo_tenant_status text not null default 'unverified',
  verification_status text not null default 'unverified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenancy_id,unit_id) references public.tenancies(id,unit_id) on delete restrict,
  constraint leases_term_order check(term_start is null or term_end is null or term_end>=term_start)
);
create index if not exists leases_unit_idx on public.leases(unit_id);
create index if not exists leases_tenancy_idx on public.leases(tenancy_id);
create index if not exists leases_term_end_idx on public.leases(term_end);

create table if not exists public.lease_signatures (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  person_id uuid references public.people(id) on delete restrict,
  signer_name text,
  signer_role text not null default 'tenant',
  signature_status text not null default 'not_confirmed',
  requested_at timestamptz,
  signed_at timestamptz,
  method text,
  evidence_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_person_or_name check(person_id is not null or nullif(btrim(signer_name),'') is not null)
);
create index if not exists lease_signatures_lease_idx on public.lease_signatures(lease_id);

create table if not exists public.rent_schedules (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  amount_usd numeric(12,2) not null check(amount_usd>=0),
  billing_period text not null default 'monthly',
  effective_from date,
  effective_to date,
  rent_kind text not null default 'contracted',
  verification_status text not null default 'unverified',
  approved_by text,
  source_reference text,
  turbo_tenant_applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_dates_order check(effective_from is null or effective_to is null or effective_to>=effective_from)
);
create index if not exists rent_schedules_lease_idx on public.rent_schedules(lease_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  source_booking_key text unique,
  booking_label text,
  guest_person_id uuid references public.people(id) on delete restrict,
  check_in date,
  check_out date,
  status text not null default 'unverified',
  source_status text,
  verification_status text not null default 'unverified',
  platform text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_dates_order check(check_in is null or check_out is null or check_out>=check_in)
);
create index if not exists bookings_unit_idx on public.bookings(unit_id);

create table if not exists public.renewal_cases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  tenancy_id uuid references public.tenancies(id) on delete restrict,
  lease_id uuid references public.leases(id) on delete restrict,
  oak_record_id text unique,
  category text,
  current_status text,
  action_status text not null default 'not_started',
  signature_status text,
  turbo_tenant_status text,
  fixed_offer_reference_usd numeric(12,2),
  m2m_offer_reference_usd numeric(12,2),
  date_basis text,
  next_action text,
  action_owner_label text,
  is_applicable boolean not null default true,
  notes text,
  verification_flags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fixed_offer_reference_usd is null or fixed_offer_reference_usd >= 0),
  check (m2m_offer_reference_usd is null or m2m_offer_reference_usd >= 0)
);
create index if not exists renewal_cases_unit_idx on public.renewal_cases(unit_id);
create index if not exists renewal_cases_status_idx on public.renewal_cases(action_status);

create table if not exists public.ops_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  tenancy_id uuid references public.tenancies(id) on delete restrict,
  renewal_case_id uuid references public.renewal_cases(id) on delete restrict,
  workflow_key text not null,
  task_title text not null check(length(btrim(task_title))>0),
  status text not null default 'pending',
  priority text not null default 'normal',
  assigned_user_id uuid references auth.users(id) on delete set null,
  assigned_label text,
  due_at timestamptz,
  completed_at timestamptz,
  evidence_ref text,
  notes text,
  source_task_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ops_task_context check(property_id is not null or unit_id is not null or tenancy_id is not null or renewal_case_id is not null)
);
create index if not exists ops_tasks_status_due_idx on public.ops_tasks(status,due_at);
create index if not exists ops_tasks_assignee_idx on public.ops_tasks(assigned_user_id);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  source_checksum text,
  status text not null default 'staged',
  imported_by uuid references auth.users(id) on delete set null,
  row_count integer check(row_count is null or row_count>=0),
  imported_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists import_batches_checksum_unique on public.import_batches(source_type,source_checksum) where source_checksum is not null;

create table if not exists public.source_links (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete restrict,
  source_sheet text not null,
  source_row integer not null check(source_row>=1),
  entity_type text not null,
  entity_id uuid not null,
  source_record_key text,
  reconciliation_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  unique(import_batch_id,source_sheet,source_row,entity_type,entity_id)
);
create index if not exists source_links_target_idx on public.source_links(entity_type,entity_id);

create table if not exists public.verification_issues (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  entity_type text,
  entity_id uuid,
  issue_type text not null,
  description text not null,
  status text not null default 'open',
  resolution_note text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_issues_status_idx on public.verification_issues(status);

create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  summary text,
  evidence_ref text,
  event_metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(event_metadata)='object')
);
create index if not exists ops_events_target_idx on public.ops_events(entity_type,entity_id,occurred_at desc);

-- Explicit grants + RLS: signed-in, active staff may read; editors/admin may insert/update.
-- No anonymous privileges and no client-side DELETE capability.
do $security$
declare t text;
begin
 foreach t in array array[
   'units','property_aliases','unit_aliases','people','tenancies','tenancy_people',
   'leases','lease_signatures','rent_schedules','bookings','renewal_cases','ops_tasks',
   'import_batches','source_links','verification_issues','ops_events'
 ] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from public, anon, authenticated',t);
   if t='ops_events' then
     execute format('grant select, insert on public.%I to authenticated',t);
   else
     execute format('grant select, insert, update on public.%I to authenticated',t);
   end if;
   execute format('create policy %I on public.%I for select to authenticated using (exists (select 1 from public.staff_memberships m where m.user_id = (select auth.uid()) and m.is_active))','ops_staff_read_'||t,t);
   execute format('create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.staff_memberships m where m.user_id = (select auth.uid()) and m.is_active and m.role in (''admin'',''editor'')))','ops_staff_create_'||t,t);
   if t<>'ops_events' then
     execute format('create policy %I on public.%I for update to authenticated using (exists (select 1 from public.staff_memberships m where m.user_id = (select auth.uid()) and m.is_active and m.role in (''admin'',''editor''))) with check (exists (select 1 from public.staff_memberships m where m.user_id = (select auth.uid()) and m.is_active and m.role in (''admin'',''editor'')))','ops_staff_update_'||t,t);
   end if;
 end loop;
end
$security$;

-- Reuse existing row timestamp helper for new mutable tables.
do $timestamps$
declare t text;
begin
 foreach t in array array[
   'units','people','tenancies','leases','lease_signatures','rent_schedules',
   'bookings','renewal_cases','ops_tasks','verification_issues'
 ] loop
   execute format('create trigger %I before update on public.%I for each row execute function public.ops_touch_updated_at()','ops_touch_'||t,t);
 end loop;
end
$timestamps$;

comment on table public.units is 'Rentable spaces and land lots. One property can contain many units.';
comment on table public.people is 'Private tenant/guest contact directory, unverified until corroborated.';
comment on table public.leases is 'Residential or other contract history; not an STR booking table.';
comment on table public.bookings is 'Short-term reservations stored separately from residential leases.';
comment on table public.rent_schedules is 'Contractual/historical rents, never automatically inferred from renewal offers.';
comment on table public.renewal_cases is 'OAK renewal tracker state and offer references, distinct from executed leases.';
comment on table public.source_links is 'Audit-friendly origin mapping for staged workbook imports.';
comment on table public.ops_events is 'Append-only staff event journal; automatic change auditing to be assessed separately.';
