-- Oaktown Ops v0.5 Lead Copilot draft schema.
-- STAGED / NOT YET APPLIED TO LIVE SUPABASE.
-- Apply after the master property/unit migration is reconciled. These references
-- intentionally target public.properties (v0.4); switch/extend to units after the
-- portfolio's unit identifiers, populated inventory and listing contract are verified.
-- No personal transcripts, access credentials or ID images belong in GitHub.

begin;

-- Fail closed: this file is an integration draft, not a deployable migration.
-- Only the disposable CI database sets this test marker. Deployment requires a
-- separate reviewed migration after stable unit and listing IDs are reconciled.
do $ begin
  if current_setting('oaktown.staged_test_only', true) is distinct from 'isolated_ci' then
    raise exception 'STAGED ONLY: reconcile Portfolio Master and approve a replacement migration before deployment.';
  end if;
end $;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  primary_property_id uuid references public.properties(id) on delete restrict,
  full_name text check (full_name is null or char_length(full_name)<=160),
  source text not null default 'Other' check (source in ('Zillow','Trulia','Email','Phone','Other')),
  status text not null default 'new' check (status in ('new','screening','waiting','viewing','viewed','application','review','closed')),
  screening jsonb not null default '{}'::jsonb
    check (jsonb_typeof(screening)='object' and octet_length(screening::text)<=24000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_property_status_idx on public.leads(primary_property_id,status,updated_at desc);
create index if not exists leads_updated_idx on public.leads(updated_at desc);
create trigger leads_touch_updated before update on public.leads
  for each row execute function public.ops_touch_updated_at();

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction in ('tenant','leslie','internal')),
  body text not null check (length(btrim(body)) between 1 and 16000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists lead_messages_history_idx on public.lead_messages(lead_id,created_at desc);

create table if not exists public.lead_property_interests (
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete restrict,
  interest_status text not null default 'interested'
    check (interest_status in ('interested','viewing','applied','on_hold','declined','closed')),
  created_at timestamptz not null default now(),
  primary key (lead_id,property_id)
);
create index if not exists lead_property_interests_property_idx on public.lead_property_interests(property_id);

alter table public.leads enable row level security;
alter table public.lead_messages enable row level security;
alter table public.lead_property_interests enable row level security;

revoke all on public.leads,public.lead_messages,public.lead_property_interests from public,anon,authenticated;
grant select on public.leads to authenticated;
grant insert (primary_property_id,full_name,source,status,screening) on public.leads to authenticated;
grant update (primary_property_id,full_name,source,status,screening) on public.leads to authenticated;
grant select on public.lead_messages to authenticated;
grant insert (lead_id,direction,body) on public.lead_messages to authenticated;
grant select on public.lead_property_interests to authenticated;
grant insert (lead_id,property_id,interest_status) on public.lead_property_interests to authenticated;
grant update (interest_status) on public.lead_property_interests to authenticated;

-- A shared, staff-only lead workspace. Editors/admins can write; viewers may read.
create policy leads_select_staff on public.leads for select to authenticated using (
  exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active)
);
create policy leads_insert_editor on public.leads for insert to authenticated with check (
  created_by=(select auth.uid())
  and exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
);
create policy leads_update_editor on public.leads for update to authenticated using (
  exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
) with check (
  exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
);
create policy lead_messages_select_staff on public.lead_messages for select to authenticated using (
  exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active)
);
create policy lead_messages_insert_editor on public.lead_messages for insert to authenticated with check (
  created_by=(select auth.uid())
  and exists(select 1 from public.leads l where l.id=lead_id)
  and exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
);
create policy lead_interests_select_staff on public.lead_property_interests for select to authenticated using (
  exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active)
);
create policy lead_interests_insert_editor on public.lead_property_interests for insert to authenticated with check (
  exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
);
create policy lead_interests_update_editor on public.lead_property_interests for update to authenticated using (
  exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
) with check (
  exists(select 1 from public.staff_memberships s
    where s.user_id=(select auth.uid()) and s.is_active and s.role in ('admin','editor'))
);

comment on table public.leads is 'Staff-reviewed leasing prospect records; advisory-only prequalification. No auto-approval.';
comment on table public.lead_messages is 'Private chronological tenant/agent messages. Never store ID photos, access codes, medical or financial documents.';
comment on table public.lead_property_interests is 'One lead may consider several properties. Reconcile property_id to master unit IDs during portfolio migration.';

commit;
