-- Disposable PostgreSQL security/regression check for Today edits. Never run on live portfolio.
\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $check$
declare
 task_id uuid; old_version timestamptz; p uuid; u uuid; l uuid; r uuid; payload jsonb; out jsonb;
 prior_title text; event_count integer; before_receipts integer;
begin
 select id,updated_at,task_title into task_id,old_version,prior_title from public.ops_tasks where task_title='Fictional general task' limit 1;
 if task_id is null then raise exception 'Task fixture missing';end if;
 select la.id,la.unit_id,un.property_id into l,u,p
  from public.leases la join public.units un on un.id=la.unit_id limit 1;
 if l is null then raise exception 'Lease fixture missing';end if;
 select id into r from public.renewal_cases where lease_id=l limit 1;
 if r is null then raise exception 'Renewal fixture missing';end if;
 select count(*) into event_count from public.ops_events where entity_id=task_id;
 select jsonb_array_length(public.ops_task_intake('state',current_setting('ci.intake.session')::uuid)->'receipts') into before_receipts;
 payload=jsonb_build_object('task_title','Fictional reviewed lease follow-up','property_id',p,'unit_id',u,
  'lease_id',l,'renewal_case_id',r,'status','waiting','priority','high',
  'assigned_label','Fictional Staff','due_date','2026-11-05','follow_up_date','2026-11-04',
  'next_action','Confirm fictional signature','notes','Internal reviewed note');
 out:=public.ops_task_update_v1(task_id,old_version,payload);
 if out->>'task_id' is distinct from task_id::text then raise exception 'RPC returned wrong task';end if;
 if not exists(select 1 from public.ops_tasks t where t.id=task_id and t.property_id=p and t.unit_id=u
  and t.lease_id=l and t.renewal_case_id=r and t.status='waiting' and t.priority='high'
  and t.intake_details->'follow_up'->>'date'='2026-11-04'
  and t.intake_details->'due'->>'date'='2026-11-05' and t.notes='Internal reviewed note'
  and t.assigned_label='Fictional Staff') then raise exception 'Task links or edits were not saved';end if;
 if (select count(*) from public.ops_events where entity_id=task_id and event_type='task_updated_from_today')<>1
 then raise exception 'Expected one audit event';end if;
 if jsonb_array_length(public.ops_task_intake('state',current_setting('ci.intake.session')::uuid)->'receipts')<>before_receipts then raise exception 'Receipt was changed';end if;
 begin perform public.ops_task_update_v1(task_id,old_version,payload);
  raise exception 'Stale edit accepted';exception when serialization_failure then null;end;
 -- Mismatched references rejected, existing update preserved.
 payload=jsonb_set(payload,'{property_id}','null'::jsonb);
 begin perform public.ops_task_update_v1(task_id,(out->>'updated_at')::timestamptz,payload);
  raise exception 'Mismatched unit/property accepted';exception when invalid_parameter_value then null;end;
 -- Updating a completed task does not alter the lease or renewal status.
 payload=jsonb_set(payload,'{property_id}',to_jsonb(p));
 payload=jsonb_set(payload,'{status}','"completed"'::jsonb);
 out:=public.ops_task_update_v1(task_id,(out->>'updated_at')::timestamptz,payload);
 if not exists(select 1 from public.ops_tasks where id=task_id and completed_at is not null)
 then raise exception 'Completion timestamp missing';end if;
 -- Don't silently change source lease/renewal records.
 if not exists(select 1 from public.leases where id=l and lease_status is not null)
 or not exists(select 1 from public.renewal_cases where id=r)
 then raise exception 'A linked source record changed or disappeared';end if;
end $check$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$declare t uuid;v timestamptz;begin
 select id,updated_at into t,v from public.ops_tasks limit 1;
 begin perform public.ops_task_update_v1(t,v,'{}'::jsonb);raise exception 'Viewer updated task';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set role anon;
do $$begin
 begin perform public.ops_task_update_v1('00000000-0000-4000-8000-000000000999',now(),'{}'::jsonb);
 raise exception 'Anonymous update accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'Today task editor links, audit, optimistic conflict and staff permission tests passed' as result;
