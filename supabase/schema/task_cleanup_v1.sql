-- STAGED ONLY. Do not run against production until reviewed/approved.
-- Repairs an RPC PL/pgSQL variable-shadowing bug and adds reversible task cleanup.
-- Existing tasks, receipts, original source evidence and audit events are retained.
begin;

alter table public.ops_tasks
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

-- This historical function was stored without qualified receipt alias under
-- #variable_conflict use_variable. jsonb_agg(receipt) resolved to the local
-- unassigned PL/pgSQL variable, returning [null] despite a valid saved receipt.
-- Keep the v1 function and all its existing authorization/idempotency rules.
do $task_fix$
declare src text; patched text;
begin
 select pg_get_functiondef('ops_intake_private.run(text,uuid,jsonb)'::regprocedure) into src;
 if position('jsonb_agg(receipt order by created_at desc) from ops_intake_private.receipts' in src)=0 then
  raise exception 'Task receipt function changed; review manually before migration';
 end if;
 if position('''intake_details'',intake_details))' in src)=0 then
  raise exception 'Task state shape changed; review manually before migration';
 end if;
 if position('select * into task from public.ops_tasks where id=taskid for update;' in src)=0 then
  raise exception 'Task update guard changed; review manually before migration';
 end if;
 patched:=replace(src,
   'jsonb_agg(receipt order by created_at desc) from ops_intake_private.receipts',
   'jsonb_agg(r.receipt order by r.created_at desc) from ops_intake_private.receipts r');
 patched:=replace(patched,
   '''intake_details'',intake_details))',
   '''intake_details'',intake_details,''archived_at'',archived_at))');
 patched:=replace(patched,
   'perform ops_intake_private.assert(found,''Task unavailable'');',
   'perform ops_intake_private.assert(found,''Task unavailable''); perform ops_intake_private.assert(task.archived_at is null,''Archived task must be restored before changes'');');
 execute patched;
end
$task_fix$;

-- Reversible archive/unarchive. Optimistic version check and RLS on
-- public.ops_tasks protect concurrent changes. Every action writes audit
-- history. Never hard delete an imported task, source or work record.
create or replace function public.ops_task_set_archived(
 p_task uuid,
 p_expected_updated_at timestamptz,
 p_archived boolean
) returns jsonb
language plpgsql security invoker set search_path='' as $task_archive$
declare actor uuid:=auth.uid(); out_task public.ops_tasks%rowtype;
begin
 if actor is null or not exists(
   select 1 from public.staff_memberships m
   where m.user_id=actor and m.is_active and m.role in ('admin','editor')
 ) then
   raise exception 'Active editor access required' using errcode='42501';
 end if;
 if p_task is null or p_expected_updated_at is null or p_archived is null then
   raise exception 'Task, reviewed version and archive choice required' using errcode='22023';
 end if;
 update public.ops_tasks t set
   archived_at=case when p_archived then clock_timestamp() else null end,
   archived_by=case when p_archived then actor else null end
 where t.id=p_task and t.updated_at=p_expected_updated_at
   and (t.archived_at is not null) is distinct from p_archived
 returning t.* into out_task;

 if not found then
   raise exception 'Task unavailable, already changed, or already in the requested state. Refresh and try again.'
   using errcode='40001';
 end if;
 insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
 values('task',p_task,
   case when p_archived then 'task_archived' else 'task_restored' end,
   actor,
   case when p_archived then 'Archived task from active inbox' else 'Restored task to active inbox' end,
   jsonb_build_object('archive_state',p_archived,'reviewed_task_version',p_expected_updated_at));
 return jsonb_build_object('task_id',out_task.id,'archived_at',out_task.archived_at,'updated_at',out_task.updated_at);
end
$task_archive$;

revoke all on function public.ops_task_set_archived(uuid,timestamptz,boolean) from public,anon;
grant execute on function public.ops_task_set_archived(uuid,timestamptz,boolean) to authenticated;
commit;
