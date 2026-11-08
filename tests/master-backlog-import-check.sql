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
  jsonb_build_object('task_code','W03','task_title','Fictional renewal plan','status','pending','priority','normal','work_level','Renewals','source_ref','Active Tasks!A12:L12','next_action','Review the hypothetical cases'),
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

-- Non-editors and anonymous calls cannot import or preview.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$begin
 begin perform public.ops_master_backlog_import('preview','{}'::jsonb);raise exception 'Viewer access permitted';exception when invalid_parameter_value then null;end;
end$$;
reset role;
set role anon;
do $$begin
 begin perform public.ops_master_backlog_import('preview','{}'::jsonb);raise exception 'Anon access permitted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Controlled Master Backlog import checks passed' as result;
