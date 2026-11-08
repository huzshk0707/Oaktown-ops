-- Reversible ONLY before any Master Backlog tasks have been imported.
-- Disposable rollback test requires oaktown_portfolio_ci; production review required.
begin;
do $guard$ begin
 if exists(select 1 from public.ops_tasks where task_code is not null or parent_task_id is not null)
   or exists(select 1 from ops_intake_private.master_backlog_imports)
 then
  raise exception 'Cannot drop task hierarchy/import schema after import; preserve business data';
 end if;
end $guard$;
revoke all on function public.ops_master_backlog_import(text,jsonb,text,boolean) from authenticated;
drop function public.ops_master_backlog_import(text,jsonb,text,boolean);
drop table ops_intake_private.master_backlog_imports;
drop trigger ops_task_guard_parent on public.ops_tasks;
drop function public.ops_task_check_parent_chain();
drop index public.ops_task_parent_idx;
drop index public.ops_task_code_unique;
alter table public.ops_tasks
 drop constraint ops_task_parent_fk,
 drop constraint ops_task_parent_not_self,
 drop constraint ops_task_code_format,
 drop column parent_task_id,
 drop column task_code;
commit;
