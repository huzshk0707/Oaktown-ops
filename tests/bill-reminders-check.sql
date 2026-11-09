\set ON_ERROR_STOP on
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable CI database required';end if;end$$;
begin;
insert into ops_bill_private.rules(id,rule_key,label,recipient,day_from,day_through,kind,instructions,start_month,source_ref)
values('bbbbbbbb-0000-4000-8000-000000000001','fictional-card','Fictional Card','Example Manager',4,6,'payment','Review the current statement.',date_trunc('month',statement_timestamp() at time zone 'America/New_York')::date,'fictional-ci');
do $$begin
 if has_function_privilege('anon','public.ops_bill_reminders()','execute') or has_function_privilege('anon','public.ops_bill_reminder_record(uuid,date,text,integer,text)','execute')
 then raise exception 'Anonymous RPC grant';end if;
 if has_table_privilege('authenticated','ops_bill_private.rules','select') or has_table_privilege('authenticated','ops_bill_private.occurrences','update') or has_table_privilege('authenticated','ops_bill_private.events','insert')
 then raise exception 'Private reminder table is exposed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ops_bill_private' and c.relkind='r' and not c.relrowsecurity)
 then raise exception 'Missing reminder RLS';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ops_bill_%' and p.prosecdef)
 then raise exception 'Public reminder definer';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$declare snapshot jsonb; receipt jsonb; current_month date:=date_trunc('month',statement_timestamp() at time zone 'America/New_York')::date;begin
 snapshot:=public.ops_bill_reminders();if snapshot->>'can_edit'<>'true' or jsonb_array_length(snapshot->'rules')<>1 then raise exception 'Staff snapshot failed';end if;
 receipt:=public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'reminded',0,null);
 if receipt->>'revision'<>'1' or receipt->>'verified_at' is not null then raise exception 'Reminded was treated as paid';end if;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'verified',0,'Statement checked');raise exception 'Stale write accepted';exception when serialization_failure then null;end;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'verified',1,null);raise exception 'No-evidence verification accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month+1,'reminded',0,null);raise exception 'Nonmonthly date accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',(current_month+interval '2 months')::date,'reminded',0,null);raise exception 'Distant future confirmation accepted';exception when invalid_parameter_value then null;end;
 receipt:=public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'verified',1,'Example manager confirmed payment');
 if receipt->>'revision'<>'2' or receipt->>'verified_at' is null then raise exception 'Verification failed';end if;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'reminded',2,null);raise exception 'Verified state silently reset';exception when invalid_parameter_value then null;end;
 receipt:=public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',current_month,'reopened',2,'Need another statement check');
 if receipt->>'verified_at' is not null or receipt->>'reminded_at' is null then raise exception 'Reopening lost the reminder history';end if;
 receipt:=public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',(current_month+interval '1 month')::date,'reminded',0,null);
 if receipt->>'revision'<>'1' or receipt->>'verified_at' is not null then raise exception 'Confirmation leaked across months';end if;
end$$;
reset role;
do $$begin
 if (select count(*) from ops_bill_private.events)<>4 or exists(select 1 from ops_bill_private.events where actor_id<>'00000000-0000-4000-8000-000000000001'::uuid)
 then raise exception 'Missing, duplicate or forged reminder audit event';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$begin
 if public.ops_bill_reminders()->>'can_edit'<>'false' then raise exception 'Viewer has write controls';end if;
 begin perform public.ops_bill_reminder_record('bbbbbbbb-0000-4000-8000-000000000001',date_trunc('month',statement_timestamp())::date,'reminded',0,null);raise exception 'Viewer wrote reminders';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$begin begin perform public.ops_bill_reminders();raise exception 'Inactive staff read reminders';exception when insufficient_privilege then null;end;end$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$begin begin perform public.ops_bill_reminders();raise exception 'Unapproved staff read reminders';exception when insufficient_privilege then null;end;end$$;
select set_config('request.jwt.claim.sub','',true);
do $$begin begin perform public.ops_bill_reminders();raise exception 'No-identity caller read reminders';exception when insufficient_privilege then null;end;end$$;
reset role;
rollback;
