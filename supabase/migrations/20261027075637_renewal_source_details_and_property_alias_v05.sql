-- Applied to existing Supabase Oaktown Ops project, 2026-10-27.
-- Schema only. No tenants or private records are committed.

alter table public.renewal_cases
  add column if not exists fixed_offer_raw text,
  add column if not exists m2m_offer_raw text,
  add column if not exists recorded_start date,
  add column if not exists recorded_end date,
  add column if not exists source_details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_details)='object');
comment on column public.renewal_cases.source_details is
  'Original Renewal Master row, including signature details, TurboTenant checks and Leslie meeting fields. Imported source data, not proof of verification.';
insert into public.property_aliases(property_id,alias,source_note)
select id,'The Lore','User confirmed: whole-property alias for 900 E Liberty St., not a separate unit.'
from public.properties where portfolio_id='PROP-0103'
on conflict do nothing;
