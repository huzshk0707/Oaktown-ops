-- Disposable-only rollback smoke test. Run after master-backlog-import-check.sql.
\set ON_ERROR_STOP on
reset role;
do $ci$ begin
 if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;
 if (select count(*) from public.ops_tasks where task_code in('W03','M12','M13'))<>3
 then raise exception 'Fictional setup missing';end if;
end $ci$;
-- Clear only the fictional batch so the guarded rollback can be tested safely.
delete from ops_intake_private.master_backlog_imports where batch_ref='master-backlog-20991231';
delete from public.ops_events where event_type='master_backlog_imported'
 and entity_id in(select id from public.ops_tasks where task_code in('W03','M12','M13'));
delete from public.ops_tasks where task_code in('M12','M13');
delete from public.ops_tasks where task_code='W03';
\ir ../supabase/rollback/20261108050000_master_backlog_controlled_import.sql
do $ci$ begin
 if exists(select 1 from information_schema.columns where table_schema='public'
   and table_name='ops_tasks' and column_name in('task_code','parent_task_id'))
 then raise exception 'Rollback left hierarchy columns behind';end if;
 if to_regprocedure('public.ops_master_backlog_import(text,jsonb,text,boolean)') is not null
 then raise exception 'Rollback left import function behind';end if;
 if not exists(select 1 from public.ops_tasks where task_title='Prepare reviewed Unit 8 renewal')
 then raise exception 'Rollback damaged unrelated task history';end if;
end $ci$;
select 'Master Backlog schema rollback passed in disposable database' result;
