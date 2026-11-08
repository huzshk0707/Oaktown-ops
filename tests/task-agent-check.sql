\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable CI database required';end if;end$$;
-- Helpers set the same claims PostgREST obtains from a verified JWT. No real
-- staff credentials or production session identifiers are used in tests.
create or replace function ci.agent_identity(n int,agent boolean default true,client text default 'fictional-chatgpt') returns void
language plpgsql as $$begin
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-'||lpad(n::text,12,'0'),false);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-'||lpad(n::text,12,'0'),
  'role',case when agent then 'oaktown_task_agent' else 'authenticated' end,'is_anonymous',false,
  'client_id',case when agent then client else null end,
  'session_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa'||n,
  'aud',case when agent then 'https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp' else 'authenticated' end)::text,false);
end$$;
grant usage on schema ci to oaktown_task_agent;
grant execute on function ci.agent_identity(int,boolean,text) to authenticated,oaktown_task_agent;
set role authenticated;
select ci.agent_identity(2,false);
select public.ops_task_agent('configure','{"client_id":"fictional-chatgpt","label":"Fictional ChatGPT","enabled":true,"can_write":true}');
select public.ops_task_agent('configure','{"client_id":"fictional-readonly","label":"Fictional reader","enabled":true,"can_write":false}');
-- Browser roles cannot impersonate the scoped API or change tasks through it.
do $$begin
 begin perform public.ops_task_agent('search','{}');raise exception 'Browser bypassed scoped role';exception when insufficient_privilege then null;end;
end$$;
set role oaktown_task_agent;
select ci.agent_identity(1);
do $test$
declare p jsonb;r jsonb;replay jsonb;taskid uuid;before_count int;patch jsonb;v jsonb;
begin
 begin perform 1 from public.ops_tasks;raise exception 'Agent read raw table';exception when insufficient_privilege then null;end;
 begin perform 1 from ops_agent_private.proposals;raise exception 'Agent read private proposal ledger';exception when insufficient_privilege then null;end;
 begin perform public.ops_task_intake('new');raise exception 'Agent called legacy intake';exception when insufficient_privilege then null;end;
 begin perform public.ops_task_agent('configure','{}');raise exception 'Agent elevated its own permissions';exception when insufficient_privilege then null;end;
 p:=public.ops_task_agent('preview','{"operation":"create","request_ref":"fictional-create-1","source_note":"User requested a fictional document collection task","changes":{"task_title":"Fictional integration task","status":"in_progress","priority":"high","next_action":"Collect fictional documents","work_level":"Fictional operations"},"clear_fields":[]}');
 if p->>'saved'<>'false' or not p ? 'preview_token' then raise exception 'Preview response incomplete';end if;
 if jsonb_array_length(public.ops_task_agent('search','{"query":"Fictional integration task"}'))<>0 then raise exception 'Preview wrote a task';end if;
 begin perform public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',null,'confirmation',p->>'confirmation'));raise exception 'NULL approval bypass';exception when invalid_parameter_value then null;end;
 begin perform public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token','wrong','reviewed',true,'confirmation',p->>'confirmation'));raise exception 'Wrong token accepted';exception when invalid_parameter_value then null;end;
 patch:=jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation');
 r:=public.ops_task_agent('apply',patch);taskid:=(r->>'task_id')::uuid;
 if r->'task'->>'status'<>'in_progress' or r->'task'->>'next_action'<>'Collect fictional documents' or r->>'actor_id'<>'00000000-0000-4000-8000-000000000001' then raise exception 'Task receipt incorrect';end if;
 replay:=public.ops_task_agent('apply',patch);
 if replay->>'replayed'<>'true' or replay->>'task_id'<>r->>'task_id'
  or jsonb_array_length(public.ops_task_agent('search','{"query":"Fictional integration task"}'))<>1
  or jsonb_array_length(public.ops_task_agent('history',jsonb_build_object('task_id',taskid)))<>1
 then raise exception 'Retry created duplicate task/history';end if;
 if public.ops_task_agent('get',jsonb_build_object('task_id',taskid)) is distinct from r->'task' then raise exception 'Actual read-back differs';end if;
 p:=public.ops_task_agent('preview',jsonb_build_object('operation','update','request_ref','fictional-update-1','task_id',taskid,'expected_updated_at',r->'task'->>'updated_at',
  'source_note','User reports waiting for fictional coordinator','changes','{"status":"waiting","waiting_on":"Fictional coordinator"}'::jsonb,'clear_fields','[]'::jsonb));
 r:=public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation'));
 if r->'task'->>'waiting_on'<>'Fictional coordinator' then raise exception 'Waiting detail lost';end if;
 begin perform public.ops_task_agent('preview',jsonb_build_object('operation','update','request_ref','fictional-update-2','task_id',taskid,'expected_updated_at',r->'task'->>'updated_at',
  'source_note','User reports fictional reply','changes','{"status":"in_progress"}'::jsonb,'clear_fields','[]'::jsonb));raise exception 'Obsolete waiting detail silently retained';exception when invalid_parameter_value then null;end;
 p:=public.ops_task_agent('preview',jsonb_build_object('operation','update','request_ref','fictional-update-3','task_id',taskid,'expected_updated_at',r->'task'->>'updated_at',
  'source_note','User reports fictional reply','changes','{"status":"in_progress"}'::jsonb,'clear_fields','["waiting_on"]'::jsonb));
 r:=public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation'));
 if r->'task'->>'waiting_on' is not null then raise exception 'Approved clear not saved';end if;
 -- Unknown scope, dates, nullable edits and fabricated link/actor fields fail.
 for v in select value from jsonb_array_elements('[{"property_id":"00000000-0000-4000-8000-000000000001"},{"actor_id":"00000000-0000-4000-8000-000000000002"},{"next_action":null},{"status":"unknown"},{"due":{"date":"2099-02-30","time":null,"timezone":"America/New_York","original_text":"Invalid fictional date"}}]') loop
  begin perform public.ops_task_agent('preview',jsonb_build_object('operation','update','request_ref','fictional-invalid','task_id',taskid,'expected_updated_at',r->'task'->>'updated_at','source_note','Fictional validation','changes',v,'clear_fields','[]'::jsonb));raise exception 'Malformed fields accepted';exception when invalid_parameter_value then null;end;
 end loop;
 perform ci.agent_identity(1,true,'fictional-readonly');
 begin perform public.ops_task_agent('apply',patch);raise exception 'Read-only client wrote';exception when insufficient_privilege then null;end;
 perform public.ops_task_agent('get',jsonb_build_object('task_id',taskid));
 perform ci.agent_identity(2);
 begin perform public.ops_task_agent('apply',patch);raise exception 'Another actor replayed private proposal';exception when invalid_parameter_value then null;end;
 perform ci.agent_identity(3);
 begin perform public.ops_task_agent('search','{}');raise exception 'Viewer used integration';exception when insufficient_privilege then null;end;
 perform ci.agent_identity(4);
 begin perform public.ops_task_agent('search','{}');raise exception 'Inactive staff used integration';exception when insufficient_privilege then null;end;
 perform ci.agent_identity(5);
 begin perform public.ops_task_agent('search','{}');raise exception 'Unapproved account used integration';exception when insufficient_privilege then null;end;
end $test$;
reset role;
-- Server attribution, strict revocation and stale/expired proposal behavior.
select ci.agent_identity(1);
do $legacy$ declare t public.ops_tasks%rowtype;p jsonb;r jsonb;begin
 select * into t from public.ops_tasks where task_title='Fictional integration task';
 update public.ops_tasks set due_at='2099-01-10T15:00:00Z' where id=t.id returning * into t;
 r:=public.ops_task_agent('get',jsonb_build_object('task_id',t.id));
 if r->>'due_at' is null then raise exception 'Legacy recorded deadline hidden from review';end if;
 p:=public.ops_task_agent('preview',jsonb_build_object('operation','update','request_ref','fictional-legacy-clear','task_id',t.id,'expected_updated_at',t.updated_at,
  'source_note','User explicitly cleared the fictional legacy deadline','changes','{}'::jsonb,'clear_fields','["due"]'::jsonb));
 r:=public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation'));
 if r->'task'->>'due_at' is not null then raise exception 'Approved legacy deadline clear was not saved';end if;
end $legacy$;
do $stale$ declare t public.ops_tasks%rowtype;p jsonb;input jsonb;begin
 select * into t from public.ops_tasks where task_title='Fictional integration task';
 input:=jsonb_build_object('operation','update','request_ref','fictional-stale','task_id',t.id,'expected_updated_at',t.updated_at,'source_note','Fictional stale review','changes','{"priority":"urgent"}'::jsonb,'clear_fields','[]'::jsonb);
 p:=public.ops_task_agent('preview',input);
 update public.ops_tasks set notes='Fictional concurrent staff edit' where id=t.id;
 begin perform public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation'));raise exception 'Stale edit overwrote newer work';exception when serialization_failure then null;end;
 update ops_agent_private.proposals set expires_at=clock_timestamp()-interval '1 minute' where id=(p->>'proposal_id')::uuid;
 begin perform public.ops_task_agent('apply',jsonb_build_object('proposal_id',p->>'proposal_id','preview_token',p->>'preview_token','reviewed',true,'confirmation',p->>'confirmation'));raise exception 'Expired proposal saved';exception when invalid_parameter_value then null;end;
 update ops_agent_private.clients set enabled=false where client_id='fictional-chatgpt';
 begin perform public.ops_task_agent('search','{}');raise exception 'Disabled client read';exception when insufficient_privilege then null;end;
 update ops_agent_private.clients set enabled=true where client_id='fictional-chatgpt';
 update auth.sessions set not_after=clock_timestamp()-interval '1 minute' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
 begin perform public.ops_task_agent('search','{}');raise exception 'Revoked/expired session read';exception when insufficient_privilege then null;end;
 update auth.sessions set not_after=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
 update auth.oauth_consents set revoked_at=clock_timestamp() where user_id='00000000-0000-4000-8000-000000000001' and client_id='fictional-chatgpt';
 begin perform public.ops_task_agent('search','{}');raise exception 'Revoked OAuth consent read';exception when insufficient_privilege then null;end;
 update auth.oauth_consents set revoked_at=null where user_id='00000000-0000-4000-8000-000000000001' and client_id='fictional-chatgpt';
 if (select count(*) from public.ops_events where event_type like 'task_%_from_chatgpt')<>4 then raise exception 'Wrong audit event count';end if;
 if exists(select 1 from public.ops_events where event_type like 'task_%_from_chatgpt' and actor_id<>'00000000-0000-4000-8000-000000000001') then raise exception 'Forged attribution';end if;
end $stale$;
set role supabase_auth_admin;
do $hook$ declare e jsonb;r jsonb;begin
 e:='{"user_id":"00000000-0000-4000-8000-000000000001","claims":{"role":"authenticated","aud":"authenticated","client_id":"fictional-chatgpt"}}';
 r:=public.ops_task_agent_token_hook(e);
 if r->'claims'->>'role'<>'oaktown_task_agent' or r->'claims'->>'aud'<>'https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp' then raise exception 'OAuth token not narrowed';end if;
 e:=e#-'{claims,client_id}';
 if public.ops_task_agent_token_hook(e) is distinct from e then raise exception 'Ordinary staff login changed';end if;
end $hook$;
reset role;
set role anon;
do $$begin
 begin perform public.ops_task_agent('search','{}');raise exception 'Anonymous access';exception when insufficient_privilege then null;end;
 begin perform public.ops_task_agent_token_hook('{}');raise exception 'Anonymous hook access';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Scoped task API permission, approval, replay, stale-version, revocation and audit checks passed' result;
