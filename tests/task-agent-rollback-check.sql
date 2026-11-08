\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable CI database required';end if;end$$;
-- The actual guarded script is tested against existing data in the separate
-- concurrency clone before this empty-schema rollback smoke check.
-- Only the fictional integration fixture is removed to test empty rollback.
delete from public.ops_events where event_type like 'task_%_from_chatgpt';
delete from ops_agent_private.proposals;
delete from public.ops_tasks where task_title='Fictional integration task';
delete from ops_agent_private.clients;
drop function ci.agent_identity(int,boolean,text);
revoke usage on schema ci from oaktown_task_agent;
\ir ../supabase/rollback/20261108061801_authenticated_task_connection.sql
do $$begin
 if to_regprocedure('public.ops_task_agent(text,jsonb)') is not null or exists(select 1 from pg_roles where rolname='oaktown_task_agent')
  or not exists(select 1 from public.ops_tasks where task_title='Prepare reviewed Unit 8 renewal')
 then raise exception 'Task connection rollback changed unrelated records or left privileges';end if;
end$$;
select 'Empty task connection rollback preserved existing task workflows' result;
