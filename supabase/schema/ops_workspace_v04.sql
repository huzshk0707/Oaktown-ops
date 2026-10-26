-- Oaktown Ops v0.4: additive cloud workspace support.
create function public.ops_touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
revoke all on function public.ops_touch_updated_at() from public,anon;
create trigger ops_property_updated before update on public.properties for each row execute function public.ops_touch_updated_at();
create trigger ops_addressee_updated before update on public.property_addressees for each row execute function public.ops_touch_updated_at();
create function public.ops_addressee_touch_property() returns trigger language plpgsql security invoker set search_path='' as $$
begin update public.properties set updated_at=clock_timestamp() where id=new.property_id; return new; end $$;
revoke all on function public.ops_addressee_touch_property() from public,anon;
create trigger ops_addressee_parent_updated after insert or update on public.property_addressees for each row execute function public.ops_addressee_touch_property();

create function public.save_property(p_id uuid,p_expected_updated_at timestamptz,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.properties; recipient text;
begin
 if not exists(select 1 from public.staff_memberships where user_id=auth.uid() and is_active and role in ('admin','editor')) then raise exception 'Property editing is not approved.' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid property data.'; end if;
 recipient=btrim(p_data->>'tenant');
 if recipient is null or recipient='' or length(recipient)>500 then raise exception 'Enter a notice addressee (up to 500 characters).'; end if;
 if p_id is null then
  insert into public.properties(street_address,unit,city,state,postal_code,landlord_entity)
  values(btrim(p_data->>'street_address'),nullif(btrim(p_data->>'unit'),''),btrim(p_data->>'city'),upper(btrim(p_data->>'state')),btrim(p_data->>'postal_code'),nullif(btrim(p_data->>'landlord_entity'),''))
  returning * into saved;
 else
  update public.properties set street_address=btrim(p_data->>'street_address'),unit=nullif(btrim(p_data->>'unit'),''),city=btrim(p_data->>'city'),state=upper(btrim(p_data->>'state')),postal_code=btrim(p_data->>'postal_code'),landlord_entity=nullif(btrim(p_data->>'landlord_entity'),''),verification_status='unverified'
  where id=p_id and updated_at=p_expected_updated_at returning * into saved;
  if not found then raise exception 'This property changed elsewhere. Refresh the directory and reopen it before saving.' using errcode='40001'; end if;
 end if;
 insert into public.property_addressees(property_id,notice_addressee_text,includes_all_occupants)
 values(saved.id,recipient,recipient ~* '\mall occupants\M')
 on conflict(property_id) do update set notice_addressee_text=excluded.notice_addressee_text,includes_all_occupants=excluded.includes_all_occupants,named_people='{}',verification_status='unverified';
 select * into saved from public.properties where id=saved.id;
 return jsonb_build_object('property',to_jsonb(saved),'notice_addressee_text',recipient);
end $$;
revoke all on function public.save_property(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.save_property(uuid,timestamptz,jsonb) to authenticated;

create table public.notice_batches(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 120),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2000000),
 version bigint not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index notice_batches_user_updated on public.notice_batches(user_id,updated_at desc);
alter table public.notice_batches enable row level security;
revoke all on public.notice_batches from public,anon,authenticated;
grant select,insert on public.notice_batches to authenticated;
grant update(title,payload,version,updated_at) on public.notice_batches to authenticated;
create policy notice_batches_read on public.notice_batches for select to authenticated using(
 user_id=(select auth.uid()) and exists(select 1 from public.staff_memberships where user_id=(select auth.uid()) and is_active and role in ('admin','editor')));
create policy notice_batches_create on public.notice_batches for insert to authenticated with check(
 user_id=(select auth.uid()) and exists(select 1 from public.staff_memberships where user_id=(select auth.uid()) and is_active and role in ('admin','editor')));
create policy notice_batches_edit on public.notice_batches for update to authenticated using(
 user_id=(select auth.uid()) and exists(select 1 from public.staff_memberships where user_id=(select auth.uid()) and is_active and role in ('admin','editor'))) with check(
 user_id=(select auth.uid()) and exists(select 1 from public.staff_memberships where user_id=(select auth.uid()) and is_active and role in ('admin','editor')));
create function public.save_notice_batch(p_id uuid,p_expected_version bigint,p_title text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.notice_batches;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'notices') is distinct from 'array' or jsonb_typeof(p_payload->'properties') is distinct from 'array' then raise exception 'Invalid notice batch.'; end if;
 if jsonb_array_length(p_payload->'notices') not between 1 and 250 or jsonb_array_length(p_payload->'properties')>1000 then raise exception 'Notice batch is too large or empty.'; end if;
 if p_id is null then
  insert into public.notice_batches(title,payload) values(btrim(p_title),p_payload) returning * into saved;
 else
  update public.notice_batches set title=btrim(p_title),payload=p_payload,version=version+1,updated_at=clock_timestamp()
  where id=p_id and version=p_expected_version returning * into saved;
  if not found then raise exception 'This batch changed elsewhere. Open the latest saved batch before saving again; export local edits first.' using errcode='40001'; end if;
 end if;
 return jsonb_build_object('id',saved.id,'title',saved.title,'version',saved.version,'updated_at',saved.updated_at);
end $$;
revoke all on function public.save_notice_batch(uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.save_notice_batch(uuid,bigint,text,jsonb) to authenticated;
