-- Today dashboard task editing, STAGED ONLY until full CI and deployment review.
-- No existing task data is migrated or rewritten.
begin;
alter table public.ops_tasks add column if not exists lease_id uuid references public.leases(id) on delete restrict;

create or replace function public.ops_task_update_v1(
 p_task uuid,
 p_expected_updated_at timestamptz,
 p_changes jsonb
) returns jsonb
language plpgsql security invoker set search_path='' as $body$
declare
 actor uuid:=auth.uid();
 old_row public.ops_tasks%rowtype;
 new_row public.ops_tasks%rowtype;
 keys text[]:=array['property_id','unit_id','lease_id','renewal_case_id','status','priority','assigned_label','due_date','follow_up_date','next_action','notes'];
 k text;
 property uuid; unit uuid; lease uuid; renewal uuid;
 task_status text; task_priority text; assignee text; action_text text; new_notes text;
 due_text text; follow_text text; due_day date; follow_day date;
 details jsonb; unit_property uuid; lease_unit uuid;
 renewal_unit uuid; renewal_property uuid; renewal_lease uuid;
begin
 if actor is null or not exists(
   select 1 from public.staff_memberships m
   where m.user_id=actor and m.is_active and m.role in ('admin','editor')
 ) then raise exception 'Active editor access required' using errcode='42501';end if;
 if p_task is null or p_expected_updated_at is null or p_changes is null or jsonb_typeof(p_changes)<>'object'
 then raise exception 'Task ID, reviewed version and full edit object required' using errcode='22023';end if;
 for k in select jsonb_object_keys(p_changes) loop
  if not(k=any(keys)) then raise exception 'Unsupported field: %',k using errcode='22023';end if;
 end loop;
 foreach k in array keys loop
  if not(p_changes ? k) then raise exception 'Missing reviewed field %',k using errcode='22023';end if;
  if jsonb_typeof(p_changes->k) not in ('string','null') then
   raise exception 'Expected text or null for %',k using errcode='22023';
  end if;
 end loop;
 select * into old_row from public.ops_tasks t where t.id=p_task for update;
 if not found or old_row.archived_at is not null then raise exception 'Task missing or archived; restore before editing' using errcode='22023';end if;
 if old_row.updated_at is distinct from p_expected_updated_at then
  raise exception 'Task changed since review. Refresh to avoid overwriting another update.' using errcode='40001';
 end if;
 begin
  property:=nullif(p_changes->>'property_id','')::uuid;
  unit:=nullif(p_changes->>'unit_id','')::uuid;
  lease:=nullif(p_changes->>'lease_id','')::uuid;
  renewal:=nullif(p_changes->>'renewal_case_id','')::uuid;
 exception when invalid_text_representation then
  raise exception 'Invalid property, unit, lease or renewal ID' using errcode='22023';
 end;
 if unit is not null then
  select u.property_id into unit_property from public.units u where u.id=unit;
  if not found or property is distinct from unit_property then
   raise exception 'Unit does not belong to chosen property' using errcode='22023';end if;
 end if;
 if property is not null and not exists(select 1 from public.properties p where p.id=property) then
  raise exception 'Selected property does not exist' using errcode='22023';end if;
 if lease is not null then
  select l.unit_id into lease_unit from public.leases l where l.id=lease;
  if not found or unit is distinct from lease_unit then
   raise exception 'Lease does not belong to selected unit' using errcode='22023';end if;
 end if;
 if renewal is not null then
  select r.unit_id,r.property_id,r.lease_id into renewal_unit,renewal_property,renewal_lease
   from public.renewal_cases r where r.id=renewal;
  if not found or (renewal_unit is not null and unit is distinct from renewal_unit)
   or (renewal_property is not null and property is distinct from renewal_property)
   or (renewal_lease is not null and lease is not null and lease is distinct from renewal_lease) then
   raise exception 'Renewal does not match selected property, unit or lease' using errcode='22023';end if;
 end if;
 task_status:=nullif(btrim(p_changes->>'status'),'');
 task_priority:=nullif(btrim(p_changes->>'priority'),'');
 if task_status is null or task_status not in ('pending','in_progress','waiting','blocked','completed','cancelled')
  or task_priority is null or task_priority not in ('low','normal','high','urgent')
 then raise exception 'Unsupported task status or priority' using errcode='22023';end if;
 assignee:=nullif(btrim(p_changes->>'assigned_label'),'');
 action_text:=nullif(btrim(p_changes->>'next_action'),'');
 new_notes:=nullif(btrim(p_changes->>'notes'),'');
 if length(coalesce(assignee,''))>120 or length(coalesce(action_text,''))>1000 or length(coalesce(new_notes,''))>2500
 then raise exception 'Assignee, action or notes exceeds maximum length' using errcode='22023';end if;
 due_text:=nullif(p_changes->>'due_date','');
 follow_text:=nullif(p_changes->>'follow_up_date','');
 if due_text is not null then
  if due_text!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Due date must be YYYY-MM-DD' using errcode='22023';end if;
  begin due_day:=due_text::date;exception when datetime_field_overflow then raise exception 'Invalid due date' using errcode='22023';end;
 end if;
 if follow_text is not null then
  if follow_text!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Follow-up date must be YYYY-MM-DD' using errcode='22023';end if;
  begin follow_day:=follow_text::date;exception when datetime_field_overflow then raise exception 'Invalid follow-up date' using errcode='22023';end;
 end if;
 details:=coalesce(old_row.intake_details,'{}'::jsonb)-'due'-'follow_up';
 if due_day is not null then details:=jsonb_set(details,'{due}',jsonb_build_object('date',due_text,'time',null,'timezone','America/New_York','original_text','Set by staff in Today'));end if;
 if follow_day is not null then details:=jsonb_set(details,'{follow_up}',jsonb_build_object('date',follow_text,'time',null,'timezone','America/New_York','original_text','Set by staff in Today'));end if;
 if action_text is null then details:=details-'next_action';
 else details:=jsonb_set(details,'{next_action}',to_jsonb(action_text));end if;
 update public.ops_tasks t set
  property_id=property,unit_id=unit,lease_id=lease,renewal_case_id=renewal,
  tenancy_id=case when unit is distinct from old_row.unit_id then null else old_row.tenancy_id end,
  workflow_key=case when renewal is not null or lease is not null then 'renewal'
     when property is null then 'general'
     when old_row.workflow_key in ('general','renewal') then 'properties'
     else old_row.workflow_key end,
  status=task_status,priority=task_priority,assigned_label=assignee,
  assigned_user_id=case when assignee is distinct from old_row.assigned_label then null else old_row.assigned_user_id end,
  notes=new_notes,intake_details=details,
  due_at=null,
  completed_at=case when task_status='completed' then coalesce(old_row.completed_at,clock_timestamp()) else null end
 where t.id=p_task and t.updated_at=p_expected_updated_at and t.archived_at is null
 returning t.* into new_row;
 if not found then raise exception 'Task changed during edit. Refresh before saving' using errcode='40001';end if;
 insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
 values('task',p_task,'task_updated_from_today',actor,'Staff-reviewed task details updated',
 jsonb_build_object(
  'before',jsonb_build_object('status',old_row.status,'priority',old_row.priority,'property_id',old_row.property_id,'unit_id',old_row.unit_id,'lease_id',old_row.lease_id,'renewal_case_id',old_row.renewal_case_id),
  'after',jsonb_build_object('status',new_row.status,'priority',new_row.priority,'property_id',new_row.property_id,'unit_id',new_row.unit_id,'lease_id',new_row.lease_id,'renewal_case_id',new_row.renewal_case_id),
  'reviewed_version',p_expected_updated_at,'edit_source','today_dashboard'));
 return jsonb_build_object('task_id',new_row.id,'updated_at',new_row.updated_at,'status',new_row.status,'property_id',new_row.property_id,'unit_id',new_row.unit_id,'lease_id',new_row.lease_id,'renewal_case_id',new_row.renewal_case_id);
end
$body$;

revoke all on function public.ops_task_update_v1(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.ops_task_update_v1(uuid,timestamptz,jsonb) to authenticated;
commit;
