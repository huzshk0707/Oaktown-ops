-- Guarded rollback: never erase a plan request, review receipt or enabled grant.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$begin
 if exists(select 1 from ops_agent_private.plan_requests) or exists(select 1 from ops_agent_private.plan_consents)
  or exists(select 1 from ops_agent_private.clients where can_read_plans or can_submit_plans)
 then raise exception 'Plan review/configuration history exists; rollback requires a preservation/recovery plan';end if;
end$$;
drop trigger ops_reset_plan_consents on ops_agent_private.clients;
drop function ops_agent_private.reset_plan_consents();
drop trigger ops_plan_approval_guard on public.ops_events;
drop function public.ops_morning_plan(text,jsonb);
drop function ops_agent_private.morning_plan(text,jsonb);
drop function ops_agent_private.guard_plan_approval();
drop function ops_agent_private.plan_event(ops_agent_private.plan_requests);
drop function ops_agent_private.plan_latest(date);
drop function ops_agent_private.plan_from_agent(jsonb);
drop function ops_agent_private.plan_validate(jsonb,boolean);
drop function ops_agent_private.plan_context();
drop function ops_agent_private.plan_hash(jsonb);
drop table ops_agent_private.plan_requests;
drop table ops_agent_private.plan_consents;
alter table ops_agent_private.clients drop constraint ops_plan_submit_requires_read,
 drop column can_read_plans,drop column can_submit_plans;
commit;
