begin;

-- Private read helper. The existing task runner checks OAuth, staff, session
-- and client authorization before dispatching here. Keep the projection narrow.
create function ops_agent_private.morning_priority_snapshot(payload jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
 snapshot_day date;
 cursor_value text := payload->>'cursor';
 page_start bigint := 0;
 page_size constant integer := 25;
 result jsonb;
begin
 if exists(select 1 from jsonb_object_keys(payload) as k where k not in ('work_date','cursor'))
  or jsonb_typeof(payload->'work_date') is distinct from 'string'
  or (payload->>'work_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or not pg_input_is_valid(payload->>'work_date','date')
  or (payload ? 'cursor' and (jsonb_typeof(payload->'cursor') is distinct from 'string'
      or cursor_value !~ '^[1-9][0-9]{0,17}:[a-f0-9]{64}$'))
 then raise exception 'Valid Eastern work date and snapshot cursor required' using errcode='22023'; end if;
 snapshot_day := (payload->>'work_date')::date;
 if cursor_value is not null then
  page_start := split_part(cursor_value,':',1)::bigint;
 end if;

 -- Match OpsTodayModel.scheduled and OpsFocusBoardModel.order. The earliest
 -- saved schedule wins, with a due instant ahead of date-only due and follow-up
 -- on ties. Alongside that order, mark actionable high priority and dependencies.
 with active as materialized (
  select t.id, to_jsonb(t)->>'task_code' as task_code, t.task_title, t.status, t.priority,
   coalesce(nullif(lower(t.priority),''),'normal') as priority_key,
   t.assigned_label, t.property_id, t.unit_id, t.updated_at, t.due_at,
   case when jsonb_typeof(t.intake_details->'next_action')='string' then t.intake_details->>'next_action' end as next_action,
   case when jsonb_typeof(t.intake_details->'waiting_on')='string' then t.intake_details->>'waiting_on' end as waiting_on,
   case when jsonb_typeof(t.intake_details->'blocked_reason')='string' then t.intake_details->>'blocked_reason' end as blocked_reason,
   case when isfinite(t.due_at) then (t.due_at at time zone 'America/New_York')::date end as instant_date,
   case when d.due ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and pg_input_is_valid(d.due,'date') then d.due::date end as due_date,
   case when d.follow_up ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and pg_input_is_valid(d.follow_up,'date') then d.follow_up::date end as follow_up_date
  from public.ops_tasks t
  cross join lateral (values (t.intake_details #>> '{due,date}', t.intake_details #>> '{follow_up,date}')) as d(due,follow_up)
  where t.archived_at is null and lower(coalesce(t.status,'')) not in ('completed','cancelled','canceled','closed','done','declined')
 ), scheduled as (
  select a.*, least(instant_date,due_date,follow_up_date) as schedule_date from active a
 ), ranked as (
  select s.*,
   next_action ~ '[^[:space:]]' as actionable,
   lower(status) in ('waiting','blocked') or coalesce(waiting_on ~ '[^[:space:]]',false)
    or coalesce(blocked_reason ~ '[^[:space:]]',false) as dependency,
   case when schedule_date<snapshot_day then 0 when schedule_date=snapshot_day then 1 when priority_key='urgent' then 2 else 3 end as lane,
   case priority_key when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 when 'low' then 3 else 4 end as priority_rank
  from scheduled s
 ), revision as (
  select count(*) as total_active,
   encode(sha256(convert_to(concat_ws('|',auth.uid(),current_setting('request.jwt.claims',true)::jsonb->>'client_id',
    snapshot_day,coalesce(string_agg(id::text||':'||extract(epoch from updated_at)::text,',' order by id),'')),'UTF8')),'hex') as digest
  from active
 ), page as (
  select * from ranked
  order by lane, schedule_date nulls last, priority_rank, lower(task_title) collate "C", id
  limit page_size offset page_start
 ), projected as (
  select coalesce(jsonb_agg(jsonb_build_object(
   'task_id',id,'task_code',task_code,'title',task_title,'status',status,'priority',priority,'next_action',next_action,
   'assigned_label',assigned_label,'property_id',property_id,'unit_id',unit_id,'updated_at',updated_at,
   'due_at',due_at,'due_date',due_date,'follow_up_date',follow_up_date,'waiting_on',waiting_on,'blocked_reason',blocked_reason,
   'schedule_date',schedule_date,
   'schedule_type',case when schedule_date=instant_date then 'Due' when schedule_date=due_date then 'Due (date only)'
                        when schedule_date=follow_up_date then 'Follow-up' end,
   'categories',coalesce(nullif(array_remove(array[
    case when priority_key='urgent' then 'urgent' end,
    case when lane=0 then 'overdue' end,
    case when least(instant_date,due_date)=snapshot_day then 'due_today' end,
    case when priority_key='high' and actionable and not dependency then 'high_priority_actionable' end,
    case when follow_up_date is not null then 'scheduled_follow_up' end,
    case when dependency then 'waiting_blocked' end
   ],null),'{}'),array['other_active'])
  ) order by lane, schedule_date nulls last, priority_rank, lower(task_title) collate "C", id),'[]'::jsonb) as tasks
  from page
 )
 select jsonb_build_object('schema_version','oaktown.morning-priority-snapshot.v1','work_date',snapshot_day,
  'timezone','America/New_York','total_active',total_active,'offset',page_start,'tasks',tasks,
  'has_more',page_start+page_size<total_active,
  'next_cursor',case when page_start+page_size<total_active then
   (page_start+page_size)::text||':'||encode(sha256(convert_to(digest||':'||(page_start+page_size)::text,'UTF8')),'hex') end)
 into result
 from revision cross join projected
 where cursor_value is null or (
  page_start<total_active and split_part(cursor_value,':',2)=encode(sha256(convert_to(digest||':'||page_start::text,'UTF8')),'hex')
 );

 if result is null then
  raise exception 'Morning task snapshot changed or cursor is invalid; restart from the first page' using errcode='40001';
 end if;
 return result;
end;
$$;
revoke all on function ops_agent_private.morning_priority_snapshot(jsonb) from public,anon,authenticated,oaktown_task_agent;

-- Extend only the scoped allowlist and dispatch. Leave the installed runner,
-- including existing search, authorization and reviewed-write branches, intact.
do $migration$
declare
 definition text := pg_catalog.pg_get_functiondef('ops_agent_private.run(text,jsonb)'::regprocedure);
 allowed constant text := $old$if action not in ('search','get','history','preview','apply') then$old$;
 dispatch constant text := $old$ if action='search' then$old$;
begin
 if array_length(string_to_array(definition,allowed),1) is distinct from 2
  or array_length(string_to_array(definition,dispatch),1) is distinct from 2
 then raise exception 'Expected one scoped task allowlist and search branch; review the installed function'; end if;

 definition := replace(definition,allowed,$new$if action not in ('search','get','history','preview','apply','morning_priority_snapshot') then$new$);
 execute replace(definition,dispatch,$new$ if action='morning_priority_snapshot' then
  return ops_agent_private.morning_priority_snapshot(payload);
 elsif action='search' then$new$);
end;
$migration$;

commit;
