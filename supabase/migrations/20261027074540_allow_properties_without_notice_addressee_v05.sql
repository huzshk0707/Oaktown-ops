-- Applied to existing Supabase Oaktown Ops project, 2026-10-27.
-- Schema only. No tenants or private records are committed.

create or replace function public.save_property(p_id uuid,p_expected_updated_at timestamptz,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.properties; recipient text; existing_recipient text;
begin
 if not exists(select 1 from public.staff_memberships where user_id=auth.uid() and is_active and role in ('admin','editor'))
 then raise exception 'Property editing is not approved.' using errcode='42501'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid property data.'; end if;
 recipient=coalesce(btrim(p_data->>'tenant'),'');
 if length(recipient)>500 then raise exception 'Notice addressee must be 500 characters or fewer.'; end if;
 if p_id is null then
  insert into public.properties(street_address,unit,city,state,postal_code,landlord_entity)
  values(btrim(p_data->>'street_address'),nullif(btrim(p_data->>'unit'),''),btrim(p_data->>'city'),upper(btrim(p_data->>'state')),btrim(p_data->>'postal_code'),nullif(btrim(p_data->>'landlord_entity'),''))
  returning * into saved;
 else
  update public.properties
  set street_address=btrim(p_data->>'street_address'),
   unit=nullif(btrim(p_data->>'unit'),''),
   city=btrim(p_data->>'city'),state=upper(btrim(p_data->>'state')),
   postal_code=btrim(p_data->>'postal_code'),
   landlord_entity=nullif(btrim(p_data->>'landlord_entity'),''),
   verification_status='unverified'
  where id=p_id and updated_at=p_expected_updated_at
  returning * into saved;
  if not found then raise exception 'This property changed elsewhere. Refresh the directory before saving.' using errcode='40001'; end if;
 end if;
 if recipient<>'' then
  insert into public.property_addressees(property_id,notice_addressee_text,includes_all_occupants)
  values(saved.id,recipient,recipient ~* '\mall occupants\M')
  on conflict(property_id) do update
   set notice_addressee_text=excluded.notice_addressee_text,
       includes_all_occupants=excluded.includes_all_occupants,
       named_people='{}',verification_status='unverified';
 end if;
 select notice_addressee_text into existing_recipient from public.property_addressees where property_id=saved.id;
 select * into saved from public.properties where id=saved.id;
 return jsonb_build_object('property',to_jsonb(saved),'notice_addressee_text',coalesce(existing_recipient,''));
end $$;
revoke all on function public.save_property(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.save_property(uuid,timestamptz,jsonb) to authenticated;
comment on function public.save_property(uuid,timestamptz,jsonb) is 'Allows editing verified/unverified portfolio properties without requiring a notice recipient; blank recipient preserves existing notice record.';
