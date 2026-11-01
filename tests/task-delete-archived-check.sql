-- Disposable database only. Fictional deletion checks roll back completely.
\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;
begin;
select set_config('ci.delete.imported',(select task_id::text from ops_intake_private.items where kind='proposal' and task_id is not null limit 1),false);
create temp table delete_baseline as select
 (select jsonb_agg(payload order by session_id,kind,ref) from ops_intake_private.items) as payloads,
 (select jsonb_agg(to_jsonb(r) order by r.session_id,r.batch_ref) from ops_intake_private.receipts r) as receipts,
 (select count(*) from public.ops_events where event_type='task_work_recorded') as work_count,
 (select count(*) from public.properties) as properties,
 (select count(*) from public.leases) as leases;
create temp table delete_replay as select session_id,request,receipt from ops_intake_private.receipts order by created_at limit 1;
grant select on delete_replay to authenticated;
with t as(insert into public.ops_tasks(workflow_key,task_title,status) values('general','Fictional archived cleanup task','pending') returning id)
 select set_config('ci.delete.extra',(select id::text from t),false);
with t as(insert into public.ops_tasks(workflow_key,task_title,status) values('general','Fictional active task stays','pending') returning id)
 select set_config('ci.delete.active',(select id::text from t),false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.ops_task_set_archived(id,updated_at,true) from public.ops_tasks
 where id in (current_setting('ci.delete.imported')::uuid,current_setting('ci.delete.extra')::uuid);
reset role;
create temp table delete_review as select id,updated_at from public.ops_tasks
 where id in (current_setting('ci.delete.imported')::uuid,current_setting('ci.delete.extra')::uuid);
grant select on delete_review to authenticated;
set role authenticated;
do $invalid$
declare review jsonb; out jsonb; target uuid:=current_setting('ci.delete.extra')::uuid;
begin
 select jsonb_agg(to_jsonb(r)) into review from delete_review r;
 begin perform public.ops_tasks_delete_archived('[]');raise exception 'Empty list accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_tasks_delete_archived(review||review);raise exception 'Duplicate IDs accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_tasks_delete_archived('[{"id":null,"updated_at":null}]');raise exception 'Missing identities accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_tasks_delete_archived(review||jsonb_build_array((select jsonb_build_object('id',id,'updated_at',updated_at) from public.ops_tasks where id=current_setting('ci.delete.active')::uuid)));
  raise exception 'Active task accepted';exception when serialization_failure then null;end;
 begin perform public.ops_tasks_delete_archived(jsonb_set(review,'{0,updated_at}','"2000-01-01T00:00:00Z"'));
  raise exception 'Stale version accepted';exception when serialization_failure then null;end;
 out:=public.ops_task_set_archived(target,(select updated_at from public.ops_tasks where id=target),false);
 begin perform public.ops_tasks_delete_archived(review);raise exception 'Restored task accepted';exception when serialization_failure then null;end;
 if (select count(*) from public.ops_tasks where id in(select id from delete_review))<>2 then raise exception 'Rejected batch partially deleted tasks';end if;
 perform public.ops_task_set_archived(target,(out->>'updated_at')::timestamptz,true);
end $invalid$;
reset role;
update delete_review r set updated_at=t.updated_at from public.ops_tasks t where t.id=r.id;
-- Failure after the provenance update must roll the whole function back.
create function ci.reject_delete_audit() returns trigger language plpgsql as $$begin if new.event_type='archived_task_deleted' then raise exception 'Fictional audit failure' using errcode='23514';end if;return new;end$$;
create trigger reject_delete_audit before insert on public.ops_events for each row execute function ci.reject_delete_audit();
set role authenticated;
do $$begin
 begin perform public.ops_tasks_delete_archived((select jsonb_agg(to_jsonb(r)) from delete_review r));raise exception 'Injected audit failure ignored';exception when check_violation then null;end;
 if (select count(*) from public.ops_tasks where id in(select id from delete_review))<>2 then raise exception 'Failed audit deleted tasks';end if;
end$$;
reset role;
do $$begin
 if not exists(select 1 from ops_intake_private.items where task_id=current_setting('ci.delete.imported')::uuid and deleted_task_id is null) then raise exception 'Failed transaction changed provenance';end if;
end$$;
drop trigger reject_delete_audit on public.ops_events;
drop function ci.reject_delete_audit();
set role authenticated;
do $success$
declare result jsonb; replay record;
begin
 result:=public.ops_tasks_delete_archived((select jsonb_agg(to_jsonb(r)) from delete_review r));
 if result->>'deleted_count'<>'2' then raise exception 'Wrong deletion count';end if;
 if exists(select 1 from public.ops_tasks where id in(select id from delete_review)) then raise exception 'Archived rows remain';end if;
 if not exists(select 1 from public.ops_tasks where id=current_setting('ci.delete.active')::uuid and archived_at is null) then raise exception 'Active task changed';end if;
 begin perform public.ops_tasks_delete_archived((select jsonb_agg(to_jsonb(r)) from delete_review r));raise exception 'Deleted targets accepted again';exception when serialization_failure then null;end;
 begin delete from public.ops_tasks where id=current_setting('ci.delete.active')::uuid;raise exception 'Direct task DELETE grant exposed';exception when insufficient_privilege then null;end;
 select * into replay from delete_replay;
 if public.ops_task_intake('save',replay.session_id,replay.request) is distinct from replay.receipt then raise exception 'Replay receipt changed';end if;
 if exists(select 1 from public.ops_tasks where id=current_setting('ci.delete.imported')::uuid) then raise exception 'Replay resurrected deleted task';end if;
end $success$;
reset role;
do $history$
declare baseline record;
begin
 select * into baseline from delete_baseline;
 if (select jsonb_agg(payload order by session_id,kind,ref) from ops_intake_private.items) is distinct from baseline.payloads then raise exception 'Source/work/proposal payloads changed';end if;
 if (select jsonb_agg(to_jsonb(r) order by r.session_id,r.batch_ref) from ops_intake_private.receipts r) is distinct from baseline.receipts then raise exception 'Receipts changed';end if;
 if not exists(select 1 from ops_intake_private.items where task_id is null and deleted_task_id=current_setting('ci.delete.imported')::uuid) then raise exception 'Original task identity was lost';end if;
 if (select count(*) from public.ops_events where event_type='task_work_recorded')<>baseline.work_count then raise exception 'Work history changed';end if;
 if (select count(*) from public.properties)<>baseline.properties or (select count(*) from public.leases)<>baseline.leases then raise exception 'Portfolio changed';end if;
 if (select count(*) from public.ops_events where event_type='archived_task_deleted' and actor_id='00000000-0000-4000-8000-000000000001')<>2 then raise exception 'Missing deletion audit events';end if;
end $history$;
-- An unknown future cascade dependency must block deletion.
create table ci.future_task_link(task_id uuid references public.ops_tasks(id) on delete cascade);
insert into ci.future_task_link values(current_setting('ci.delete.active')::uuid);
set role authenticated;
select public.ops_task_set_archived(id,updated_at,true) from public.ops_tasks where id=current_setting('ci.delete.active')::uuid;
do $$begin
 begin perform public.ops_tasks_delete_archived((select jsonb_build_array(jsonb_build_object('id',id,'updated_at',updated_at)) from public.ops_tasks where id=current_setting('ci.delete.active')::uuid));raise exception 'Unknown cascade dependency accepted';exception when object_not_in_prerequisite_state then null;end;
end$$;
reset role;
do $$begin if (select count(*) from ci.future_task_link)<>1 then raise exception 'Future dependency was deleted';end if;end$$;
set role authenticated;
do $roles$
declare who text;
begin
 foreach who in array array['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005'] loop
  perform set_config('request.jwt.claim.sub',who,false);
  begin perform public.ops_tasks_delete_archived('[]');raise exception 'Unapproved account allowed';exception when insufficient_privilege then null;end;
 end loop;
end $roles$;
reset role;
set role anon;
do $$begin begin perform public.ops_tasks_delete_archived('[]');raise exception 'Anonymous delete allowed';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
select 'Archived-task deletion, atomicity, provenance, replay and permission checks passed' as result;
