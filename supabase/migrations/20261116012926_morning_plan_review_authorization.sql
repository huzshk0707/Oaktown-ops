-- Staged Phase 6: proposals are not approvals. Apply only after release review.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

alter table ops_agent_private.clients
 add column can_read_plans boolean not null default false,
 add column can_submit_plans boolean not null default false,
 add constraint ops_plan_submit_requires_read check(not can_submit_plans or can_read_plans);

-- Review infrastructure only. public.ops_events remains the approved SOD store.
create table ops_agent_private.plan_requests(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id),
 client_id text references ops_agent_private.clients(client_id),
 origin_session_id uuid not null,
 request_ref text not null check(request_ref ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
 request jsonb not null,
 expected_event_id uuid,
 work_date date not null,
 event_id uuid not null unique default gen_random_uuid(),
 event_body jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '30 minutes',
 review_token uuid,
 review_session_id uuid,
 reviewer_id uuid,
 reviewed_at timestamptz,
 approved_at timestamptz,
 receipt jsonb,
 unique nulls not distinct(actor_id,client_id,request_ref)
);
alter table ops_agent_private.plan_requests enable row level security;
revoke all on ops_agent_private.plan_requests from public,anon,authenticated,oaktown_task_agent;
create index ops_plan_requests_client_idx on ops_agent_private.plan_requests(client_id);
create index ops_plan_requests_actor_idx on ops_agent_private.plan_requests(actor_id,created_at desc);
create index ops_plan_requests_day_idx on ops_agent_private.plan_requests(work_date,approved_at desc,event_id desc) where receipt is not null;
-- An approval can have only one successor, including the initial NULL head.
-- This also prevents a stale repeatable-read transaction from forking a day.
create unique index ops_plan_requests_successor_idx on ops_agent_private.plan_requests(work_date,expected_event_id) nulls not distinct where receipt is not null;

-- A new domain grant never inherits an old task-only OAuth consent.
create table ops_agent_private.plan_consents(
 actor_id uuid not null references auth.users(id),
 client_id text not null references ops_agent_private.clients(client_id),
 can_read_plans boolean not null default false,
 can_submit_plans boolean not null default false,
 recorded_at timestamptz not null default clock_timestamp(),
 revoked_at timestamptz,
 primary key(actor_id,client_id),
 check(not can_submit_plans or can_read_plans)
);
alter table ops_agent_private.plan_consents enable row level security;
revoke all on ops_agent_private.plan_consents from public,anon,authenticated,oaktown_task_agent;
create index ops_plan_consents_client_idx on ops_agent_private.plan_consents(client_id);
create function ops_agent_private.reset_plan_consents() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update ops_agent_private.plan_consents set can_read_plans=false,can_submit_plans=false,
 revoked_at=clock_timestamp(),recorded_at=clock_timestamp() where client_id=new.client_id;
 return new;
end$$;
revoke all on function ops_agent_private.reset_plan_consents() from public,anon,authenticated,oaktown_task_agent;
create trigger ops_reset_plan_consents after update of enabled,can_read_plans,can_submit_plans on ops_agent_private.clients
for each row when(old.enabled is distinct from new.enabled or old.can_read_plans is distinct from new.can_read_plans or old.can_submit_plans is distinct from new.can_submit_plans)
execute function ops_agent_private.reset_plan_consents();

create function ops_agent_private.plan_hash(value jsonb) returns text
language sql immutable security invoker set search_path='' as $$
 select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(value::text,'UTF8')),'hex')
$$;
revoke all on function ops_agent_private.plan_hash(jsonb) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.plan_context() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
 actor uuid:=auth.uid(); membership text; sid uuid; client ops_agent_private.clients%rowtype;
 session_record auth.sessions%rowtype; grant_record ops_agent_private.plan_consents%rowtype;
begin
 if actor is null or c->>'sub' is distinct from actor::text or c->>'is_anonymous' is distinct from 'false'
  or coalesce(c->>'session_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 then raise exception 'An active staff session is required' using errcode='42501';end if;
 select role into membership from public.staff_memberships where user_id=actor and is_active for share;
 if not found then raise exception 'Active staff access required' using errcode='42501';end if;
 sid:=(c->>'session_id')::uuid;
 select * into session_record from auth.sessions where id=sid and user_id=actor and (not_after is null or not_after>clock_timestamp()) for share;
 if not found then raise exception 'Staff session expired or revoked' using errcode='42501';end if;
 if c->>'role'='oaktown_task_agent' then
  if membership not in ('admin','editor') or c->>'aud' is distinct from 'https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp'
  then raise exception 'Scoped staff connection required' using errcode='42501';end if;
  perform 1 from auth.oauth_consents where user_id=actor and client_id::text=c->>'client_id' and revoked_at is null for share;
  if not found then raise exception 'OAuth consent expired or revoked' using errcode='42501';end if;
  select * into client from ops_agent_private.clients where client_id=c->>'client_id' for share;
  if not found or not client.enabled then raise exception 'Connection disabled' using errcode='42501';end if;
  select * into grant_record from ops_agent_private.plan_consents where actor_id=actor and client_id=client.client_id and revoked_at is null for share;
  client.can_read_plans:=client.can_read_plans and coalesce(grant_record.can_read_plans,false);
  client.can_submit_plans:=client.can_submit_plans and coalesce(grant_record.can_submit_plans,false);
 elsif c->>'role' is distinct from 'authenticated' or nullif(c->>'client_id','') is not null
   or nullif(to_jsonb(session_record)->>'oauth_client_id','') is not null
 then raise exception 'Use a native staff session for review' using errcode='42501';
 end if;
 return jsonb_build_object('actor',actor,'session',sid,'role',c->>'role','staff_role',membership,
  'client_id',client.client_id,'can_read_plans',coalesce(client.can_read_plans,false),'can_submit_plans',coalesce(client.can_submit_plans,false));
end$$;
revoke all on function ops_agent_private.plan_context() from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.plan_validate(p jsonb,lock_tasks boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
declare r jsonb; s jsonb; t public.ops_tasks%rowtype; calendar date; k text;
begin
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>90000
  or p->>'schema_version' is distinct from 'oaktown.sod-draft.v1'
  or coalesce(p->>'planId','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  or jsonb_typeof(p->'revision') is distinct from 'number' or coalesce(p->>'revision','') !~ '^[0-9]{1,9}$'
  or coalesce(p->>'workDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(p->'text') is distinct from 'string' or length(btrim(p->>'text')) not between 1 and 90000
  or jsonb_typeof(p->'rows') is distinct from 'array' or jsonb_array_length(p->'rows')>50
  or jsonb_typeof(p->'sources') is distinct from 'object' or jsonb_typeof(p->'stale') is distinct from 'array' or p->'stale'<>'[]'::jsonb
  or p->>'greeting' not in ('normal','weekend') or jsonb_typeof(p->'greeting') is distinct from 'string'
  or jsonb_typeof(p->'extras') is distinct from 'string' or jsonb_typeof(p->'constants') is distinct from 'array'
  or exists(select 1 from jsonb_object_keys(p) x where x not in ('schema_version','planId','revision','workDate','text','rows','sources','stale','greeting','extras','constants'))
 then raise exception 'Invalid SOD envelope or unresolved sources' using errcode='22023';end if;
 begin calendar:=(p->>'workDate')::date;exception when others then raise exception 'Invalid plan date' using errcode='22023';end;
 if to_char(calendar,'YYYY-MM-DD')<>p->>'workDate' then raise exception 'Invalid plan date' using errcode='22023';end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(p->'rows')) then raise exception 'Duplicate plan rows' using errcode='22023';end if;
 for r in select value from jsonb_array_elements(p->'rows') order by value->>'id' loop
  s:=p->'sources'->(r->>'sourceId');
  if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'id') is distinct from 'string' or length(r->>'id') not between 1 and 200
   or r->>'type' not in ('task','planning') or jsonb_typeof(r->'type') is distinct from 'string'
   or jsonb_typeof(r->'subject') is distinct from 'string' or length(btrim(r->>'subject')) not between 1 and 220
   or jsonb_typeof(r->'action') is distinct from 'string' or length(btrim(r->>'action')) not between 1 and 820
   or r->>'section' not in ('Immediate priorities','Deposits and payments','Property operations','Staff assignments','Pending and blocked','Additional work')
   or jsonb_typeof(r->'section') is distinct from 'string' or jsonb_typeof(s) is distinct from 'object'
   or jsonb_typeof(s->'label') is distinct from 'string' or length(btrim(s->>'label')) not between 1 and 500
  then raise exception 'Invalid source-cited plan row' using errcode='22023';end if;
  if r->>'type'='task' then
   if coalesce(r->>'id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or nullif(r->>'updatedAt','') is null
    or r->>'id' is distinct from ((r->>'id')::uuid)::text or s->>'kind' is distinct from 'saved_task' or s->>'taskId' is distinct from r->>'id'
   then raise exception 'Saved task identity and version required' using errcode='22023';end if;
   if lock_tasks then select * into t from public.ops_tasks where id=(r->>'id')::uuid for share;
   else select * into t from public.ops_tasks where id=(r->>'id')::uuid;end if;
   if not found or t.archived_at is not null or t.status in ('completed','cancelled')
    or t.updated_at is distinct from (r->>'updatedAt')::timestamptz
    or t.updated_at is distinct from (s->>'version')::timestamptz
   then raise exception 'A saved task changed or is no longer active; prepare a new review' using errcode='40001';end if;
  end if;
 end loop;
 for r in select value from jsonb_array_elements(p->'constants') loop
  if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'text') is distinct from 'string'
  then raise exception 'Invalid recurring plan responsibility' using errcode='22023';end if;
 end loop;
end$$;
revoke all on function ops_agent_private.plan_validate(jsonb,boolean) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.plan_from_agent(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare rows jsonb:='[]'; sources jsonb:='{}'; r jsonb; t public.ops_tasks%rowtype; sid text; item_id uuid; plan_id uuid:=gen_random_uuid();
begin
 if exists(select 1 from jsonb_object_keys(p) x where x not in ('request_ref','expected_approval_id','work_date','text','tasks','planning_items'))
  or jsonb_typeof(p->'work_date') is distinct from 'string' or jsonb_typeof(p->'text') is distinct from 'string'
  or length(btrim(p->>'text')) not between 1 and 24000 or jsonb_typeof(p->'tasks') is distinct from 'array'
  or jsonb_typeof(p->'planning_items') is distinct from 'array' or jsonb_array_length(p->'tasks')+jsonb_array_length(p->'planning_items')>50
 then raise exception 'Invalid proposed daily plan' using errcode='22023';end if;
 for r in select value from jsonb_array_elements(p->'tasks') loop
  if jsonb_typeof(r) is distinct from 'object' or exists(select 1 from jsonb_object_keys(r) x where x not in ('task_id','expected_updated_at','action','section'))
   or coalesce(r->>'task_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  then raise exception 'Exact saved task reference required' using errcode='22023';end if;
  select * into t from public.ops_tasks where id=(r->>'task_id')::uuid;
  if not found then raise exception 'Saved task unavailable' using errcode='P0002';end if;
  sid:='task:'||t.id;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',t.id,'type','task','code',coalesce(to_jsonb(t)->>'task_code',''),'subject',t.task_title,
   'action',r->>'action','section',r->>'section','updatedAt',r->>'expected_updated_at','sourceId',sid));
  sources:=sources||jsonb_build_object(sid,jsonb_build_object('id',sid,'label',coalesce(to_jsonb(t)->>'task_code',t.task_title),'kind','saved_task',
   'taskId',t.id,'version',t.updated_at,'verification','Saved task record; source facts still require review'));
 end loop;
 for r in select value from jsonb_array_elements(p->'planning_items') loop
  if jsonb_typeof(r) is distinct from 'object' or exists(select 1 from jsonb_object_keys(r) x where x not in ('title','action','section','source_ref','source_note'))
   or jsonb_typeof(r->'source_ref') is distinct from 'string' or length(btrim(r->>'source_ref')) not between 1 and 240
   or jsonb_typeof(r->'source_note') is distinct from 'string' or length(btrim(r->>'source_note')) not between 1 and 2000
  then raise exception 'Planning-only work needs a source reference and note' using errcode='22023';end if;
  item_id:=gen_random_uuid();sid:='manual:'||item_id;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',item_id,'type','planning','subject',r->>'title','action',r->>'action','section',r->>'section','sourceId',sid));
  sources:=sources||jsonb_build_object(sid,jsonb_build_object('id',sid,'label',r->>'source_ref','kind','manual_chatgpt','originRef',r->>'source_ref',
   'body',r->>'source_note','verification','ChatGPT-provided context; not independently verified'));
 end loop;
 return jsonb_build_object('schema_version','oaktown.sod-draft.v1','planId',plan_id,'revision',1,'workDate',p->>'work_date','text',p->>'text',
  'rows',rows,'sources',sources,'stale','[]'::jsonb,'greeting','normal','extras','','constants','[]'::jsonb);
end$$;
revoke all on function ops_agent_private.plan_from_agent(jsonb) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.plan_latest(day date) returns uuid
language sql stable security invoker set search_path='' as $$
 select p.event_id from ops_agent_private.plan_requests p where p.work_date=day and p.receipt is not null
 and not exists(select 1 from ops_agent_private.plan_requests n where n.work_date=day and n.expected_event_id=p.event_id and n.receipt is not null)
 order by p.approved_at desc,p.event_id desc limit 1
$$;
revoke all on function ops_agent_private.plan_latest(date) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.plan_event(p ops_agent_private.plan_requests) returns jsonb
language sql stable security invoker set search_path='' as $$
 select to_jsonb(e)||jsonb_build_object('review_proof',jsonb_build_object('schema_version','oaktown.sod-review.v1','event_id',e.id,
 'request_id',p.id,'reviewer_id',p.reviewer_id,'reviewed_at',p.reviewed_at,'content_hash',ops_agent_private.plan_hash(p.event_body),'channel','native_staff_review'))
 from public.ops_events e where p.receipt is not null and e.id=p.event_id and e.actor_id=p.reviewer_id
 and e.entity_type=p.event_body->>'entity_type' and e.entity_id=(p.event_body->>'entity_id')::uuid
 and e.event_type=p.event_body->>'event_type' and e.summary=p.event_body->>'summary' and e.event_metadata=p.event_body->'event_metadata'
$$;
revoke all on function ops_agent_private.plan_event(ops_agent_private.plan_requests) from public,anon,authenticated,oaktown_task_agent;

create function ops_agent_private.guard_plan_approval() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.event_type='morning_plan_approved_v1' then
  if not exists(select 1 from ops_agent_private.plan_requests p where p.event_id=new.id and p.approved_at is not null
   and p.reviewer_id=auth.uid() and p.review_session_id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb)->>'session_id'
   and new.actor_id=p.reviewer_id and new.entity_type=p.event_body->>'entity_type' and new.entity_id=(p.event_body->>'entity_id')::uuid
   and new.event_metadata=p.event_body->'event_metadata' and new.summary=p.event_body->>'summary')
  then raise exception 'SOD approval requires the native staff review operation' using errcode='42501';end if;
 end if;
 return new;
end$$;
revoke all on function ops_agent_private.guard_plan_approval() from public,anon,authenticated,oaktown_task_agent;
create trigger ops_plan_approval_guard before insert on public.ops_events for each row execute function ops_agent_private.guard_plan_approval();

create function ops_agent_private.morning_plan(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<plan_run>>
declare ctx jsonb:=ops_agent_private.plan_context(); actor uuid:=(ctx->>'actor')::uuid; native boolean:=ctx->>'role'='authenticated';
 p ops_agent_private.plan_requests%rowtype; c ops_agent_private.clients%rowtype; body jsonb; plan jsonb; prior uuid; day date;
 sid uuid:=(ctx->>'session')::uuid; result jsonb; rows jsonb; pos integer; client_key text:=ctx->>'client_id';
begin
 if action is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>95000
 then raise exception 'Invalid plan request' using errcode='22023';end if;
 if not native and action not in ('head','list','get','submit','status') then raise exception 'OAuth clients cannot review or approve plans' using errcode='42501';end if;
 if not native and ((action in ('head','list','get') and not (ctx->>'can_read_plans')::boolean) or (action in ('submit','status') and not (ctx->>'can_submit_plans')::boolean))
 then raise exception 'This client has no approved plan capability or native user consent' using errcode='42501';end if;
 if action in ('configure','consent','prepare','review','approve','pending') and (not native or ctx->>'staff_role' not in ('admin','editor'))
 then raise exception 'Native staff editor review required' using errcode='42501';end if;
 if action='my_connections' then
  if payload<>'{}'::jsonb then raise exception 'Invalid connection lookup' using errcode='22023';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('client_id',c.client_id,'label',c.label,'enabled',c.enabled,'can_read_plans',c.can_read_plans,'can_submit_plans',c.can_submit_plans,
   'my_can_read_plans',coalesce(pc.can_read_plans and pc.revoked_at is null,false),'my_can_submit_plans',coalesce(pc.can_submit_plans and pc.revoked_at is null,false)) order by c.label)
   from ops_agent_private.clients c join auth.oauth_consents ac on ac.client_id::text=c.client_id and ac.user_id=actor and ac.revoked_at is null
   left join ops_agent_private.plan_consents pc on pc.client_id=c.client_id and pc.actor_id=actor),'[]');
 elsif action='consent' then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('client_id','can_read_plans','can_submit_plans','confirmed'))
   or jsonb_typeof(payload->'client_id') is distinct from 'string' or payload->'confirmed' is distinct from 'true'::jsonb
   or jsonb_typeof(payload->'can_read_plans') is distinct from 'boolean' or jsonb_typeof(payload->'can_submit_plans') is distinct from 'boolean'
   or payload->'can_submit_plans'='true'::jsonb and payload->'can_read_plans'<>'true'::jsonb
  then raise exception 'Explicit native plan consent required' using errcode='22023';end if;
  select * into c from ops_agent_private.clients where client_id=payload->>'client_id' for share;
  if not found then raise exception 'Connection not registered' using errcode='P0002';end if;
  if payload->'can_read_plans'='true'::jsonb or payload->'can_submit_plans'='true'::jsonb then
   if not c.enabled or (payload->'can_read_plans'='true'::jsonb and not c.can_read_plans) or (payload->'can_submit_plans'='true'::jsonb and not c.can_submit_plans)
   then raise exception 'Requested plan permission is not enabled for this client' using errcode='42501';end if;
   perform 1 from auth.oauth_consents where user_id=actor and client_id::text=c.client_id and revoked_at is null for share;
   if not found then raise exception 'Complete the OAuth connection first' using errcode='42501';end if;
  end if;
  insert into ops_agent_private.plan_consents(actor_id,client_id,can_read_plans,can_submit_plans,recorded_at,revoked_at)
   values(actor,c.client_id,(payload->>'can_read_plans')::boolean,(payload->>'can_submit_plans')::boolean,clock_timestamp(),case when payload->'can_read_plans'='false'::jsonb then clock_timestamp() else null end)
   on conflict(actor_id,client_id) do update set can_read_plans=excluded.can_read_plans,can_submit_plans=excluded.can_submit_plans,recorded_at=excluded.recorded_at,revoked_at=excluded.revoked_at;
  insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
   values('staff_connection',actor,'plan_connection_consent_recorded',actor,'Staff reviewed scoped plan access',jsonb_build_object('client_id',c.client_id,'can_read_plans',payload->'can_read_plans','can_submit_plans',payload->'can_submit_plans'));
  return jsonb_build_object('client_id',c.client_id,'actor_id',actor,'can_read_plans',payload->'can_read_plans','can_submit_plans',payload->'can_submit_plans','saved',true);
 elsif action in ('configure','capabilities') then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('client_id','can_read_plans','can_submit_plans'))
   or jsonb_typeof(payload->'client_id') is distinct from 'string'
  then raise exception 'Choose an existing task client' using errcode='22023';end if;
  select * into c from ops_agent_private.clients where client_id=payload->>'client_id' for update;
  if not found then raise exception 'Register the task client first' using errcode='P0002';end if;
  if action='configure' then
   if ctx->>'staff_role'<>'admin' or not native then raise exception 'Native administrator required' using errcode='42501';end if;
   if jsonb_typeof(payload->'can_read_plans') is distinct from 'boolean' or jsonb_typeof(payload->'can_submit_plans') is distinct from 'boolean'
    or payload->'can_submit_plans'='true'::jsonb and payload->'can_read_plans'<>'true'::jsonb
   then raise exception 'Plan submission requires explicit plan read permission' using errcode='22023';end if;
   insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata) values('staff_connection',actor,'plan_client_capabilities_changed',actor,'Staff changed scoped plan capabilities',jsonb_build_object('client_id',c.client_id,'before',jsonb_build_object('can_read_plans',c.can_read_plans,'can_submit_plans',c.can_submit_plans),'after',jsonb_build_object('can_read_plans',payload->'can_read_plans','can_submit_plans',payload->'can_submit_plans')));
   update ops_agent_private.clients set can_read_plans=(payload->>'can_read_plans')::boolean,can_submit_plans=(payload->>'can_submit_plans')::boolean,
    updated_by=actor,updated_at=clock_timestamp() where client_id=c.client_id returning * into c;
  end if;
  return jsonb_build_object('client_id',c.client_id,'enabled',c.enabled,'can_read_plans',c.can_read_plans,'can_submit_plans',c.can_submit_plans,
   'my_can_read_plans',coalesce((select pc.can_read_plans and pc.revoked_at is null from ops_agent_private.plan_consents pc where pc.actor_id=actor and pc.client_id=c.client_id),false),
   'my_can_submit_plans',coalesce((select pc.can_submit_plans and pc.revoked_at is null from ops_agent_private.plan_consents pc where pc.actor_id=actor and pc.client_id=c.client_id),false));
 elsif action in ('head','list','get') then
  if action='head' then
   if exists(select 1 from jsonb_object_keys(payload) x where x<>'work_date') or coalesce(payload->>'work_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   then raise exception 'Valid plan date required' using errcode='22023';end if;
   day:=(payload->>'work_date')::date;prior:=ops_agent_private.plan_latest(day);
   select * into p from ops_agent_private.plan_requests where event_id=prior and receipt is not null;
   return jsonb_build_object('schema_version','oaktown.daily-plan-head.v1','work_date',day,'approval_id',prior,'event',case when prior is null then null else ops_agent_private.plan_event(p) end);
  end if;
  if action='get' then
   if exists(select 1 from jsonb_object_keys(payload) x where x<>'event_id') then raise exception 'Invalid event lookup' using errcode='22023';end if;
   select * into p from ops_agent_private.plan_requests where event_id=(payload->>'event_id')::uuid and receipt is not null;
   if not found then raise exception 'Server-reviewed approval not found' using errcode='P0002';end if;
   result:=ops_agent_private.plan_event(p);if result is null then raise exception 'Review proof does not match journal' using errcode='40001';end if;
   return result;
  end if;
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('work_date','offset','reviewer_id')) or coalesce(payload->>'work_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then raise exception 'Valid Eastern plan date required' using errcode='22023';end if;
  day:=(payload->>'work_date')::date;pos:=coalesce((payload->>'offset')::integer,0);
  if pos<0 or pos>10000 then raise exception 'Invalid history offset' using errcode='22023';end if;
  select coalesce(jsonb_agg(x.event order by x.approved_at desc,x.event_id desc),'[]') into rows from
   (select ops_agent_private.plan_event(q) event,q.approved_at,q.event_id from ops_agent_private.plan_requests q where work_date=day and receipt is not null
    and (not(payload ? 'reviewer_id') or q.reviewer_id=(payload->>'reviewer_id')::uuid) order by approved_at desc,event_id desc limit 100 offset pos)x where x.event is not null;
  return rows;
 elsif action in ('prepare','submit') then
  if (native and action<>'prepare') or (not native and action<>'submit') then raise exception 'Wrong plan submission channel' using errcode='42501';end if;
  if coalesce(payload->>'request_ref','') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$' or not(payload ? 'expected_approval_id')
  then raise exception 'Immutable request reference and expected approval ID required' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('sod-request:'||actor::text||':'||coalesce(client_key,'native')||':'||(payload->>'request_ref'),0));
  select * into p from ops_agent_private.plan_requests q where q.actor_id=actor and q.client_id is not distinct from client_key and q.request_ref=payload->>'request_ref' for update;
  if found then
   if p.request is distinct from payload then raise exception 'Request reference reused with different content' using errcode='22023';end if;
  else
   if native then
    if exists(select 1 from jsonb_object_keys(payload) x where x not in ('request_ref','expected_approval_id','plan')) then raise exception 'Invalid native plan proposal' using errcode='22023';end if;
    plan:=payload->'plan';
   else plan:=ops_agent_private.plan_from_agent(payload);end if;
   perform ops_agent_private.plan_validate(plan,false);day:=(plan->>'workDate')::date;prior:=(payload->>'expected_approval_id')::uuid;
   if ops_agent_private.plan_latest(day) is distinct from prior then raise exception 'Daily approval changed; retrieve the current plan and review again' using errcode='40001';end if;
   if (select count(*) from ops_agent_private.plan_requests q where q.actor_id=actor and receipt is null and expires_at>clock_timestamp())>=20
   then raise exception 'Finish or wait for pending plan reviews before submitting more' using errcode='22023';end if;
   insert into ops_agent_private.plan_requests(actor_id,client_id,origin_session_id,request_ref,request,expected_event_id,work_date,event_body)
    values(actor,client_key,sid,payload->>'request_ref',payload,prior,day,'{}') returning * into p;
   body:=jsonb_build_object('id',p.event_id,'entity_type','morning_plan','entity_id',plan->>'planId','event_type','morning_plan_approved_v1',
    'summary','Staff-approved morning plan for '||(plan->>'workDate'),'event_metadata',jsonb_build_object('schema_version','oaktown.morning-plan.v1',
    'plan_id',plan->>'planId','revision',plan->'revision','work_date',plan->>'workDate','plan',plan,'approval_contract','oaktown.sod-review.v1','review_request_id',p.id));
   update ops_agent_private.plan_requests set event_body=body where id=p.id returning * into p;
  end if;
  return jsonb_build_object('schema_version','oaktown.plan-submission.v1','proposal_id',p.id,'expires_at',p.expires_at,'state',case when p.receipt is null then 'pending_staff_review' else 'approved' end,
   'work_date',p.work_date,'text',p.event_body->'event_metadata'->'plan'->>'text','expected_approval_id',p.expected_event_id,'event_id',p.event_id,'content_hash',ops_agent_private.plan_hash(p.event_body),
   'approval_required',p.receipt is null,'receipt',p.receipt);
 elsif action='pending' then
  if payload<>'{}'::jsonb then raise exception 'Invalid pending review lookup' using errcode='22023';end if;
  return coalesce((select jsonb_agg(x.item order by x.created_at) from
   (select jsonb_build_object('proposal_id',id,'work_date',work_date,'created_at',created_at,'expires_at',expires_at,'from_chatgpt',client_id is not null,
    'text',event_body->'event_metadata'->'plan'->>'text') item,created_at from ops_agent_private.plan_requests where actor_id=actor and receipt is null and expires_at>clock_timestamp() order by created_at limit 20)x),'[]');
 elsif action in ('review','approve','status') then
  if exists(select 1 from jsonb_object_keys(payload) x where x not in ('proposal_id','review_token','confirmation','reviewed'))
  then raise exception 'Invalid review request' using errcode='22023';end if;
  select * into p from ops_agent_private.plan_requests where id=(payload->>'proposal_id')::uuid and actor_id=actor
   and (native or client_id=client_key) for update;
  if not found then raise exception 'Plan submission not found for this account' using errcode='P0002';end if;
  if action='status' then return jsonb_build_object('schema_version','oaktown.plan-submission.v1','proposal_id',p.id,
   'state',case when p.receipt is not null then 'approved' when p.expires_at<=clock_timestamp() then 'expired' else 'pending_staff_review' end,
   'receipt',p.receipt,'event',case when p.receipt is not null then ops_agent_private.plan_event(p) else null end);end if;
  if action='review' then
   if p.receipt is not null then return jsonb_build_object('approved',true,'event',ops_agent_private.plan_event(p));end if;
   if p.expires_at<=clock_timestamp() then raise exception 'Plan proposal expired; submit a fresh review' using errcode='22023';end if;
   perform ops_agent_private.plan_validate(p.event_body->'event_metadata'->'plan',false);
   update ops_agent_private.plan_requests set review_token=gen_random_uuid(),review_session_id=sid,reviewer_id=actor
    where id=p.id returning * into p;
   return jsonb_build_object('schema_version','oaktown.plan-review.v1','proposal_id',p.id,'review_token',p.review_token,'expires_at',p.expires_at,
    'event',p.event_body,'content_hash',ops_agent_private.plan_hash(p.event_body),'confirmation','APPROVE '||p.id);
  end if;
  if payload->'reviewed' is distinct from 'true'::jsonb or payload->>'review_token' is distinct from p.review_token::text or p.review_token is null
   or p.review_session_id is distinct from sid or p.reviewer_id is distinct from actor or payload->>'confirmation' is distinct from ('APPROVE '||p.id)
  then raise exception 'Exact native staff review confirmation required' using errcode='42501';end if;
  if p.receipt is not null then return jsonb_build_object('event',ops_agent_private.plan_event(p),'receipt',p.receipt,'replayed',true);end if;
  if p.expires_at<=clock_timestamp() then raise exception 'Plan proposal expired; submit a new review' using errcode='22023';end if;
  if p.client_id is not null then
   select * into c from ops_agent_private.clients where client_id=p.client_id and enabled and can_submit_plans and can_read_plans for share;
   if not found then raise exception 'Origin plan capability revoked' using errcode='42501';end if;
   perform 1 from ops_agent_private.plan_consents where actor_id=actor and client_id=p.client_id and can_read_plans and can_submit_plans and revoked_at is null for share;
   if not found then raise exception 'Origin native plan consent revoked' using errcode='42501';end if;
   perform 1 from auth.oauth_consents where user_id=actor and client_id::text=p.client_id and revoked_at is null for share;
   if not found then raise exception 'Origin OAuth consent revoked' using errcode='42501';end if;
   perform 1 from auth.sessions where id=p.origin_session_id and user_id=actor and (not_after is null or not_after>clock_timestamp()) for share;
   if not found then raise exception 'Origin session revoked' using errcode='42501';end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('sod-day:'||p.work_date::text,0));
  if ops_agent_private.plan_latest(p.work_date) is distinct from p.expected_event_id then raise exception 'Daily approval changed since review' using errcode='40001';end if;
  perform ops_agent_private.plan_validate(p.event_body->'event_metadata'->'plan',true);
  update ops_agent_private.plan_requests set reviewed_at=clock_timestamp(),approved_at=clock_timestamp() where id=p.id returning * into p;
  insert into public.ops_events(id,entity_type,entity_id,event_type,actor_id,summary,event_metadata)
   values(p.event_id,'morning_plan',(p.event_body->>'entity_id')::uuid,'morning_plan_approved_v1',actor,p.event_body->>'summary',p.event_body->'event_metadata');
  result:=jsonb_build_object('schema_version','oaktown.plan-approval-receipt.v1','proposal_id',p.id,'event_id',p.event_id,'reviewer_id',actor,
   'reviewed_at',p.reviewed_at,'saved_at',p.approved_at,'content_hash',ops_agent_private.plan_hash(p.event_body),'previous_event_id',p.expected_event_id);
  begin
   update ops_agent_private.plan_requests set receipt=result where id=p.id returning * into p;
  exception when unique_violation then raise exception 'A competing daily plan was approved first; review the latest plan' using errcode='40001';end;
  return jsonb_build_object('event',ops_agent_private.plan_event(p),'receipt',p.receipt,'replayed',false);
 end if;
 raise exception 'Unsupported plan operation' using errcode='22023';
end$$;
revoke all on function ops_agent_private.morning_plan(text,jsonb) from public,anon;
grant execute on function ops_agent_private.morning_plan(text,jsonb) to authenticated,oaktown_task_agent;

create function public.ops_morning_plan(action text,payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select ops_agent_private.morning_plan(action,payload)$$;
revoke all on function public.ops_morning_plan(text,jsonb) from public,anon;
grant execute on function public.ops_morning_plan(text,jsonb) to authenticated,oaktown_task_agent;
commit;
