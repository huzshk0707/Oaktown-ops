-- Disposable PostgreSQL CI only; never run against a Supabase project.
-- Minimal fictional pre-v0.4 dependency scaffold, not a dump of production.
\set ON_ERROR_STOP on
do $ci$
begin
 if current_database()<>'oaktown_portfolio_ci' then
  raise exception 'Requires disposable oaktown_portfolio_ci database.';
 end if;
end $ci$;

create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable security invoker
set search_path='' as $fn$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$fn$;
grant usage on schema auth,public to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.staff_memberships(
 user_id uuid primary key references auth.users(id),
 role text not null check(role in ('admin','editor','viewer')),
 is_active boolean not null default true
);
alter table public.staff_memberships enable row level security;
revoke all on public.staff_memberships from public,anon,authenticated;
grant select on public.staff_memberships to authenticated;
create policy staff_read_self on public.staff_memberships for select to authenticated
 using(user_id=(select auth.uid()));

create table public.properties(
 id uuid primary key default gen_random_uuid(),
 street_address text not null,
 unit text,
 city text not null,
 state text not null,
 postal_code text not null,
 landlord_entity text,
 verification_status text not null default 'unverified',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(street_address,city,state,postal_code)
);
create table public.property_addressees(
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null unique references public.properties(id),
 notice_addressee_text text not null,
 includes_all_occupants boolean not null default false,
 named_people text[] not null default '{}',
 verification_status text not null default 'unverified',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
do $policies$
declare tab text;
begin
 foreach tab in array array['properties','property_addressees'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select,insert,update on public.%I to authenticated',tab);
  execute format('create policy staff_read on public.%I for select to authenticated using(exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active))',tab);
  execute format('create policy staff_insert on public.%I for insert to authenticated with check(exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active and s.role in (''admin'',''editor'')))',tab);
  execute format('create policy staff_update on public.%I for update to authenticated using(exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active and s.role in (''admin'',''editor''))) with check(exists(select 1 from public.staff_memberships s where s.user_id=(select auth.uid()) and s.is_active and s.role in (''admin'',''editor'')))',tab);
 end loop;
end $policies$;

-- Apply the actual committed v0.4 functions, tables, triggers and policies.
\ir ../supabase/schema/ops_workspace_v04.sql

-- Fictional editor, administrator, viewer, inactive editor and unapproved account.
insert into auth.users(id)
 select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
insert into public.staff_memberships(user_id,role,is_active) values
 ('00000000-0000-4000-8000-000000000001','editor',true),
 ('00000000-0000-4000-8000-000000000002','admin',true),
 ('00000000-0000-4000-8000-000000000003','viewer',true),
 ('00000000-0000-4000-8000-000000000004','editor',false);
insert into public.properties(id,street_address,city,state,postal_code,landlord_entity)
 select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  (100+n)||' Fictional Lane','Example City','KY','00000','Fictional Owner '||n
 from generate_series(1,13)n;
insert into public.property_addressees(id,property_id,notice_addressee_text,includes_all_occupants)
 select ('11000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'Fictional Household '||n||' & All Occupants',true
 from generate_series(1,13)n;
insert into public.notice_batches(id,user_id,title,payload)
 values('12000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',
 'Fictional pre-migration batch','{"notices":[{"id":"fictional-notice","sourcePropertyId":"10000000-0000-4000-8000-000000000001","charges":[]}],"properties":[]}');

create schema ci;
-- Snapshot rows after v0.4 triggers have run, before either portfolio migration.
create table ci.baseline_properties as select id,to_jsonb(p) row_data from public.properties p;
create table ci.baseline_addressees as select id,to_jsonb(a) row_data from public.property_addressees a;
create table ci.baseline_batches as select id,to_jsonb(n) row_data from public.notice_batches n;
create table ci.baseline_staff as select user_id,to_jsonb(s) row_data from public.staff_memberships s;
