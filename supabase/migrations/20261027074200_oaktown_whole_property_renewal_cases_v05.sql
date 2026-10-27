-- Applied to existing Supabase Oaktown Ops project, 2026-10-27.
-- Schema only. No tenants or private records are committed.

alter table public.renewal_cases
  add column if not exists property_id uuid references public.properties(id) on delete restrict;
create index if not exists renewal_cases_property_idx on public.renewal_cases(property_id);
alter table public.renewal_cases alter column unit_id drop not null;
alter table public.renewal_cases add constraint renewal_cases_property_or_unit_check
  check (property_id is not null or unit_id is not null);
comment on column public.renewal_cases.property_id is 'Parent asset for whole-property/land renewals. Unit may be null for property-level cases.';
