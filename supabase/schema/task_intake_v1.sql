-- APPLIED to Oaktown Ops as migration 20261031235822_oaktown_task_intake_v1.
-- Reviewed source snapshot. Do not reapply to production; CI uses a disposable database.
-- Additive task intake; no Portfolio Master replay and no external actions.
begin;
create schema if not exists ops_intake_private;
revoke all on schema ops_intake_private from public,anon;
grant usage on schema ops_intake_private to authenticated;
alter table public.ops_tasks add column if not exists intake_details jsonb not null default '{}'::jsonb;
alter table public.ops_tasks add constraint ops_tasks_intake_details_object check(jsonb_typeof(intake_details)='object');
alter table public.ops_tasks drop constraint ops_task_context;
alter table public.ops_tasks add constraint ops_task_context check
 (property_id is not null or unit_id is not null or tenancy_id is not null or renewal_case_id is not null or workflow_key='general');
create table ops_intake_private.sessions(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table ops_intake_private.items(
 session_id uuid not null references ops_intake_private.sessions(id),
 kind text not null check(kind in ('source','proposal','activity')),
 ref text not null,
 payload jsonb not null,
 task_id uuid references public.ops_tasks(id),
 primary key(session_id,kind,ref)
);
create table ops_intake_private.receipts(
 session_id uuid not null references ops_intake_private.sessions(id),
 batch_ref text not null,
 request jsonb not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(session_id,batch_ref)
);
alter table ops_intake_private.sessions enable row level security;
alter table ops_intake_private.items enable row level security;
alter table ops_intake_private.receipts enable row level security;
revoke all on all tables in schema ops_intake_private from public,anon,authenticated;
-- All access uses the checked RPC below. Private tables have no client policies/grants.

create function ops_intake_private.assert(ok boolean,msg text) returns void
language plpgsql security invoker set search_path='' as $$
begin if ok is distinct from true then raise exception using errcode='22023',message=msg; end if; end $$;

create function ops_intake_private.check_fields(v jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare k text; x jsonb; dt date;
begin
 perform ops_intake_private.assert(jsonb_typeof(v)='object','Task changes must be objects');
 for k,x in select * from jsonb_each(v) loop
  perform ops_intake_private.assert(k=any(array['task_title','status','priority','assigned_label','next_action','waiting_on','blocked_reason','due','follow_up','completion_summary']),'Unsupported task field');
  if k in ('due','follow_up') then
   perform ops_intake_private.assert(jsonb_typeof(x)='object' and x->>'timezone'='America/New_York' and (x->>'date')~'^\d{4}-\d{2}-\d{2}$','Invalid schedule');
   dt:=(x->>'date')::date;
   perform ops_intake_private.assert(to_char(dt,'YYYY-MM-DD')=x->>'date','Invalid calendar date');
   perform ops_intake_private.assert(x->>'time' is null or (x->>'time')~'^([01]\d|2[0-3]):[0-5]\d$','Invalid schedule time');
   perform ops_intake_private.assert(length(btrim(x->>'original_text')) between 1 and 2000,'Original date wording required');
   perform ops_intake_private.assert(not exists(select 1 from jsonb_object_keys(x) q where q not in ('date','time','timezone','original_text')),'Unsupported schedule field');
  else
   perform ops_intake_private.assert(jsonb_typeof(x)='string' and length(btrim(x#>>'{}')) between 1 and (case when k='task_title' then 300 else 2000 end),'Invalid task text');
   if k='status' then perform ops_intake_private.assert((x#>>'{}')=any(array['pending','in_progress','waiting','blocked','completed','cancelled']),'Invalid status');end if;
   if k='priority' then perform ops_intake_private.assert((x#>>'{}')=any(array['low','normal','high','urgent']),'Invalid priority');end if;
  end if;
 end loop;
end $$;

-- SECURITY DEFINER is confined to a private schema. Every action verifies the
-- authenticated active editor/admin and session ownership before any data access.
create function ops_intake_private.run(p_action text,p_session uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare
 actor uuid:=auth.uid(); sid uuid; export jsonb; p jsonb; a jsonb; s jsonb; x jsonb; prior jsonb;
 ctx jsonb; fields jsonb; details jsonb; task public.ops_tasks%rowtype;
 taskid uuid; propertyid uuid; unitid uuid; tenancyid uuid; caseid uuid;
 targets jsonb:='{}'; checked jsonb:='{}'; result jsonb:='[]'; activity_result jsonb:='[]';
 ref text; op text; key text; source_ref text; wf text; n integer; mins numeric;
 approved boolean; stamp timestamptz:=clock_timestamp(); receipt jsonb; existing_request jsonb;
begin
 perform ops_intake_private.assert(actor is not null and exists(
  select 1 from public.staff_memberships where user_id=actor and is_active and role in ('admin','editor')),'Active editor access required');
 if p_action='new' then
  insert into ops_intake_private.sessions(actor_id) values(actor) returning id into sid;
  return jsonb_build_object('session_id',sid);
 end if;
 if p_action='sessions' then
  return coalesce((select jsonb_agg(to_jsonb(z)) from (select id,created_at from ops_intake_private.sessions where actor_id=actor order by created_at desc limit 100)z),'[]');
 end if;
 perform 1 from ops_intake_private.sessions where id=p_session and actor_id=actor for update;
 perform ops_intake_private.assert(found,'Intake session unavailable for this account');
 if p_action='state' then
  perform ops_intake_private.assert((select count(*) from public.ops_tasks)<=1000,'Task snapshot exceeds v1 limit; contact administrator');
  return jsonb_build_object('session_id',p_session,
   'items',coalesce((select jsonb_agg(jsonb_build_object('kind',i.kind,'ref',i.ref,'payload',i.payload,'task_id',i.task_id)) from ops_intake_private.items i where i.session_id=p_session),'[]'),
   'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'task_title',task_title,'status',status,'priority',priority,'assigned_label',assigned_label,'property_id',property_id,'unit_id',unit_id,'tenancy_id',tenancy_id,'renewal_case_id',renewal_case_id,'workflow_key',workflow_key,'updated_at',updated_at,'intake_details',intake_details)) from public.ops_tasks),'[]'),
   'receipts',coalesce((select jsonb_agg(receipt order by created_at desc) from ops_intake_private.receipts where session_id=p_session),'[]'));
 end if;
 perform ops_intake_private.assert(p_action='save','Unknown intake action');
 perform ops_intake_private.assert(octet_length(p_payload::text)<=300000 and p_payload->>'reviewed'='true','Review the intake before saving');
 export:=p_payload->'export';
 perform ops_intake_private.assert(jsonb_typeof(export)='object' and not exists(select 1 from jsonb_object_keys(export) k where k not in ('schema_version','session_id','batch_ref','work_date','timezone','snapshot_ref','sources','proposals','activities','questions')),'Unsupported export field');
 perform ops_intake_private.assert(export->>'schema_version'='oaktown.task-intake.v1' and export->>'timezone'='America/New_York','Unsupported intake format');
 perform ops_intake_private.assert(export->>'session_id' is null or (export->>'session_id')::uuid=p_session,'Export belongs to another session');
 perform ops_intake_private.assert((export->>'batch_ref')~'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$','Invalid batch reference');
 perform ops_intake_private.assert((export->>'work_date')~'^\d{4}-\d{2}-\d{2}$','Work date required');
 perform (export->>'work_date')::date;
 select r.request,r.receipt into existing_request,receipt from ops_intake_private.receipts r where r.session_id=p_session and batch_ref=export->>'batch_ref';
 if found then
  perform ops_intake_private.assert(existing_request=p_payload,'Batch reference already saved with different content. Use a new batch reference.');
  return receipt;
 end if;
 perform ops_intake_private.assert(jsonb_typeof(export->'sources')='array' and jsonb_array_length(export->'sources')<=100,'Invalid sources');
 perform ops_intake_private.assert(jsonb_typeof(export->'proposals')='array' and jsonb_array_length(export->'proposals')<=50,'Invalid proposals');
 perform ops_intake_private.assert(jsonb_typeof(export->'activities')='array' and jsonb_array_length(export->'activities')<=100,'Invalid activities');
 perform ops_intake_private.assert(jsonb_typeof(p_payload->'resolutions')='object' and jsonb_typeof(p_payload->'expected_versions')='object' and jsonb_typeof(p_payload->'accept_clears')='array' and jsonb_typeof(p_payload->'accept_suggestions')='array','Invalid review decisions');
 -- Reject duplicate references within a payload before processing.
 for key,ref in select 'source',v->>'source_ref' from jsonb_array_elements(export->'sources')v union all select 'proposal',v->>'proposal_ref' from jsonb_array_elements(export->'proposals')v union all select 'activity',v->>'activity_ref' from jsonb_array_elements(export->'activities')v loop
  perform ops_intake_private.assert(ref~'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$' and not checked ? (key||':'||ref),'Invalid or duplicate reference');
  checked:=checked||jsonb_build_object(key||':'||ref,true);
 end loop;
 checked:='{}';
 for s in select value from jsonb_array_elements(export->'sources') loop
  ref:=s->>'source_ref';
  perform ops_intake_private.assert(jsonb_typeof(s)='object' and jsonb_typeof(s->'evidence_excerpt')='string' and jsonb_typeof(s->'label')='string' and length(btrim(s->>'label')) between 1 and 2000 and not exists(select 1 from jsonb_object_keys(s) k where k not in ('source_ref','kind','label','occurred_at','evidence_excerpt')),'Invalid source');
  perform ops_intake_private.assert(s->>'kind'=any(array['voice','image','email','text']) and length(btrim(s->>'evidence_excerpt')) between 1 and 8000,'Invalid source evidence');
  select payload into prior from ops_intake_private.items where session_id=p_session and kind='source' and items.ref=ref;
  if found then perform ops_intake_private.assert(prior=s,'Source reference changed after import');
  else insert into ops_intake_private.items values(p_session,'source',ref,s,null);end if;
 end loop;
 -- Pre-lock known task rows in stable order so concurrent sessions cannot invert locks.
 perform 1 from public.ops_tasks where id in(
  select (v->>'task_id')::uuid from jsonb_array_elements(export->'proposals')v where v->>'task_id' is not null
  union select (v->>'task_id')::uuid from jsonb_array_elements(export->'activities')v where v->>'task_id' is not null
  union select i.task_id from ops_intake_private.items i where i.session_id=p_session and i.task_id is not null
 ) order by id for update;
 for p in select value from jsonb_array_elements(export->'proposals') loop
  ref:=p->>'proposal_ref';op:=p->>'operation';
  perform ops_intake_private.assert(not exists(select 1 from jsonb_object_keys(p) k where k not in ('proposal_ref','operation','task_id','related_proposal_ref','expected_updated_at','match_reason','context','changes','suggestions','source_refs','needs_clarification','proposed_clear_fields')),'Unsupported proposal field');
  perform ops_intake_private.assert(length(btrim(p->>'match_reason')) between 1 and 2000 and jsonb_typeof(p->'match_reason')='string','Match reason required');
  perform ops_intake_private.assert(jsonb_typeof(p->'context')='object' and not exists(select 1 from jsonb_object_keys(p->'context') k where k not in ('workflow_key','property_id','unit_id','tenancy_id','renewal_case_id','context_label')),'Invalid context');
  perform ops_intake_private.assert(op=any(array['create','update','activity','duplicate','clarify']),'Invalid operation');
  perform ops_intake_private.check_fields(p->'changes');perform ops_intake_private.check_fields(p->'suggestions');
  perform ops_intake_private.assert(jsonb_typeof(p->'source_refs')='array' and jsonb_array_length(p->'source_refs')>0,'Evidence required');
  for source_ref in select jsonb_array_elements_text(p->'source_refs') loop
   perform ops_intake_private.assert(exists(select 1 from jsonb_array_elements(export->'sources')v where v->>'source_ref'=source_ref),'Missing source in export');
  end loop;
  select payload,items.task_id into prior,taskid from ops_intake_private.items where session_id=p_session and kind='proposal' and items.ref=ref;
  if found then
   perform ops_intake_private.assert(prior=p,'Proposal changed after import. Use a new update reference.');
   targets:=targets||jsonb_build_object(ref,taskid);
   result:=result||jsonb_build_array(jsonb_build_object('proposal_ref',ref,'task_id',taskid,'result','already_imported'));continue;
  end if;
  if op='create' then
   perform ops_intake_private.assert(p->>'task_id' is null and p->>'related_proposal_ref' is null,'Invalid create target');
   ctx:=p_payload->'resolutions'->ref;
   perform ops_intake_private.assert(jsonb_typeof(ctx)='object','Resolve every new task context before saving');
   wf:=p->'context'->>'workflow_key';
   perform ops_intake_private.assert(wf=any(array['notices','renewal','properties','maintenance','listings','general']),'Invalid workflow');
   propertyid:=(ctx->>'property_id')::uuid;unitid:=(ctx->>'unit_id')::uuid;
   tenancyid:=(p->'context'->>'tenancy_id')::uuid;caseid:=(p->'context'->>'renewal_case_id')::uuid;
   if wf='general' then
    perform ops_intake_private.assert(propertyid is null and unitid is null and tenancyid is null and caseid is null,'General operations cannot carry property context');
   else
    perform ops_intake_private.assert(propertyid is not null and exists(select 1 from public.properties where id=propertyid),'Choose a real property');
    if unitid is not null then perform ops_intake_private.assert(exists(select 1 from public.units where id=unitid and property_id=propertyid),'Unit does not belong to property');end if;
    if tenancyid is not null then perform ops_intake_private.assert(exists(select 1 from public.tenancies where id=tenancyid and unit_id=unitid),'Tenancy does not match unit');end if;
    if caseid is not null then perform ops_intake_private.assert(exists(select 1 from public.renewal_cases where id=caseid and (property_id=propertyid or unit_id=unitid) and (unit_id is null or unit_id=unitid)),'Renewal case does not match context');end if;
   end if;
   fields:=jsonb_build_object('status','pending','priority','normal')||(p->'changes');
   if p_payload->'accept_suggestions' ? ref then fields:=fields||(p->'suggestions');end if;
   perform ops_intake_private.assert(length(btrim(fields->>'task_title')) between 1 and 300,'Task title required');
   insert into public.ops_tasks(property_id,unit_id,tenancy_id,renewal_case_id,workflow_key,task_title,status,priority,assigned_user_id,assigned_label,source_task_key)
    values(propertyid,unitid,tenancyid,caseid,wf,fields->>'task_title','pending','normal',actor,fields->>'assigned_label','intake:'||p_session||':'||ref) returning id into taskid;
   checked:=checked||jsonb_build_object(taskid::text,true);
  else
   perform ops_intake_private.assert(not(p->>'task_id' is not null and p->>'related_proposal_ref' is not null),'Ambiguous task target');
   if p->>'task_id' is not null then taskid:=(p->>'task_id')::uuid;
   else
    taskid:=(targets->>(p->>'related_proposal_ref'))::uuid;
    if taskid is null then select i.task_id into taskid from ops_intake_private.items i where i.session_id=p_session and i.kind='proposal' and i.ref=p->>'related_proposal_ref';end if;
   end if;
   perform ops_intake_private.assert(taskid is not null,'Unknown or forward task reference');
   fields:=p->'changes';if p_payload->'accept_suggestions' ? ref then fields:=fields||(p->'suggestions');end if;
  end if;
  select * into task from public.ops_tasks where id=taskid for update;
  perform ops_intake_private.assert(found,'Task unavailable');
  if not checked ? taskid::text then
   perform ops_intake_private.assert(p_payload->'expected_versions'->>taskid::text is not null and (p_payload->'expected_versions'->>taskid::text)::timestamptz=task.updated_at,'Task changed since review. Refresh and review again.');
   if p->>'expected_updated_at' is not null then perform ops_intake_private.assert((p->>'expected_updated_at')::timestamptz=task.updated_at,'AI snapshot is stale');end if;
   checked:=checked||jsonb_build_object(taskid::text,true);
  end if;
  perform ops_intake_private.assert(op in ('create','update') or (fields='{}'::jsonb and coalesce(p->'proposed_clear_fields','[]')='[]'::jsonb),'Observations cannot change fields');
  details:=task.intake_details||(fields-array['task_title','status','priority','assigned_label']);
  for key in select jsonb_array_elements_text(coalesce(p->'proposed_clear_fields','[]')) loop
   perform ops_intake_private.assert(key=any(array['waiting_on','blocked_reason','due','follow_up','completion_summary']) and not fields ? key,'Invalid clearing');
   if p_payload->'accept_clears' ? ref then details:=details-key;end if;
  end loop;
  if op in ('create','update') and (fields<>'{}'::jsonb or p_payload->'accept_clears' ? ref) then
   update public.ops_tasks set task_title=coalesce(fields->>'task_title',task_title),status=coalesce(fields->>'status',status),
    priority=coalesce(fields->>'priority',priority),assigned_label=coalesce(fields->>'assigned_label',assigned_label),intake_details=details,
    due_at=case when fields ? 'due' then case when details->'due'->>'time' is not null then ((details->'due'->>'date')||' '||(details->'due'->>'time'))::timestamp at time zone 'America/New_York' else null end when p_payload->'accept_clears' ? ref and (p->'proposed_clear_fields') ? 'due' then null else due_at end,
    completed_at=case when fields->>'status'='completed' then coalesce(completed_at,stamp) when fields ? 'status' then null else completed_at end
    where id=taskid;
  end if;
  insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
   values('task',taskid,'task_intake_reviewed',actor,p->>'match_reason',jsonb_build_object('session_id',p_session,'proposal',p,'accepted_clears',p_payload->'accept_clears' ? ref,'accepted_suggestions',p_payload->'accept_suggestions' ? ref));
  insert into ops_intake_private.items values(p_session,'proposal',ref,p,taskid);
  targets:=targets||jsonb_build_object(ref,taskid);
  result:=result||jsonb_build_array(jsonb_build_object('proposal_ref',ref,'task_id',taskid,'result','imported'));
 end loop;
 -- Validate final consolidated state, not intermediate waiting->pending transitions.
 for taskid in select distinct i.task_id from ops_intake_private.items i where i.session_id=p_session and i.kind='proposal' and i.ref in(select v->>'proposal_ref' from jsonb_array_elements(export->'proposals')v) loop
  select * into task from public.ops_tasks where id=taskid;
  perform ops_intake_private.assert(task.status<>'waiting' or length(btrim(task.intake_details->>'waiting_on'))>0,'Waiting task needs waiting_on');
  perform ops_intake_private.assert(task.status='waiting' or not task.intake_details ? 'waiting_on','Review clearing obsolete waiting_on');
  perform ops_intake_private.assert(task.status<>'blocked' or length(btrim(task.intake_details->>'blocked_reason'))>0,'Blocked task needs reason');
  perform ops_intake_private.assert(task.status<>'completed' or length(btrim(task.intake_details->>'completion_summary'))>0,'Completed task needs summary');
 end loop;
 for a in select value from jsonb_array_elements(export->'activities') loop
  ref:=a->>'activity_ref';
  perform ops_intake_private.assert(not exists(select 1 from jsonb_object_keys(a) k where k not in ('activity_ref','task_id','proposal_ref','work_date','summary','minutes','duration_basis','source_refs')),'Unsupported activity field');
  perform ops_intake_private.assert(jsonb_typeof(a->'summary')='string' and ((a->>'duration_basis'='not_provided' and a->'minutes'='null'::jsonb) or (a->>'duration_basis'<>'not_provided' and jsonb_typeof(a->'minutes')='number')),'Invalid activity value type');
  select payload,items.task_id into prior,taskid from ops_intake_private.items where session_id=p_session and kind='activity' and items.ref=ref;
  if found then perform ops_intake_private.assert(prior=a,'Activity changed after import');activity_result:=activity_result||jsonb_build_array(jsonb_build_object('activity_ref',ref,'task_id',taskid,'result','already_imported'));continue;end if;
  perform ops_intake_private.assert((a->>'task_id' is null)<>(a->>'proposal_ref' is null),'Activity needs one task target');
  taskid:=coalesce((a->>'task_id')::uuid,(targets->>(a->>'proposal_ref'))::uuid);
  if taskid is null then select i.task_id into taskid from ops_intake_private.items i where i.session_id=p_session and i.kind='proposal' and i.ref=a->>'proposal_ref';end if;
  perform ops_intake_private.assert(taskid is not null and exists(select 1 from public.ops_tasks where id=taskid),'Activity target unavailable');
  perform ops_intake_private.assert(length(btrim(a->>'summary')) between 1 and 2000 and (a->>'work_date')~'^\d{4}-\d{2}-\d{2}$','Invalid activity');perform (a->>'work_date')::date;
  perform ops_intake_private.assert(a->>'duration_basis'=any(array['reported','user_estimate','not_provided']),'Invalid duration basis');
  mins:=(a->>'minutes')::numeric;
  perform ops_intake_private.assert((a->>'duration_basis'='not_provided' and mins is null) or (a->>'duration_basis'<>'not_provided' and mins between 0 and 1440),'Invalid activity duration');
  perform ops_intake_private.assert(jsonb_typeof(a->'source_refs')='array' and jsonb_array_length(a->'source_refs')>0,'Activity evidence required');
  for source_ref in select jsonb_array_elements_text(a->'source_refs') loop perform ops_intake_private.assert(exists(select 1 from jsonb_array_elements(export->'sources')v where v->>'source_ref'=source_ref),'Missing activity source');end loop;
  insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
   values('task',taskid,'task_work_recorded',actor,a->>'summary',jsonb_build_object('session_id',p_session,'activity',a));
  insert into ops_intake_private.items values(p_session,'activity',ref,a,taskid);
  activity_result:=activity_result||jsonb_build_array(jsonb_build_object('activity_ref',ref,'task_id',taskid,'result','imported'));
 end loop;
 receipt:=jsonb_build_object('schema_version','oaktown.task-receipt.v1','session_id',p_session,'batch_ref',export->>'batch_ref','saved_at',stamp,'proposals',result,'activities',activity_result,
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'task_title',t.task_title,'status',t.status,'priority',t.priority,
   'workflow_key',t.workflow_key,'property_id',t.property_id,'unit_id',t.unit_id,'tenancy_id',t.tenancy_id,'renewal_case_id',t.renewal_case_id,
   'updated_at',t.updated_at,'intake_details',t.intake_details,
   'context_label',case when t.workflow_key='general' then 'General operations' else concat_ws(' · ',pr.street_address,u.unit_label) end))
   from public.ops_tasks t left join public.properties pr on pr.id=t.property_id left join public.units u on u.id=t.unit_id
   where t.id in (select (v->>'task_id')::uuid from jsonb_array_elements(result||activity_result)v)),'[]'));
 insert into ops_intake_private.receipts values(p_session,export->>'batch_ref',p_payload,receipt,stamp);
 return receipt;
end $$;
revoke all on all functions in schema ops_intake_private from public,anon,authenticated;
grant execute on function ops_intake_private.run(text,uuid,jsonb) to authenticated;
create function public.ops_task_intake(p_action text,p_session uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select ops_intake_private.run(p_action,p_session,p_payload)
$$;
revoke all on function public.ops_task_intake(text,uuid,jsonb) from public,anon;
grant execute on function public.ops_task_intake(text,uuid,jsonb) to authenticated;
commit;
