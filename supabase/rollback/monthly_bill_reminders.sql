-- Only an empty, unconfigured installation can be removed without losing history.
begin;
do $$begin
 if exists(select 1 from ops_bill_private.rules) or exists(select 1 from ops_bill_private.events)
  or exists(select 1 from ops_bill_private.occurrences)
 then raise exception 'Reminder configuration/history exists; retain data and disable API grants instead';end if;
end$$;
drop function public.ops_bill_reminder_record(uuid,date,text,integer,text);
drop function public.ops_bill_reminders();
drop schema ops_bill_private cascade;
commit;
