-- Stage A2: additive task hierarchy and a reviewed, repeat-safe Master Backlog import.
-- STAGED ONLY. Do not apply to production through GitHub CI.
begin;
alter table public.ops_tasks
  add column task_code text,
  add column parent_task_id uuid;
alter table public.ops_tasks
  add constraint ops_task_code_format check (task_code is null or task_code ~ '^[MWA][0-9]{2}$'),
  add constraint ops_task_parent_not_self check (parent_task_id is null or parent_task_id <> id),
  add constraint ops_task_parent_fk foreign key (parent_task_id) references public.ops_tasks(id) on delete restrict;
create unique index ops_task_code_unique on public.ops_tasks(task_code) where task_code is not null;
create index ops_task_parent_idx on public.ops_tasks(parent_task_id);

-- Defense in depth: reject cycles even if a privileged writer bypasses the importer.
create function public.ops_task_check_parent_chain() returns trigger
language plpgsql security invoker set search_path='' as $fn$
begin
 if new.parent_task_id is null then return new; end if;
 if new.id = new.parent_task_id then raise exception 'Task cannot parent itself' using errcode='23514'; end if;
 if exists (
   with recursive ancestors(id,parent_task_id,path) as (
     select t.id,t.parent_task_id,array[t.id]
       from public.ops_tasks t where t.id=new.parent_task_id
     union all
     select t.id,t.parent_task_id,a.path||t.id
       from public.ops_tasks t join ancestors a on t.id=a.parent_task_id
      where not (t.id=any(a.path))
   ) select 1 from ancestors where id=new.id
 ) then raise exception 'Circular task parent link' using errcode='23514'; end if;
 return new;
end $fn$;
create trigger ops_task_guard_parent before insert or update of parent_task_id
 on public.ops_tasks for each row execute function public.ops_task_check_parent_chain();

-- Private receipt ledger; no client access to raw import attempts.
create table ops_intake_private.master_backlog_imports(
 batch_ref text primary key,
 fingerprint text not null,
 receipt jsonb not null,
 imported_by uuid not null references auth.users(id),
 imported_at timestamptz not null default clock_timestamp()
);
revoke all on ops_intake_private.master_backlog_imports from public,anon,authenticated;

-- p_mode = preview is read-only; p_mode = save requires an exact preview token,
-- an affirmative reviewed flag and the existing authenticated staff editor scope.
create function public.ops_master_backlog_import(
 p_mode text,p_manifest jsonb,p_preview_token text default null,p_reviewed boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $import$
declare
 actor uuid := auth.uid();
 rows jsonb; rowdata jsonb; prior public.ops_tasks%rowtype;
 refs jsonb:='{}'::jsonb; reply_rows jsonb:='[]'::jsonb;
 code text; parent_code text; parentid uuid; sourcekey text; src text;
 title text; stat text; prio text; level text; detail jsonb; batch text;
 existing public.ops_tasks%rowtype; manifest_hash text; state_hash text; token text;
 old ops_intake_private.master_backlog_imports%rowtype;
 outcome jsonb; new_id uuid; n integer; rowcount integer; already integer:=0;
begin
 if actor is null or not exists(
   select 1 from public.staff_memberships m where m.user_id=actor
   and m.is_active and m.role in ('admin','editor')
 ) then raise exception 'Active editor access required' using errcode='22023'; end if;
 if p_mode not in ('preview','save') then raise exception 'Invalid import mode' using errcode='22023'; end if;
 if jsonb_typeof(p_manifest)<>'object'
    or exists(select 1 from pg_catalog.jsonb_object_keys(p_manifest) k
              where k not in ('schema_version','batch_ref','entries'))
    or p_manifest->>'schema_version'<>'oaktown.master-backlog.v1'
    or coalesce(p_manifest->>'batch_ref','') !~ '^master-backlog-[0-9]{8}$'
 then raise exception 'Invalid Master Backlog manifest' using errcode='22023'; end if;
 rows:=p_manifest->'entries'; batch:=p_manifest->>'batch_ref';
 if jsonb_typeof(rows)<>'array' then raise exception 'Entries must be an array' using errcode='22023'; end if;
 rowcount:=pg_catalog.jsonb_array_length(rows);
 if rowcount<1 or rowcount>50 or pg_catalog.octet_length(p_manifest::text)>180000
 then raise exception 'Invalid import size' using errcode='22023'; end if;

 -- Serialize imports and compute an optimistic token from current task state.
 perform pg_catalog.pg_advisory_xact_lock(5210808);
 manifest_hash:=pg_catalog.md5(p_manifest::text);
 select pg_catalog.md5(coalesce(pg_catalog.string_agg(t.id::text||':'||t.updated_at::text||':'||
   coalesce(t.task_code,'')||':'||coalesce(t.source_task_key,''),'|' order by t.id),'empty'))
 into state_hash from public.ops_tasks t;
 token:=pg_catalog.md5(manifest_hash||':'||state_hash);

 if p_mode='save' then
   if not p_reviewed or p_preview_token is distinct from token
   then
     -- A completed, byte-identical batch may be replayed with its original
     -- reviewed token: returns the existing receipt, never inserts again.
     select * into old from ops_intake_private.master_backlog_imports b where b.batch_ref=batch;
     if found and old.fingerprint=manifest_hash and p_reviewed
         and p_preview_token=old.receipt->>'preview_token'
     then return old.receipt||pg_catalog.jsonb_build_object('replayed',true); end if;
     raise exception 'Preview expired or not approved; refresh and review' using errcode='22023';
   end if;
 end if;

 -- Validate all rows before any write. Never accept tenant/property link IDs.
 for rowdata in select value from pg_catalog.jsonb_array_elements(rows) loop
   if pg_catalog.jsonb_typeof(rowdata)<>'object' or exists(
     select 1 from pg_catalog.jsonb_object_keys(rowdata) k where k not in
       ('task_code','task_title','status','priority','work_level','parent_code',
        'next_action','waiting_on','blocked_reason','completion_summary','completed_on',
        'needs_verification','source_ref','original_status','original_priority')
   ) then raise exception 'Unsupported row fields' using errcode='22023'; end if;
   code:=rowdata->>'task_code'; src:=rowdata->>'source_ref';
   title:=rowdata->>'task_title'; stat:=rowdata->>'status';
   prio:=rowdata->>'priority';level:=rowdata->>'work_level';
   parent_code:=nullif(rowdata->>'parent_code','');
   if code is null or code !~ '^[MWA][0-9]{2}$'
      or refs ? code
      or length(btrim(coalesce(title,''))) not between 1 and 300
      or coalesce(stat,'') not in ('pending','in_progress','waiting','blocked','completed','cancelled')
      or coalesce(prio,'') not in ('low','normal','high','urgent')
      or length(btrim(coalesce(level,''))) not between 1 and 90
      or coalesce(src,'') !~ '^Active Tasks!A[0-9]{1,4}:L[0-9]{1,4}
      or length(coalesce(rowdata->>'next_action',''))>2000
      or length(coalesce(rowdata->>'waiting_on',''))>120
      or length(coalesce(rowdata->>'blocked_reason',''))>1200
      or length(coalesce(rowdata->>'completion_summary',''))>2000
      or (rowdata ? 'needs_verification' and pg_catalog.jsonb_typeof(rowdata->'needs_verification')<>'boolean')
   then raise exception 'Invalid or duplicate task row %',coalesce(code,'?') using errcode='22023'; end if;
   if stat='waiting' and length(btrim(coalesce(rowdata->>'waiting_on','')))=0
     or stat='blocked' and length(btrim(coalesce(rowdata->>'blocked_reason','')))=0
     or stat='completed' and length(btrim(coalesce(rowdata->>'completion_summary','')))=0
     or stat<>'completed' and rowdata ? 'completed_on'
     or stat<>'waiting' and length(btrim(coalesce(rowdata->>'waiting_on','')))>0
   then raise exception 'Status details inconsistent for %',code using errcode='22023'; end if;
   if rowdata ? 'completed_on' then
     if rowdata->>'completed_on' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     then raise exception 'Invalid historical completion date' using errcode='22023';end if;
     perform (rowdata->>'completed_on')::date;
   end if;
   if parent_code is not null and (parent_code !~ '^[MWA][0-9]{2}$' or parent_code=code)
   then raise exception 'Invalid parent task code' using errcode='22023'; end if;
   refs:=refs||pg_catalog.jsonb_build_object(code,true);
 end loop;

 -- Every referenced parent must be included in the same reviewed manifest,
 -- and existing task-code collisions are never silently adopted.
 for rowdata in select value from pg_catalog.jsonb_array_elements(rows) loop
   code:=rowdata->>'task_code'; parent_code:=nullif(rowdata->>'parent_code','');
   if parent_code is not null and not (refs ? parent_code)
   then raise exception 'Parent missing from manifest for %',code using errcode='22023'; end if;
   if parent_code is not null and not exists(
      select 1 from pg_catalog.jsonb_array_elements(rows) r
       where r->>'task_code'=parent_code and nullif(r->>'parent_code','') is null
   ) then raise exception 'Only root parents supported by initial import' using errcode='22023'; end if;
   sourcekey:='master-backlog:'||batch||':'||code;
   select * into existing from public.ops_tasks t where t.task_code=code or t.source_task_key=sourcekey;
   if found then
     if existing.task_code is distinct from code or existing.source_task_key is distinct from sourcekey
        or existing.intake_details->>'source_fingerprint' is distinct from pg_catalog.md5(rowdata::text)
     then raise exception 'Conflicting existing task for %',code using errcode='22023'; end if;
     already:=already+1;
   end if;
 end loop;
 if p_mode='preview' then
   return pg_catalog.jsonb_build_object(
      'schema_version','oaktown.master-backlog-preview.v1','batch_ref',batch,
      'preview_token',token,'manifest_fingerprint',manifest_hash,
      'rows',rowcount,'to_create',rowcount-already,'already_imported',already,
      'completed', (select count(*) from pg_catalog.jsonb_array_elements(rows) r where r->>'status'='completed'),
      'parent_links',(select count(*) from pg_catalog.jsonb_array_elements(rows) r where nullif(r->>'parent_code','') is not null),
      'task_codes',(select pg_catalog.jsonb_agg(r->>'task_code') from pg_catalog.jsonb_array_elements(rows) r)
   );
 end if;

 -- Do not allow overwriting a prior batch_ref with changed content.
 select * into old from ops_intake_private.master_backlog_imports b where b.batch_ref=batch;
 if found then
   if old.fingerprint<>manifest_hash then raise exception 'Batch reference already used' using errcode='22023'; end if;
   return old.receipt||pg_catalog.jsonb_build_object('replayed',true);
 end if;

 -- Create roots first, then children. Never update existing tasks or add links
 -- to preexisting portfolio/lease/renewal records.
 for n in 0..1 loop
 for rowdata in select value from pg_catalog.jsonb_array_elements(rows) loop
   parent_code:=nullif(rowdata->>'parent_code','');
   if (n=0 and parent_code is not null) or (n=1 and parent_code is null) then continue; end if;
   code:=rowdata->>'task_code'; title:=rowdata->>'task_title';stat:=rowdata->>'status';prio:=rowdata->>'priority';level:=rowdata->>'work_level';
   sourcekey:='master-backlog:'||batch||':'||code;
   select * into existing from public.ops_tasks where task_code=code;
   if found then
     new_id:=existing.id;
   else
     parentid:=null;
     if parent_code is not null then
       select id into parentid from public.ops_tasks where task_code=parent_code;
       if parentid is null then raise exception 'Parent not imported' using errcode='22023'; end if;
     end if;
     detail:=pg_catalog.jsonb_build_object(
       'work_level',level,
       'source_ref',rowdata->>'source_ref',
       'source_batch',batch,
       'source_fingerprint',pg_catalog.md5(rowdata::text),
       'original_status',rowdata->>'original_status',
       'original_priority',rowdata->>'original_priority',
       'needs_verification',coalesce((rowdata->>'needs_verification')::boolean,false)
     );
     if length(coalesce(rowdata->>'next_action',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('next_action',rowdata->>'next_action');end if;
     if length(coalesce(rowdata->>'waiting_on',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('waiting_on',rowdata->>'waiting_on');end if;
     if length(coalesce(rowdata->>'blocked_reason',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('blocked_reason',rowdata->>'blocked_reason');end if;
     if length(coalesce(rowdata->>'completion_summary',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('completion_summary',rowdata->>'completion_summary');end if;
     if rowdata ? 'completed_on' then detail:=detail||pg_catalog.jsonb_build_object('completed_on',rowdata->>'completed_on');end if;
     insert into public.ops_tasks(task_code,parent_task_id,workflow_key,task_title,status,priority,source_task_key,intake_details,assigned_user_id)
     values(code,parentid,'general',title,stat,prio,sourcekey,detail,actor)
     returning id into new_id;
     -- Historical "completed" is preserved without manufacturing a timestamp.
     insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
     values('task',new_id,'master_backlog_imported',actor,'Imported from reviewed Master Backlog',
       pg_catalog.jsonb_build_object('batch_ref',batch,'task_code',code,'source_ref',rowdata->>'source_ref',
        'fingerprint',pg_catalog.md5(rowdata::text),'original_status',rowdata->>'original_status',
        'mapped_status',stat,'work_level',level,'parent_code',parent_code));
   end if;
   reply_rows:=reply_rows||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('task_code',code,'id',new_id,'status',stat,'parent_code',parent_code));
 end loop;
 end loop;
 outcome:=pg_catalog.jsonb_build_object(
   'schema_version','oaktown.master-backlog-receipt.v1','batch_ref',batch,
   'preview_token',token,'manifest_fingerprint',manifest_hash,
   'created',rowcount-already,'already_imported',already,'rows',reply_rows,
   'saved_at',pg_catalog.clock_timestamp()
 );
 insert into ops_intake_private.master_backlog_imports(batch_ref,fingerprint,receipt,imported_by)
 values(batch,manifest_hash,outcome,actor);
 return outcome;
end $import$;
revoke all on function public.ops_master_backlog_import(text,jsonb,text,boolean) from public,anon;
grant execute on function public.ops_master_backlog_import(text,jsonb,text,boolean) to authenticated;
comment on function public.ops_master_backlog_import(text,jsonb,text,boolean)
 is 'Staff-reviewed, preview-token-gated Master Backlog import; no writes during preview, no portfolio link inference.';
commit;

      or length(coalesce(rowdata->>'next_action',''))>2000
      or length(coalesce(rowdata->>'waiting_on',''))>120
      or length(coalesce(rowdata->>'blocked_reason',''))>1200
      or length(coalesce(rowdata->>'completion_summary',''))>2000
      or (rowdata ? 'needs_verification' and pg_catalog.jsonb_typeof(rowdata->'needs_verification')<>'boolean')
   then raise exception 'Invalid or duplicate task row %',coalesce(code,'?') using errcode='22023'; end if;
   if stat='waiting' and length(btrim(coalesce(rowdata->>'waiting_on','')))=0
     or stat='blocked' and length(btrim(coalesce(rowdata->>'blocked_reason','')))=0
     or stat='completed' and length(btrim(coalesce(rowdata->>'completion_summary','')))=0
     or stat<>'completed' and rowdata ? 'completed_on'
     or stat<>'waiting' and length(btrim(coalesce(rowdata->>'waiting_on','')))>0
   then raise exception 'Status details inconsistent for %',code using errcode='22023'; end if;
   if rowdata ? 'completed_on' then
     if rowdata->>'completed_on' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     then raise exception 'Invalid historical completion date' using errcode='22023';end if;
     perform (rowdata->>'completed_on')::date;
   end if;
   if parent_code is not null and (parent_code !~ '^[MWA][0-9]{2}$' or parent_code=code)
   then raise exception 'Invalid parent task code' using errcode='22023'; end if;
   refs:=refs||pg_catalog.jsonb_build_object(code,true);
 end loop;

 -- Every referenced parent must be included in the same reviewed manifest,
 -- and existing task-code collisions are never silently adopted.
 for rowdata in select value from pg_catalog.jsonb_array_elements(rows) loop
   code:=rowdata->>'task_code'; parent_code:=nullif(rowdata->>'parent_code','');
   if parent_code is not null and not (refs ? parent_code)
   then raise exception 'Parent missing from manifest for %',code using errcode='22023'; end if;
   if parent_code is not null and not exists(
      select 1 from pg_catalog.jsonb_array_elements(rows) r
       where r->>'task_code'=parent_code and nullif(r->>'parent_code','') is null
   ) then raise exception 'Only root parents supported by initial import' using errcode='22023'; end if;
   sourcekey:='master-backlog:'||batch||':'||code;
   select * into existing from public.ops_tasks t where t.task_code=code or t.source_task_key=sourcekey;
   if found then
     if existing.task_code is distinct from code or existing.source_task_key is distinct from sourcekey
        or existing.intake_details->>'source_fingerprint' is distinct from pg_catalog.md5(rowdata::text)
     then raise exception 'Conflicting existing task for %',code using errcode='22023'; end if;
     already:=already+1;
   end if;
 end loop;
 if p_mode='preview' then
   return pg_catalog.jsonb_build_object(
      'schema_version','oaktown.master-backlog-preview.v1','batch_ref',batch,
      'preview_token',token,'manifest_fingerprint',manifest_hash,
      'rows',rowcount,'to_create',rowcount-already,'already_imported',already,
      'completed', (select count(*) from pg_catalog.jsonb_array_elements(rows) r where r->>'status'='completed'),
      'parent_links',(select count(*) from pg_catalog.jsonb_array_elements(rows) r where nullif(r->>'parent_code','') is not null),
      'task_codes',(select pg_catalog.jsonb_agg(r->>'task_code') from pg_catalog.jsonb_array_elements(rows) r)
   );
 end if;

 -- Do not allow overwriting a prior batch_ref with changed content.
 select * into old from ops_intake_private.master_backlog_imports b where b.batch_ref=batch;
 if found then
   if old.fingerprint<>manifest_hash then raise exception 'Batch reference already used' using errcode='22023'; end if;
   return old.receipt||pg_catalog.jsonb_build_object('replayed',true);
 end if;

 -- Create roots first, then children. Never update existing tasks or add links
 -- to preexisting portfolio/lease/renewal records.
 for n in 0..1 loop
 for rowdata in select value from pg_catalog.jsonb_array_elements(rows) loop
   parent_code:=nullif(rowdata->>'parent_code','');
   if (n=0 and parent_code is not null) or (n=1 and parent_code is null) then continue; end if;
   code:=rowdata->>'task_code'; title:=rowdata->>'task_title';stat:=rowdata->>'status';prio:=rowdata->>'priority';level:=rowdata->>'work_level';
   sourcekey:='master-backlog:'||batch||':'||code;
   select * into existing from public.ops_tasks where task_code=code;
   if found then
     new_id:=existing.id;
   else
     parentid:=null;
     if parent_code is not null then
       select id into parentid from public.ops_tasks where task_code=parent_code;
       if parentid is null then raise exception 'Parent not imported' using errcode='22023'; end if;
     end if;
     detail:=pg_catalog.jsonb_build_object(
       'work_level',level,
       'source_ref',rowdata->>'source_ref',
       'source_batch',batch,
       'source_fingerprint',pg_catalog.md5(rowdata::text),
       'original_status',rowdata->>'original_status',
       'original_priority',rowdata->>'original_priority',
       'needs_verification',coalesce((rowdata->>'needs_verification')::boolean,false)
     );
     if length(coalesce(rowdata->>'next_action',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('next_action',rowdata->>'next_action');end if;
     if length(coalesce(rowdata->>'waiting_on',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('waiting_on',rowdata->>'waiting_on');end if;
     if length(coalesce(rowdata->>'blocked_reason',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('blocked_reason',rowdata->>'blocked_reason');end if;
     if length(coalesce(rowdata->>'completion_summary',''))>0 then detail:=detail||pg_catalog.jsonb_build_object('completion_summary',rowdata->>'completion_summary');end if;
     if rowdata ? 'completed_on' then detail:=detail||pg_catalog.jsonb_build_object('completed_on',rowdata->>'completed_on');end if;
     insert into public.ops_tasks(task_code,parent_task_id,workflow_key,task_title,status,priority,source_task_key,intake_details,assigned_user_id)
     values(code,parentid,'general',title,stat,prio,sourcekey,detail,actor)
     returning id into new_id;
     -- Historical "completed" is preserved without manufacturing a timestamp.
     insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata)
     values('task',new_id,'master_backlog_imported',actor,'Imported from reviewed Master Backlog',
       pg_catalog.jsonb_build_object('batch_ref',batch,'task_code',code,'source_ref',rowdata->>'source_ref',
        'fingerprint',pg_catalog.md5(rowdata::text),'original_status',rowdata->>'original_status',
        'mapped_status',stat,'work_level',level,'parent_code',parent_code));
   end if;
   reply_rows:=reply_rows||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('task_code',code,'id',new_id,'status',stat,'parent_code',parent_code));
 end loop;
 end loop;
 outcome:=pg_catalog.jsonb_build_object(
   'schema_version','oaktown.master-backlog-receipt.v1','batch_ref',batch,
   'preview_token',token,'manifest_fingerprint',manifest_hash,
   'created',rowcount-already,'already_imported',already,'rows',reply_rows,
   'saved_at',pg_catalog.clock_timestamp()
 );
 insert into ops_intake_private.master_backlog_imports(batch_ref,fingerprint,receipt,imported_by)
 values(batch,manifest_hash,outcome,actor);
 return outcome;
end $import$;
revoke all on function public.ops_master_backlog_import(text,jsonb,text,boolean) from public,anon;
grant execute on function public.ops_master_backlog_import(text,jsonb,text,boolean) to authenticated;
comment on function public.ops_master_backlog_import(text,jsonb,text,boolean)
 is 'Staff-reviewed, preview-token-gated Master Backlog import; no writes during preview, no portfolio link inference.';
commit;
