-- Disposable PostgreSQL CI only. Never run against a Supabase project.
\set ON_ERROR_STOP on
do $ci$
begin
  if current_database() <> 'oaktown_schema_ci' then
    raise exception 'This fixture requires the disposable oaktown_schema_ci database.';
  end if;
end $ci$;

create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable security invoker
set search_path = '' as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.staff_memberships (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('admin','editor','viewer')),
  is_active boolean not null default true
);
alter table public.staff_memberships enable row level security;
revoke all on public.staff_memberships from public, anon, authenticated;
grant select on public.staff_memberships to authenticated;
create policy staff_can_read_own_membership on public.staff_memberships
  for select to authenticated using (user_id=(select auth.uid()));

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  street_address text not null,
  unit text,
  city text not null,
  state text not null,
  postal_code text not null
);
alter table public.properties enable row level security;
revoke all on public.properties from public, anon, authenticated;
grant select on public.properties to authenticated;
create policy approved_staff_read_properties on public.properties
  for select to authenticated using (
    exists(select 1 from public.staff_memberships s
      where s.user_id=(select auth.uid()) and s.is_active)
  );
create function public.ops_touch_updated_at() returns trigger
language plpgsql security invoker set search_path='' as $fn$
begin new.updated_at=clock_timestamp(); return new; end $fn$;

-- Fictional role identities: editor, admin, viewer, inactive editor, unapproved.
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003'),
 ('00000000-0000-4000-8000-000000000004'),
 ('00000000-0000-4000-8000-000000000005');
insert into public.staff_memberships(user_id,role,is_active) values
 ('00000000-0000-4000-8000-000000000001','editor',true),
 ('00000000-0000-4000-8000-000000000002','admin',true),
 ('00000000-0000-4000-8000-000000000003','viewer',true),
 ('00000000-0000-4000-8000-000000000004','editor',false);
insert into public.properties(id,street_address,city,state,postal_code)
 values ('10000000-0000-4000-8000-000000000001','100 Fictional Lane','Example City','KY','00000');
