-- Disable this Auth hook in Supabase before a production rollback. Disabling a
-- client is the routine revocation route; dropping audit history is refused.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if exists(select 1 from ops_agent_private.proposals) or exists(select 1 from ops_agent_private.clients)
 then raise exception 'Task connection has configuration or proposal history; disable access instead of dropping it';end if;
end$$;
drop function public.ops_task_agent(text,jsonb);
drop function public.ops_task_agent_token_hook(jsonb);
drop schema ops_agent_private cascade;
revoke usage on schema public from oaktown_task_agent;
revoke oaktown_task_agent from authenticator;
drop role oaktown_task_agent;
commit;
