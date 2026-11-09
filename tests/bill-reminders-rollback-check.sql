\set ON_ERROR_STOP on
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable CI database required';end if;end$$;
insert into ops_bill_private.rules(rule_key,label,recipient,day_from,day_through,kind,instructions,start_month,source_ref)
values('rollback-probe','Fictional reminder','Example Manager',2,2,'payment','Fictional rollback fixture.','2026-11-01','fictional-ci');
-- An expected guard error aborts the whole removal transaction.
\set ON_ERROR_STOP off
\ir ../supabase/rollback/monthly_bill_reminders.sql
\set ON_ERROR_STOP on
do $$begin
 if to_regprocedure('public.ops_bill_reminders()') is null or (select count(*) from ops_bill_private.rules where rule_key='rollback-probe')<>1
 then raise exception 'Nonempty rollback damaged reminder configuration';end if;
end$$;
delete from ops_bill_private.rules where rule_key='rollback-probe';
\ir ../supabase/rollback/monthly_bill_reminders.sql
do $$begin if exists(select 1 from pg_namespace where nspname='ops_bill_private') or to_regprocedure('public.ops_bill_reminders()') is not null
 then raise exception 'Empty rollback incomplete';end if;end$$;
