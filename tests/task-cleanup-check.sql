-- This file is executable ONLY on the CI disposable database.
\set ON_ERROR_STOP on
reset role;
do $$ begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $check$
declare sid uuid:=current_setting('ci.intake.session')::uuid;
 st jsonb; tid uuid; old_version timestamptz; result jsonb; saved_receipts integer;
begin
 st:=public.ops_task_intake('state',sid);
 if jsonb_typeof(st->'receipts'->0)<>'object' or st->'receipts'->0->>'schema_version'<>'oaktown.task-receipt.v1' then
  raise exception 'Saved receipt was replaced by null in session state';
 end if;
 saved_receipts:=jsonb_array_length(st->'receipts');
 select id,updated_at into tid,old_version from public.ops_tasks where task_title='Fictional general task' limit 1;
 if tid is null then raise exception 'No fictional task to archive';end if;
 result:=public.ops_task_set_archived(tid,old_version,true);
 if result->>'archived_at' is null then raise exception 'Archive did not return state';end if;
 st:=public.ops_task_intake('state',sid);
 if not exists(select 1 from jsonb_array_elements(st->'tasks') x where x->>'id'=tid::text and x->>'archived_at' is not null) then
  raise exception 'Archived flag absent from session tasks';
 end if;
 if jsonb_array_length(st->'receipts')<>saved_receipts then raise exception 'Archiving must not delete import receipts';end if;
 if not exists(select 1 from jsonb_array_elements(st->'items') x where x->>'task_id'=tid::text) then raise exception 'Archiving deleted intake provenance';end if;
 begin perform public.ops_task_set_archived(tid,old_version,false);raise exception 'Stale-version restore was accepted';exception when serialization_failure then null;end;
 result:=public.ops_task_set_archived(tid,(result->>'updated_at')::timestamptz,false);
 if result->>'archived_at' is not null then raise exception 'Restore did not clear archive';end if;
 if (select count(*) from public.ops_events where entity_id=tid and event_type in ('task_archived','task_restored'))<>2 then
  raise exception 'Expected two immutable audit events';
 end if;
 -- A non-mutating duplicate call must not create another audit event.
 begin perform public.ops_task_set_archived(tid,(result->>'updated_at')::timestamptz,false);raise exception 'Duplicate restore was accepted';exception when serialization_failure then null;end;
end
$check$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$begin
 begin perform public.ops_task_set_archived('00000000-0000-4000-8000-000000000999'::uuid,now(),true);raise exception 'Viewer archived task';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role anon;
do $$begin
 begin perform public.ops_task_set_archived((select id from public.ops_tasks limit 1),now(),true);raise exception 'Anonymous archive allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'Task receipt and reversible archive tests passed' as result;
