-- STAGED: deploy only with approved release; no production data mutations here.
begin;
create or replace function public.ops_task_update_v2(
 p_task uuid,p_expected_updated_at timestamptz,p_changes jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); old public.ops_tasks%rowtype; updated public.ops_tasks%rowtype;
 prop uuid; unt uuid; lease uuid; renew uuid; follow text; due text;
 allowed text[]:=array['status','priority','assigned_label','property_id','unit_id','lease_id','renewal_case_id','due_date','follow_up_date','next_action'];
begin
 if actor is null or not exists(select 1 from public.staff_memberships where user_id=actor and is_active and role in ('admin','editor')) then
  raise exception 'Active editor access required' using errcode='42501';
 end if;
 if p_task is null or p_expected_updated_at is null or p_changes is null or jsonb_typeof(p_changes)<>'object' or p_changes='{}'::jsonb
 or exists(select 1 from jsonb_object_keys(p_changes) k where not k=any(allowed)) then
  raise exception 'Invalid task edit keys or reviewed version' using errcode='22023';
 end if;
 select * into old from public.ops_tasks where id=p_task for update;
 if not found or old.archived_at is not null then raise exception 'Task unavailable or archived' using errcode='42501'; end if;
 if old.updated_at is distinct from p_expected_updated_at then raise exception 'Task changed. Refresh and review again.' using errcode='40001';end if;
 if p_changes ? 'status' and coalesce(p_changes->>'status','') not in ('pending','in_progress','waiting','blocked','completed','cancelled') then raise exception 'Unsupported task status' using errcode='22023';end if;
 if p_changes ? 'priority' and coalesce(p_changes->>'priority','') not in ('low','normal','high','urgent') then raise exception 'Unsupported task priority' using errcode='22023';end if;
 if length(coalesce(p_changes->>'assigned_label',''))>120 or length(coalesce(p_changes->>'next_action',''))>500 then raise exception 'Task text too long' using errcode='22023';end if;
 if p_changes ? 'due_date' and nullif(p_changes->>'due_date','') is not null then
   due:=p_changes->>'due_date';
   if due !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Use YYYY-MM-DD due date' using errcode='22023'; end if;
   perform due::date;
 end if;
 if p_changes ? 'follow_up_date' and nullif(p_changes->>'follow_up_date','') is not null then
   follow:=p_changes->>'follow_up_date';
   if follow !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Use YYYY-MM-DD follow-up date' using errcode='22023'; end if;
   perform follow::date;
 end if;
 prop:=case when p_changes ? 'property_id' then nullif(p_changes->>'property_id','')::uuid else old.property_id end;
 unt:=case when p_changes ? 'unit_id' then nullif(p_changes->>'unit_id','')::uuid else old.unit_id end;
 renew:=case when p_changes ? 'renewal_case_id' then nullif(p_changes->>'renewal_case_id','')::uuid else old.renewal_case_id end;
 lease:=case when p_changes ? 'lease_id' then nullif(p_changes->>'lease_id','')::uuid else nullif(old.intake_details->>'linked_lease_id','')::uuid end;
 if unt is not null and not exists(select 1 from public.units u where u.id=unt and (prop is null or u.property_id=prop)) then raise exception 'Unit not in selected property' using errcode='22023';end if;
 if unt is not null and prop is null then select property_id into prop from public.units where id=unt;end if;
 if lease is not null and not exists(select 1 from public.leases l join public.units u on u.id=l.unit_id where l.id=lease and (unt is null or unt=l.unit_id) and (prop is null or prop=u.property_id)) then raise exception 'Lease not in selected property / unit' using errcode='22023';end if;
 if lease is not null and unt is null then select l.unit_id,u.property_id into unt,prop from public.leases l join public.units u on u.id=l.unit_id where l.id=lease;end if;
 if renew is not null and not exists(select 1 from public.renewal_cases r where r.id=renew and (unt is null or r.unit_id is null or r.unit_id=unt) and (prop is null or r.property_id is null or r.property_id=prop)) then raise exception 'Renewal case is not linked to the selected property or unit' using errcode='22023';end if;
 if prop is not null and not exists(select 1 from public.properties where id=prop) then raise exception 'Property not found' using errcode='22023';end if;
 if prop is null and unt is null and renew is null and lease is null and old.tenancy_id is null and old.workflow_key<>'general' then raise exception 'A context is required' using errcode='22023';end if;
 update public.ops_tasks t set
 status=case when p_changes ? 'status' then p_changes->>'status' else t.status end,
 priority=case when p_changes ? 'priority' then p_changes->>'priority' else t.priority end,
 assigned_label=case when p_changes ? 'assigned_label' then nullif(btrim(p_changes->>'assigned_label'),'') else t.assigned_label end,
 property_id=prop,unit_id=unt,renewal_case_id=renew,
 intake_details=(case when p_changes ? 'due_date' then jsonb_set(t.intake_details,'{due}',case when nullif(p_changes->>'due_date','') is null then 'null'::jsonb else jsonb_build_object('date',due) end,true) else t.intake_details end)
  || (case when p_changes ? 'follow_up_date' then jsonb_build_object('follow_up',case when nullif(p_changes->>'follow_up_date','') is null then 'null'::jsonb else jsonb_build_object('date',follow) end) else '{}'::jsonb end)
  || (case when p_changes ? 'next_action' then jsonb_build_object('next_action',p_changes->>'next_action') else '{}'::jsonb end)
  || (case when p_changes ? 'lease_id' then jsonb_build_object('linked_lease_id',to_jsonb(lease)) else '{}'::jsonb end),
 completed_at=case when p_changes ? 'status' and p_changes->>'status'='completed' then clock_timestamp() when p_changes ? 'status' then null else t.completed_at end,
 updated_at=clock_timestamp()
 where t.id=p_task returning * into updated;
 insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
 values('task',p_task,'task_details_updated',actor,'Reviewed task details and links updated',jsonb_build_object('reviewed_version',p_expected_updated_at,'changed_fields',(select jsonb_agg(k) from jsonb_object_keys(p_changes) k),'before',jsonb_build_object('property_id',old.property_id,'unit_id',old.unit_id,'renewal_case_id',old.renewal_case_id,'status',old.status),'after',jsonb_build_object('property_id',updated.property_id,'unit_id',updated.unit_id,'renewal_case_id',updated.renewal_case_id,'status',updated.status)));
 return jsonb_build_object('task_id',updated.id,'updated_at',updated.updated_at,'status',updated.status,'property_id',updated.property_id,'unit_id',updated.unit_id,'renewal_case_id',updated.renewal_case_id,'intake_details',updated.intake_details);
end $$;
revoke all on function public.ops_task_update_v2(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.ops_task_update_v2(uuid,timestamptz,jsonb) to authenticated;
commit;
