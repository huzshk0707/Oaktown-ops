-- Extend the existing reviewed intake RPC without replacing later permission or archive checks.
do $migration$
declare
 body text := pg_get_functiondef('ops_intake_private.run(text,uuid,jsonb)'::regprocedure);
 original text := $old$'summary','minutes','duration_basis','source_refs')),'Unsupported activity field');$old$;
 replacement text := $new$'summary','minutes','duration_basis','source_refs','completed_by')),'Unsupported activity field');
  if a ? 'completed_by' then
   perform ops_intake_private.assert(jsonb_typeof(a->'completed_by')='string'
    and length(btrim(a->>'completed_by')) between 1 and 100
    and (a->>'completed_by') !~ '^[[:space:]]|[[:space:]]$', 'Invalid performer');
  end if;$new$;
 guard text := $guard$perform ops_intake_private.assert(taskid is not null and exists(select 1 from public.ops_tasks where id=taskid),'Activity target unavailable');$guard$;
begin
 if strpos(body,original)=0 or strpos(body,guard)=0 then raise exception 'Unexpected intake definition. Review the activity validator before applying.';end if;
 body := replace(body,original,replacement);
 execute replace(body,guard,guard || $check$
  if a ? 'completed_by' then
   perform ops_intake_private.assert(exists(select 1 from public.ops_tasks where id=taskid and archived_at is null),'Restore the archived task before recording work');
  end if;$check$);
end
$migration$;
