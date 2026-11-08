-- Narrow OAuth task access. Does not apply the staged Master Backlog migration.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create schema ops_agent_private;
revoke all on schema ops_agent_private from public,anon;
create role oaktown_task_agent nologin noinherit;
grant usage on schema public,ops_agent_private to authenticated,oaktown_task_agent;
grant usage on schema ops_agent_private to supabase_auth_admin;
grant oaktown_task_agent to authenticator;

create table ops_agent_private.clients(
 client_id text primary key check(length(client_id) between 1 and 200),
 label text not null check(length(btrim(label)) between 1 and 80),
 enabled boolean not null default false,
 can_write boolean not null default false,
 updated_by uuid not null,
 updated_at timestamptz not null default clock_timestamp()
);
create table ops_agent_private.proposals(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null,
 client_id text not null references ops_agent_private.clients(client_id),
 request_ref text not null,
 request jsonb not null,
 task_id uuid references public.ops_tasks(id) on delete set null,
 before_state jsonb not null,
 after_state jsonb not null,
 preview_token uuid not null default gen_random_uuid(),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 receipt jsonb,
 unique(actor_id,client_id,request_ref)
);
create index ops_agent_proposals_task_idx on ops_agent_private.proposals(task_id);
create index ops_agent_proposals_client_idx on ops_agent_private.proposals(client_id);
alter table ops_agent_private.clients enable row level security;
alter table ops_agent_private.proposals enable row level security;
revoke all on all tables in schema ops_agent_private from public,anon,authenticated,oaktown_task_agent;

-- Auth invokes this hook, never the browser or agent. Ordinary staff sessions
-- remain unchanged. Known OAuth clients get a role with no table or legacy RPC
-- privileges and an audience bound to this specific resource.
create function ops_agent_private.token_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare claims jsonb:=event->'claims'; client ops_agent_private.clients%rowtype;
begin
 if jsonb_typeof(claims) is distinct from 'object' then raise exception 'Invalid token event' using errcode='22023';end if;
 if nullif(claims->>'client_id','') is null then return event;end if;
 select * into client from ops_agent_private.clients where client_id=claims->>'client_id';
 if not found then return event;end if;
 if not client.enabled or not exists(select 1 from public.staff_memberships
   where user_id=(event->>'user_id')::uuid and is_active and role in ('admin','editor'))
 then raise exception 'Task connection is not authorized' using errcode='42501';end if;
 claims:=jsonb_set(claims,'{role}','"oaktown_task_agent"');
 claims:=jsonb_set(claims,'{aud}','"https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp"');
 return jsonb_set(event,'{claims}',claims);
end$$;
revoke all on function ops_agent_private.token_hook(jsonb) from public,anon,authenticated,oaktown_task_agent;
grant execute on function ops_agent_private.token_hook(jsonb) to supabase_auth_admin;
create function public.ops_task_agent_token_hook(event jsonb) returns jsonb
language sql security invoker set search_path='' as $$select ops_agent_private.token_hook(event)$$;
revoke all on function public.ops_task_agent_token_hook(jsonb) from public,anon,authenticated,oaktown_task_agent;
grant execute on function public.ops_task_agent_token_hook(jsonb) to supabase_auth_admin;

create function ops_agent_private.task_view(t public.ops_tasks) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',t.id,'task_code',to_jsonb(t)->>'task_code',
  'task_title',t.task_title,'status',t.status,'priority',t.priority,'updated_at',t.updated_at,
  'archived_at',t.archived_at,'property_id',t.property_id,'unit_id',t.unit_id,
  'lease_id',t.lease_id,'renewal_case_id',t.renewal_case_id,'assigned_label',t.assigned_label,
  'next_action',t.intake_details->>'next_action','waiting_on',t.intake_details->>'waiting_on',
  'blocked_reason',t.intake_details->>'blocked_reason','completion_summary',t.intake_details->>'completion_summary',
  'work_level',t.intake_details->>'work_level','due',t.intake_details->'due','due_at',t.due_at,
  'follow_up',t.intake_details->'follow_up');
$$;
revoke all on function ops_agent_private.task_view(public.ops_tasks) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.patch(before_state jsonb, changes jsonb, clears jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb:=before_state; k text; v jsonb; day date;
 allowed text[]:=array['task_title','status','priority','assigned_label','next_action','waiting_on','blocked_reason','completion_summary','work_level','due','follow_up'];
begin
 if jsonb_typeof(changes) is distinct from 'object' or jsonb_typeof(clears) is distinct from 'array'
  or changes='{}'::jsonb and clears='[]'::jsonb or jsonb_array_length(clears)>9
 then raise exception 'Nonempty changes and explicit clear fields required' using errcode='22023';end if;
 for k,v in select * from jsonb_each(changes) loop
  if not(k=any(allowed)) then raise exception 'Unsupported task field: %',k using errcode='22023';end if;
  if k in ('due','follow_up') then
   if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'date') is distinct from 'string'
     or coalesce(v->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or v->>'timezone' is distinct from 'America/New_York' or v->'time' is distinct from 'null'::jsonb
     or jsonb_typeof(v->'original_text') is distinct from 'string' or length(btrim(v->>'original_text')) not between 1 and 2000
     or exists(select 1 from jsonb_object_keys(v) x where x not in ('date','time','timezone','original_text'))
   then raise exception 'Dates require date-only Eastern values and original wording' using errcode='22023';end if;
   begin day:=(v->>'date')::date;exception when others then raise exception 'Invalid calendar date' using errcode='22023';end;
   if to_char(day,'YYYY-MM-DD')<>v->>'date' then raise exception 'Invalid calendar date' using errcode='22023';end if;
  elsif jsonb_typeof(v) is distinct from 'string' or length(btrim(v#>>'{}'))=0
    or length(v#>>'{}')>(case k when 'task_title' then 200 when 'work_level' then 90 when 'assigned_label' then 120 when 'waiting_on' then 120 when 'blocked_reason' then 1200 else 2000 end)
  then raise exception 'Invalid task text: %',k using errcode='22023';end if;
  result:=jsonb_set(result,array[k],v);
 end loop;
 if changes ? 'due' or clears ? 'due' then result:=jsonb_set(result,'{due_at}','null');end if;
 for v in select value from jsonb_array_elements(clears) loop
  k:=v#>>'{}';
  if jsonb_typeof(v)<>'string' or not(k=any(allowed)) or k in ('task_title','status','priority','work_level') or changes ? k
  then raise exception 'Invalid or conflicting clear field' using errcode='22023';end if;
  result:=jsonb_set(result,array[k],'null');
 end loop;
 if coalesce(result->>'status','') not in ('pending','in_progress','waiting','blocked','completed','cancelled')
  or coalesce(result->>'priority','') not in ('low','normal','high','urgent')
  or length(btrim(coalesce(result->>'task_title','')))=0
  or (result->>'status'='waiting' and length(btrim(coalesce(result->>'waiting_on','')))=0)
  or (result->>'status'<>'waiting' and nullif(btrim(result->>'waiting_on'),'') is not null)
  or (result->>'status'='blocked' and length(btrim(coalesce(result->>'blocked_reason','')))=0)
  or (result->>'status'<>'blocked' and nullif(btrim(result->>'blocked_reason'),'') is not null)
  or (result->>'status'='completed' and length(btrim(coalesce(result->>'completion_summary','')))=0)
 then raise exception 'Task status and details conflict; review required fields and explicit clears' using errcode='22023';end if;
 return result;
end$$;
revoke all on function ops_agent_private.patch(jsonb,jsonb,jsonb) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.run(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<agent_run>>
declare actor uuid:=auth.uid(); claims jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
 client ops_agent_private.clients%rowtype; proposal ops_agent_private.proposals%rowtype;
 task public.ops_tasks%rowtype; before_state jsonb; after_state jsonb; details jsonb;
 receipt jsonb; stat text; k text; id uuid; is_admin boolean; is_agent boolean;
begin
 if actor is null or claims->>'sub' is distinct from actor::text
 then raise exception 'Active staff editor access required' using errcode='42501';end if;
 perform 1 from public.staff_memberships where user_id=actor and is_active and role in ('admin','editor') for share;
 if not found then raise exception 'Active staff editor access required' using errcode='42501';end if;
 if action is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>24000
 then raise exception 'Invalid task request' using errcode='22023';end if;
 is_agent:=claims->>'role'='oaktown_task_agent';
 is_admin:=exists(select 1 from public.staff_memberships where user_id=actor and is_active and role='admin');
 if is_agent then
  if action not in ('search','get','history','preview','apply') then raise exception 'Task connection scope does not allow this operation' using errcode='42501';end if;
  if claims->>'aud' is distinct from 'https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp'
   or claims->>'is_anonymous' is distinct from 'false'
  then raise exception 'Valid resource-bound staff session required' using errcode='42501';end if;
  perform 1 from auth.sessions s where s.id=(claims->>'session_id')::uuid and s.user_id=actor and (s.not_after is null or s.not_after>clock_timestamp()) for share;
  if not found then raise exception 'Staff session expired or revoked' using errcode='42501';end if;
  perform 1 from auth.oauth_consents c where c.user_id=actor and c.client_id::text=claims->>'client_id' and c.revoked_at is null for share;
  if not found then raise exception 'OAuth grant revoked; reconnect in ChatGPT' using errcode='42501';end if;
  select * into client from ops_agent_private.clients where client_id=claims->>'client_id' for share;
  if not found or not client.enabled then raise exception 'Task connection disabled' using errcode='42501';end if;
 else
  if claims->>'role' is distinct from 'authenticated' or nullif(claims->>'client_id','') is not null
  then raise exception 'Use a scoped OAuth task connection' using errcode='42501';end if;
  if action not in ('connections','configure','activity','consent_client') then raise exception 'Agent operation requires scoped OAuth' using errcode='42501';end if;
 end if;
 if action='connections' then
  return jsonb_build_object('schema_version','oaktown.task-connection.v1','can_manage',is_admin,
   'clients',case when is_admin then coalesce((select jsonb_agg(to_jsonb(c) order by c.label) from ops_agent_private.clients c),'[]') else '[]'::jsonb end);
 elsif action='configure' then
  if not is_admin then raise exception 'Administrator access required' using errcode='42501';end if;
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('client_id','label','enabled','can_write'))
   or jsonb_typeof(payload->'client_id') is distinct from 'string' or coalesce(payload->>'client_id','')!~'^[A-Za-z0-9_-]{1,200}$'
   or jsonb_typeof(payload->'label') is distinct from 'string' or length(btrim(payload->>'label')) not between 1 and 80
   or jsonb_typeof(payload->'enabled') is distinct from 'boolean' or jsonb_typeof(payload->'can_write') is distinct from 'boolean'
  then raise exception 'Invalid OAuth client settings' using errcode='22023';end if;
  insert into ops_agent_private.clients(client_id,label,enabled,can_write,updated_by)
   values(payload->>'client_id',payload->>'label',(payload->>'enabled')::boolean,(payload->>'can_write')::boolean,actor)
   on conflict(client_id) do update set label=excluded.label,enabled=excluded.enabled,can_write=excluded.can_write,updated_by=actor,updated_at=clock_timestamp();
  return jsonb_build_object('saved',true);
 elsif action='consent_client' then
  select * into client from ops_agent_private.clients where client_id=payload->>'client_id' and enabled;
  if not found then raise exception 'This OAuth client is not enabled for Oaktown tasks' using errcode='42501';end if;
  return jsonb_build_object('label',client.label,'can_write',client.can_write);
 elsif action='activity' then
  return coalesce((select jsonb_agg(x.r order by x.created_at desc) from
    (select p.receipt as r,p.created_at from ops_agent_private.proposals p where p.actor_id=actor and p.receipt is not null order by p.created_at desc limit 20)x),'[]');
 end if;
 if action in ('preview','apply') and not client.can_write then raise exception 'This connection is read-only' using errcode='42501';end if;
 if action='search' then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('query','task_code'))
   or (payload ? 'query' and (jsonb_typeof(payload->'query')<>'string' or length(payload->>'query')>120))
   or (payload ? 'task_code' and (jsonb_typeof(payload->'task_code')<>'string' or payload->>'task_code'!~'^[MWA][0-9]{2}$'))
  then raise exception 'Invalid task search' using errcode='22023';end if;
  return coalesce((select jsonb_agg(x.item order by x.updated_at desc,x.id) from
    (select ops_agent_private.task_view(t) as item,t.updated_at,t.id from public.ops_tasks t
     where t.archived_at is null and (not(payload ? 'task_code') or to_jsonb(t)->>'task_code'=payload->>'task_code')
     and (not(payload ? 'query') or strpos(lower(t.task_title),lower(payload->>'query'))>0)
     order by t.updated_at desc,t.id limit 26)x),'[]');
 elsif action in ('get','history') then
  if exists(select 1 from jsonb_object_keys(payload) x where x<>'task_id') then raise exception 'Invalid task lookup' using errcode='22023';end if;
  select * into task from public.ops_tasks t where t.id=(payload->>'task_id')::uuid;
  if not found then raise exception 'Task not found' using errcode='P0002';end if;
  if action='get' then return ops_agent_private.task_view(task);end if;
  return coalesce((select jsonb_agg(x.item order by x.occurred_at desc,x.id) from
   (select jsonb_build_object('id',e.id,'event_type',e.event_type,'occurred_at',e.occurred_at,'actor_id',e.actor_id,'summary',e.summary) as item,e.occurred_at,e.id
    from public.ops_events e where entity_type='task' and entity_id=task.id order by occurred_at desc,id limit 50)x),'[]');
 elsif action='preview' then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('operation','request_ref','task_id','expected_updated_at','changes','clear_fields','source_note'))
   or coalesce(payload->>'operation','') not in ('create','update')
   or jsonb_typeof(payload->'request_ref') is distinct from 'string' or coalesce(payload->>'request_ref','')!~'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'
   or jsonb_typeof(payload->'source_note') is distinct from 'string' or length(btrim(payload->>'source_note')) not between 1 and 2000
  then raise exception 'Invalid reviewed proposal' using errcode='22023';end if;
  -- The same request reference is immutable, including after a lost response.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||client.client_id||':'||(payload->>'request_ref'),0));
  select * into proposal from ops_agent_private.proposals p where actor_id=actor and p.client_id=client.client_id and request_ref=payload->>'request_ref';
  if found then
   if proposal.request is distinct from payload then raise exception 'Request reference already used with different content' using errcode='22023';end if;
  else
   if payload->>'operation'='update' then
    select * into task from public.ops_tasks t where t.id=(payload->>'task_id')::uuid;
    if not found or task.archived_at is not null then raise exception 'Task missing or archived' using errcode='P0002';end if;
    if payload->>'expected_updated_at' is null or task.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz
    then raise exception 'Task changed; retrieve it and review again' using errcode='40001';end if;
    before_state:=ops_agent_private.task_view(task);
   else
    if payload ? 'task_id' or payload ? 'expected_updated_at' then raise exception 'Create cannot target an existing task' using errcode='22023';end if;
    before_state:=jsonb_build_object('status','pending','priority','normal');
   end if;
   after_state:=ops_agent_private.patch(before_state,payload->'changes',payload->'clear_fields');
   if after_state=before_state then raise exception 'No task changes to save' using errcode='22023';end if;
   insert into ops_agent_private.proposals(actor_id,client_id,request_ref,request,task_id,before_state,after_state)
    values(actor,client.client_id,payload->>'request_ref',payload,case when payload->>'operation'='update' then task.id else null end,before_state,after_state) returning * into proposal;
  end if;
  return jsonb_build_object('proposal_id',proposal.id,'preview_token',proposal.preview_token,'expires_at',proposal.expires_at,
   'operation',proposal.request->>'operation','before',proposal.before_state,'after',proposal.after_state,
   'changes',proposal.request->'changes','clear_fields',proposal.request->'clear_fields','source_note',proposal.request->>'source_note',
   'confirmation','APPLY '||proposal.id,'saved',proposal.receipt is not null);
 elsif action='apply' then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('proposal_id','preview_token','reviewed','confirmation'))
   or payload->'reviewed' is distinct from 'true'::jsonb
  then raise exception 'Explicit review approval required' using errcode='22023';end if;
  select * into proposal from ops_agent_private.proposals p where p.id=(payload->>'proposal_id')::uuid and p.actor_id=actor and p.client_id=client.client_id for update;
  if not found or payload->>'preview_token' is distinct from proposal.preview_token::text
   or payload->>'confirmation' is distinct from ('APPLY '||proposal.id)
  then raise exception 'Reviewed proposal unavailable' using errcode='22023';end if;
  if proposal.receipt is not null then return proposal.receipt||jsonb_build_object('replayed',true);end if;
  if proposal.expires_at<=clock_timestamp() then raise exception 'Proposal expired; prepare a fresh review' using errcode='22023';end if;
  after_state:=proposal.after_state;
  if proposal.request->>'operation'='update' then
   select * into task from public.ops_tasks t where t.id=proposal.task_id for update;
   if not found or task.archived_at is not null or task.updated_at is distinct from (proposal.before_state->>'updated_at')::timestamptz
   then raise exception 'Task changed since review; retrieve it and prepare a new proposal' using errcode='40001';end if;
   details:=task.intake_details;
   id:=task.id;
  else
   details:='{}';
   insert into public.ops_tasks(workflow_key,task_title,status,priority,assigned_user_id,source_task_key)
    values('general',after_state->>'task_title','pending','normal',actor,'task-agent:'||proposal.id) returning * into task;
   id:=task.id;
  end if;
  foreach k in array array['next_action','waiting_on','blocked_reason','completion_summary','work_level','due','follow_up'] loop
   if after_state ? k then
    if after_state->k='null'::jsonb then details:=details-k;else details:=jsonb_set(details,array[k],after_state->k);end if;
   end if;
  end loop;
  stat:=after_state->>'status';
  update public.ops_tasks t set task_title=after_state->>'task_title',status=stat,priority=after_state->>'priority',
   assigned_label=after_state->>'assigned_label',
   assigned_user_id=case when (after_state->>'assigned_label') is distinct from task.assigned_label then null else t.assigned_user_id end,
   intake_details=details,
   due_at=case when proposal.request->'changes' ? 'due' or proposal.request->'clear_fields' ? 'due' then null else t.due_at end,
   completed_at=case when stat='completed' then coalesce(t.completed_at,clock_timestamp()) else null end
   where t.id=agent_run.id returning * into task;
  insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
   values('task',id,'task_'||(proposal.request->>'operation')||'_from_chatgpt',actor,'Staff-approved task change from ChatGPT',
    jsonb_build_object('proposal_id',proposal.id,'client_id',client.client_id,'source_note',proposal.request->>'source_note',
     'changes',proposal.request->'changes','clear_fields',proposal.request->'clear_fields','before',proposal.before_state,'after',ops_agent_private.task_view(task)));
  receipt:=jsonb_build_object('schema_version','oaktown.task-agent-receipt.v1','proposal_id',proposal.id,'task_id',id,
    'actor_id',actor,'client_label',client.label,'operation',proposal.request->>'operation','task',ops_agent_private.task_view(task),'saved_at',clock_timestamp());
  update ops_agent_private.proposals set receipt=agent_run.receipt,task_id=agent_run.id where proposals.id=proposal.id;
  return receipt;
 end if;
 raise exception 'Unsupported task operation' using errcode='22023';
end$$;
revoke all on function ops_agent_private.run(text,jsonb) from public,anon;
grant execute on function ops_agent_private.run(text,jsonb) to authenticated,oaktown_task_agent;
create function public.ops_task_agent(action text,payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select ops_agent_private.run(action,payload)$$;
revoke all on function public.ops_task_agent(text,jsonb) from public,anon;
grant execute on function public.ops_task_agent(text,jsonb) to authenticated,oaktown_task_agent;
commit;
