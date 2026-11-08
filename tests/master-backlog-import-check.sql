-- Strictly disposable CI regression tests; fictional rows only.
\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable DB required';end if;end$$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $test$
declare
 manifest jsonb;preview jsonb;receipt jsonb;replay jsonb;
 parentid uuid;childid uuid; count_before integer;bad jsonb;
begin
 manifest:=jsonb_build_object('schema_version','oaktown.master-backlog.v1','batch_ref','master-backlog-20991231','entries',jsonb_build_array(
  jsonb_build_object('task_code','W03','task_title','Fictional renewal plan','status','pending','priority','normal','work_level','Renewals','source_ref','Active Tasks!A12:L12','next_action','Review the hypothetical cases',
   'owner_label','Leslie','origin','Meeting','cluster_level','Renewals / fictional',
   'property_target','Fictional property, not linked','source_caution','Verify fictional source','update_notes','Fictional note'),
  jsonb_build_object('task_code','M12','task_title','Fictional signed-check task','status','waiting','priority','high','work_level','Renewals','parent_code','W03','source_ref','Active Tasks!A13:L13','waiting_on','Fictional coordinator','needs_verification',true),
  jsonb_build_object('task_code','M13','task_title','Fictional completed verification','status','completed','priority','normal','work_level','Renewals','parent_code','W03','source_ref','Active Tasks!A14:L14','completion_summary','Reported complete in a fictional source')
 ));
 select count(*) into count_before from public.ops_tasks;
 preview:=public.ops_master_backlog_import('preview',manifest);
 if preview->>'rows'<>'3' or preview->>'to_create'<>'3' or preview->>'parent_links'<>'2' then raise exception 'Bad preview'; end if;
 if (select count(*) from public.ops_tasks)<>count_before then raise exception 'Preview wrote task rows';end if;
 begin perform public.ops_master_backlog_import('save',manifest,preview->>'preview_token',false);raise exception 'Unreviewed save permitted';exception when invalid_parameter_value then null;end;
 begin perform public.ops_master_backlog_import('save',manifest,'stale',true);raise exception 'Stale save permitted';exception when invalid_parameter_value then null;end;
 receipt:=public.ops_master_backlog_import('save',manifest,preview->>'preview_token',true);
 if receipt->>'created'<>'3' or jsonb_array_length(receipt->'rows')<>3 then raise exception 'Bad import receipt';end if;
 select id into parentid from public.ops_tasks where task_code='W03';
 select id into childid from public.ops_tasks where task_code='M12';
 if not exists(select 1 from public.ops_tasks t where t.id=parentid
   and t.assigned_label='Leslie' and t.assigned_user_id is null
   and t.intake_details->>'source_owner_label'='Leslie'
   and t.intake_details->>'source_origin'='Meeting'
   and t.intake_details->>'cluster_level'='Renewals / fictional'
   and t.intake_details->>'source_property_target'='Fictional property, not linked'
   and t.intake_details->>'source_caution'='Verify fictional source'
   and t.intake_details->>'source_update_notes'='Fictional note'
   and t.property_id is null and t.lease_id is null)
 then raise exception 'Original owner or workbook context lost';end if;
 if exists(select 1 from public.ops_tasks where task_code='M12' and (assigned_user_id is not null or assigned_label is not null))
 then raise exception 'Importer silently assigned unowned task to executor';end if;
 if parentid is null or childid is null or not exists(
   select 1 from public.ops_tasks t where t.id=childid and t.parent_task_id=parentid and status='waiting'
     and t.intake_details->>'waiting_on'='Fictional coordinator'
 ) then raise exception 'Hierarchy or waiting state missing';end if;
 if not exists(select 1 from public.ops_tasks where task_code='M13' and status='completed'
   and completed_at is null and intake_details->>'completion_summary'='Reported complete in a fictional source'
 ) then raise exception 'Historical completion date was fabricated or summary lost';end if;
 if (select count(*) from public.ops_events where event_type='master_backlog_imported' and entity_id in(parentid,childid))<>2 then raise exception 'Missing provenance events';end if;
 replay:=public.ops_master_backlog_import('save',manifest,preview->>'preview_token',true);
 if replay->>'replayed'<>'true' or (select count(*) from public.ops_tasks)<>count_before+3 then raise exception 'Idempotent replay failed';end if;
 begin perform 1 from ops_intake_private.master_backlog_imports; raise exception 'Private receipt ledger exposed'; exception when insufficient_privilege then null; end;
 -- Another manifest with the same task code and different content must be rejected.
 bad:=jsonb_set(manifest,'{batch_ref}','"master-backlog-20991230"');
 bad:=jsonb_set(bad,'{entries,1,task_title}','"Conflicting fictional title"');
 begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Collision was accepted';exception when invalid_parameter_value then null;end;
 -- Parent missing / self-parent / invalid completed summary.
 bad:=jsonb_set(manifest,'{batch_ref}','"master-backlog-20991229"');
 bad:=jsonb_set(bad,'{entries,1,parent_code}','"W09"');
 begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Missing parent was accepted';exception when invalid_parameter_value then null;end;
 bad:=jsonb_set(bad,'{entries,1,parent_code}','"M12"');
 begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Self parent was accepted';exception when invalid_parameter_value then null;end;
 -- A second batch with one invalid row must not insert any records.
 bad:=jsonb_set(manifest,'{batch_ref}','"master-backlog-20991228"');
 bad:=jsonb_set(bad,'{entries,0,task_code}','"W04"');
 begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Partial collision accepted';exception when invalid_parameter_value then null;end;
 -- A code uniqueness check prevents collision even through the direct staff policy.
 begin
   insert into public.ops_tasks(task_code,task_title,workflow_key,status) values('M12','Another fictional task','general','pending');
   raise exception 'Direct duplicate task code permitted';
 exception when unique_violation then null;end;
 begin
   update public.ops_tasks set parent_task_id=childid where id=parentid;
   raise exception 'Circular link permitted';
 exception when check_violation then null;end;
end $test$;

-- Volume preview: all 37 fictional tasks, without any writes.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $volume$
declare manifest jsonb;rows jsonb;preview jsonb;before_count int;
begin
 select jsonb_agg(jsonb_build_object(
   'task_code','M'||lpad(n::text,2,'0'),
   'task_title','Fictional row '||n,
   'status','pending','priority','normal',
   'work_level','Fictional accounting','source_ref','Active Tasks!A'||(n+50)||':L'||(n+50)
 ) order by n) into rows from generate_series(40,76)n;
 manifest:=jsonb_build_object('schema_version','oaktown.master-backlog.v1',
   'batch_ref','master-backlog-20991227','entries',rows);
 select count(*) into before_count from public.ops_tasks;
 preview:=public.ops_master_backlog_import('preview',manifest);
 if preview->>'rows'<>'37' or preview->>'to_create'<>'37' then raise exception '37-row preview was not accepted';end if;
 if (select count(*) from public.ops_tasks)<>before_count then raise exception '37-row preview wrote data';end if;
end $volume$;
reset role;
-- The exposed RPC must not have owner rights. Private owner rights remain
-- guarded, with an empty search_path and no direct receipt-table permissions.
do $acl$ begin
 if (select prosecdef from pg_proc where oid='public.ops_master_backlog_import(text,jsonb,text,boolean)'::regprocedure)
   or not (select prosecdef from pg_proc where oid='ops_intake_private.master_backlog_import(text,jsonb,text,boolean)'::regprocedure)
   or not (select relrowsecurity from pg_class where oid='ops_intake_private.master_backlog_imports'::regclass)
   or has_table_privilege('authenticated','ops_intake_private.master_backlog_imports','SELECT,INSERT,UPDATE,DELETE')
   or has_function_privilege('anon','public.ops_master_backlog_import(text,jsonb,text,boolean)','EXECUTE')
   or has_function_privilege('anon','ops_intake_private.master_backlog_import(text,jsonb,text,boolean)','EXECUTE')
   or exists(select 1 from pg_proc where oid in (
     'public.ops_master_backlog_import(text,jsonb,text,boolean)'::regprocedure,
     'ops_intake_private.master_backlog_import(text,jsonb,text,boolean)'::regprocedure,
     'public.ops_task_check_parent_chain()'::regprocedure)
     and not (coalesce(proconfig,'{}') @> array['search_path=""']))
 then raise exception 'Import security boundary changed';end if;
end $acl$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $malformed$
declare manifest jsonb;preview jsonb;bad jsonb;field text;v jsonb;before_count int;
begin
 manifest:='{"schema_version":"oaktown.master-backlog.v1","batch_ref":"master-backlog-20990101","entries":[{"task_code":"A88","task_title":"Fictional validation probe","status":"pending","priority":"normal","work_level":"Test","source_ref":"Active Tasks!A1:L1"}]}';
 select count(*) into before_count from public.ops_tasks;
 preview:=public.ops_master_backlog_import('preview',manifest);
 begin perform public.ops_master_backlog_import(null,manifest,null,false);raise exception 'NULL mode bypassed approval';exception when invalid_parameter_value then null;end;
 begin perform public.ops_master_backlog_import('save',manifest,preview->>'preview_token',null);raise exception 'NULL reviewed flag accepted';exception when invalid_parameter_value then null;end;
 foreach bad in array array[null::jsonb,'null'::jsonb,'[]'::jsonb,manifest-'schema_version',manifest-'entries',
   jsonb_set(manifest,'{entries}','null'),jsonb_set(manifest,'{entries}','[]')]
 loop
  begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Malformed manifest accepted';exception when invalid_parameter_value then null;end;
 end loop;
 foreach field in array array['task_code','task_title','status','priority','work_level','source_ref'] loop
  foreach v in array array['null'::jsonb,'123'::jsonb,'{}'::jsonb] loop
   bad:=jsonb_set(manifest,array['entries','0',field],v);
   begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Non-text required field accepted: %',field;exception when invalid_parameter_value then null;end;
  end loop;
 end loop;
 foreach field in array array['parent_code','next_action','waiting_on','blocked_reason','completion_summary','original_status','original_priority','needs_verification'] loop
  bad:=jsonb_set(manifest,array['entries','0',field],'{}');
  begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Non-text optional field accepted: %',field;exception when invalid_parameter_value then null;end;
 end loop;
 foreach field in array array['task_title','work_level','next_action','original_status','original_priority'] loop
  bad:=jsonb_set(manifest,array['entries','0',field],to_jsonb(repeat(' ',2100)||'x'));
  begin perform public.ops_master_backlog_import('preview',bad);raise exception 'Oversized field accepted: %',field;exception when invalid_parameter_value then null;end;
 end loop;
 bad:=jsonb_set(manifest,'{entries,0,status}','"completed"');
 bad:=jsonb_set(bad,'{entries,0,completion_summary}','"Fictional completion"');
 bad:=jsonb_set(bad,'{entries,0,completed_on}','null');
 begin perform public.ops_master_backlog_import('preview',bad);raise exception 'NULL completion date accepted';exception when invalid_parameter_value then null;end;
 -- A real state change since preview must invalidate a reviewed token.
 update public.ops_tasks set notes='Fictional stale-token probe' where task_code='W03';
 begin perform public.ops_master_backlog_import('save',manifest,preview->>'preview_token',true);raise exception 'Changed task state accepted';exception when invalid_parameter_value then null;end;
 if (select count(*) from public.ops_tasks)<>before_count then raise exception 'Rejected request wrote tasks';end if;
end $malformed$;
-- Active administrators can preview, without writing. All other memberships
-- and missing identities are denied even when the private function is called.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$begin
 perform public.ops_master_backlog_import('preview','{"schema_version":"oaktown.master-backlog.v1","batch_ref":"master-backlog-20990102","entries":[{"task_code":"A89","task_title":"Fictional admin probe","status":"pending","priority":"normal","work_level":"Test","source_ref":"Active Tasks!A2:L2"}]}');
end$$;
do $denied$ declare uid text;begin
 foreach uid in array array['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005',''] loop
  perform set_config('request.jwt.claim.sub',uid,false);
  begin perform public.ops_master_backlog_import('preview','{}');raise exception 'Unauthorized wrapper call accepted';exception when insufficient_privilege then null;end;
  begin perform ops_intake_private.master_backlog_import('save','{}',null,true);raise exception 'Unauthorized private call accepted';exception when insufficient_privilege then null;end;
 end loop;
end $denied$;
reset role;
do $$begin
 if (select count(*) from ops_intake_private.master_backlog_imports)<>1
   or (select count(*) from public.ops_events where event_type='master_backlog_imported')<>3
 then raise exception 'Rejected/preview request wrote receipts or events';end if;
end$$;
-- Non-editors and anonymous calls cannot import or preview.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$begin
 begin perform public.ops_master_backlog_import('preview','{}'::jsonb);raise exception 'Viewer access permitted';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role anon;
do $$begin
 begin perform public.ops_master_backlog_import('preview','{}'::jsonb);raise exception 'Anon access permitted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Controlled Master Backlog import checks passed' as result;
