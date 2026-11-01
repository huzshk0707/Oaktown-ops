-- NEW DATABASE UPDATE. Apply only after reviewing and testing this release.
-- No task is deleted by installing this function. Do not replay old migrations.
begin;

-- Keep the original task identity in intake history when the live row is removed.
-- The existing restrictive task FK remains; there is no cascading history delete.
alter table ops_intake_private.items add column if not exists deleted_task_id uuid;

create or replace function public.ops_tasks_delete_archived(p_tasks jsonb)
returns jsonb language plpgsql security definer set search_path='' as $delete_archived$
declare actor uuid:=auth.uid(); expected integer; removed integer;
begin
 if actor is null or not exists(
  select 1 from public.staff_memberships m
  where m.user_id=actor and m.is_active and m.role in ('admin','editor')
 ) then raise exception 'This account cannot delete archived tasks' using errcode='42501';end if;
 if p_tasks is null or jsonb_typeof(p_tasks)<>'array' then
  raise exception 'Reviewed archived-task list required' using errcode='22023';
 end if;
 expected:=jsonb_array_length(p_tasks);
 if expected<1 or expected>1000 then
  raise exception 'Review between 1 and 1000 archived tasks' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_tasks) v where jsonb_typeof(v)<>'object') then
  raise exception 'Invalid reviewed task' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_tasks) v
  where not(v ? 'id' and v ? 'updated_at') or v->>'id' is null or v->>'updated_at' is null
   or exists(select 1 from jsonb_object_keys(v) k where k not in ('id','updated_at'))) then
  raise exception 'Task identity and saved version required' using errcode='22023';
 end if;
 if (select count(distinct r.id) from jsonb_to_recordset(p_tasks) as r(id uuid,updated_at timestamptz))<>expected then
  raise exception 'Duplicate or missing task identity' using errcode='22023';
 end if;
 -- Consistent row-lock order. A concurrent restore/update invalidates the review.
 perform t.id from public.ops_tasks t
 join jsonb_to_recordset(p_tasks) as r(id uuid,updated_at timestamptz) on r.id=t.id
 order by t.id for update of t;
 if (select count(*) from public.ops_tasks t
  join jsonb_to_recordset(p_tasks) as r(id uuid,updated_at timestamptz)
   on r.id=t.id and r.updated_at=t.updated_at
  where t.archived_at is not null)<>expected then
  raise exception 'An archived task changed, was restored, or was deleted. Refresh and review again.' using errcode='40001';
 end if;
 -- Refuse unknown dependency changes rather than cascading into future modules.
 if exists(select 1 from pg_catalog.pg_constraint c where c.contype='f'
  and c.confrelid='public.ops_tasks'::regclass and not(
   c.conrelid='ops_intake_private.items'::regclass and c.conkey=array[
    (select a.attnum from pg_catalog.pg_attribute a where a.attrelid=c.conrelid and a.attname='task_id')
   ]::smallint[])) then
  raise exception 'Task references changed; review the deletion function before continuing' using errcode='55000';
 end if;
 -- Preserve source/proposal/activity payloads and their original task identity.
 update ops_intake_private.items i set deleted_task_id=i.task_id,task_id=null
 where i.task_id in (select r.id from jsonb_to_recordset(p_tasks) as r(id uuid));
 insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
 select 'task',t.id,'archived_task_deleted',actor,'Permanently deleted archived task',
  jsonb_build_object('reviewed_task_version',t.updated_at,'archived_at',t.archived_at)
 from public.ops_tasks t join jsonb_to_recordset(p_tasks) as r(id uuid) on r.id=t.id;
 delete from public.ops_tasks t using jsonb_to_recordset(p_tasks) as r(id uuid)
 where t.id=r.id and t.archived_at is not null;
 get diagnostics removed=row_count;
 if removed<>expected then raise exception 'Reviewed task set changed' using errcode='40001';end if;
 return jsonb_build_object('deleted_count',removed);
end
$delete_archived$;
revoke all on function public.ops_tasks_delete_archived(jsonb) from public,anon;
grant execute on function public.ops_tasks_delete_archived(jsonb) to authenticated;
-- No DELETE table grant: clients cannot use this RPC to remove active tasks.
notify pgrst, 'reload schema';
commit;
