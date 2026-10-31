-- Disposable database only. The staged script is never applied to production by CI.
\set ON_ERROR_STOP on
reset role;
do $$ begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;
select set_config('ci.intake.payload',$fixture${"export":{"schema_version":"oaktown.task-intake.v1","batch_ref":"B008","work_date":"2026-11-02","timezone":"America/New_York","snapshot_ref":null,"sources":[{"source_ref":"S001","kind":"text","label":"Fictional test input","occurred_at":null,"evidence_excerpt":"Unit 8’s renewal needs Leslie’s approval. Remind me to follow up tomorrow."},{"source_ref":"S002","kind":"text","label":"Fictional test input","occurred_at":null,"evidence_excerpt":"I emailed Leslie about that Unit 8 renewal. Took about 10 minutes."},{"source_ref":"S003","kind":"text","label":"Fictional test input","occurred_at":null,"evidence_excerpt":"She hasn't replied yet"},{"source_ref":"S004","kind":"text","label":"Fictional test input","occurred_at":null,"evidence_excerpt":"I’m repeating the earlier update, not reporting another email"},{"source_ref":"S005","kind":"text","label":"Fictional test input","occurred_at":null,"evidence_excerpt":"Leslie approved the terms. I still need to prepare the lease."}],"proposals":[{"proposal_ref":"P001","operation":"create","task_id":null,"related_proposal_ref":null,"expected_updated_at":null,"match_reason":"Fictional Unit 8 conversation","context":{"workflow_key":"renewal","property_id":null,"unit_id":null,"tenancy_id":null,"renewal_case_id":null,"context_label":"Unit 8"},"changes":{"task_title":"Prepare Unit 8 renewal lease","status":"waiting","waiting_on":"Leslie","next_action":"Wait for Leslie's reply on renewal terms","follow_up":{"date":"2026-11-03","time":null,"timezone":"America/New_York","original_text":"tomorrow"}},"suggestions":{"priority":"normal"},"source_refs":["S001"],"needs_clarification":true},{"proposal_ref":"P002","operation":"update","task_id":null,"related_proposal_ref":"P001","expected_updated_at":null,"match_reason":"Fictional Unit 8 conversation","context":{"workflow_key":"renewal","property_id":null,"unit_id":null,"tenancy_id":null,"renewal_case_id":null,"context_label":"Unit 8"},"changes":{},"suggestions":{},"source_refs":["S003"],"needs_clarification":true},{"proposal_ref":"P003","operation":"duplicate","task_id":null,"related_proposal_ref":"P001","expected_updated_at":null,"match_reason":"Fictional Unit 8 conversation","context":{"workflow_key":"renewal","property_id":null,"unit_id":null,"tenancy_id":null,"renewal_case_id":null,"context_label":"Unit 8"},"changes":{},"suggestions":{},"source_refs":["S004"],"needs_clarification":true},{"proposal_ref":"P004","operation":"update","task_id":null,"related_proposal_ref":"P001","expected_updated_at":null,"match_reason":"Fictional Unit 8 conversation","context":{"workflow_key":"renewal","property_id":null,"unit_id":null,"tenancy_id":null,"renewal_case_id":null,"context_label":"Unit 8"},"changes":{"status":"pending","next_action":"Prepare the lease"},"suggestions":{},"source_refs":["S005"],"needs_clarification":true,"proposed_clear_fields":["waiting_on","follow_up"]}],"activities":[{"activity_ref":"A001","task_id":null,"proposal_ref":"P001","work_date":"2026-11-02","summary":"Emailed Leslie regarding Unit 8 renewal terms","minutes":10,"duration_basis":"user_estimate","source_refs":["S002"]}],"questions":["Confirm the property address for Unit 8."]},"resolutions":{"P001":{"property_id":"10000000-0000-4000-8000-000000000001","unit_id":null}},"accept_clears":["P004"],"accept_suggestions":[],"expected_versions":{},"reviewed":true}$fixture$,false);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.ops_task_intake('new')->>'session_id' as session_id \gset
select set_config('ci.intake.session',:'session_id',false);
do $$
declare sid uuid:=current_setting('ci.intake.session')::uuid;req jsonb:=current_setting('ci.intake.payload')::jsonb;r jsonb;s jsonb;t uuid;bad jsonb;before_count int;
begin
 r:=public.ops_task_intake('save',sid,req);
 if jsonb_array_length(r->'proposals')<>4 or jsonb_array_length(r->'activities')<>1 then raise exception 'Wrong receipt counts';end if;
 t:=(r->'proposals'->0->>'task_id')::uuid;
 if not exists(select 1 from public.ops_tasks where id=t and status='pending' and task_title='Prepare Unit 8 renewal lease' and not intake_details ? 'waiting_on' and not intake_details ? 'follow_up') then raise exception 'Final task state incorrect';end if;
 if public.ops_task_intake('save',sid,req)<>r then raise exception 'Same request should return same receipt';end if;
 req:=jsonb_set(req,'{export,batch_ref}','"B009"');
 r:=public.ops_task_intake('save',sid,req);
 if exists(select 1 from jsonb_array_elements(r->'proposals')p where p->>'result'<>'already_imported') then raise exception 'Cross-batch dedup failed';end if;
 if (select count(*) from public.ops_events where entity_id=t and event_type='task_work_recorded')<>1 then raise exception 'Time counted twice';end if;
 s:=public.ops_task_intake('state',sid);
 if jsonb_array_length(s->'items')<>10 then raise exception 'Expected five sources, four proposals and one activity';end if;
 bad:=jsonb_set(req,'{export,proposals,0,changes,task_title}','"Tampered title"');
 begin perform public.ops_task_intake('save',sid,bad);raise exception 'Changed batch was accepted';exception when invalid_parameter_value then null;end;
 bad:=jsonb_set(bad,'{export,batch_ref}','"B010"');
 begin perform public.ops_task_intake('save',sid,bad);raise exception 'Changed reference accepted';exception when invalid_parameter_value then null;end;
 -- Stale optimistic-lock token must not overwrite a task.
 bad:=jsonb_set(req,'{export,batch_ref}','"STALE"');
 bad:=jsonb_set(bad,'{export,activities}','[]');
 bad:=jsonb_set(bad,'{export,proposals}',jsonb_build_array(jsonb_build_object(
 'proposal_ref','P100','operation','update','task_id',t,'related_proposal_ref',null,'context',req->'export'->'proposals'->0->'context','changes',jsonb_build_object('task_title','Stale edit'),'suggestions','{}'::jsonb,'source_refs','["S001"]'::jsonb,'match_reason','Stale attempt')));
 bad:=jsonb_set(bad,'{expected_versions}',jsonb_build_object(t::text,'2000-01-01T00:00:00Z'));
 begin perform public.ops_task_intake('save',sid,bad);raise exception 'Stale update accepted';exception when invalid_parameter_value then null;end;
 -- A bad activity after a valid new task rolls back the entire import.
 select count(*) into before_count from public.ops_tasks;
 bad:=jsonb_set(req,'{export,batch_ref}','"ROLLBACK"');
 bad:=jsonb_set(bad,'{export,proposals}',jsonb_build_array((req->'export'->'proposals'->0)||'{"proposal_ref":"P101","changes":{"task_title":"Must roll back","status":"pending"}}'::jsonb));
 bad:=jsonb_set(bad,'{resolutions}',jsonb_build_object('P101',req->'resolutions'->'P001'));
 bad:=jsonb_set(bad,'{export,activities}',jsonb_build_array((req->'export'->'activities'->0)||'{"activity_ref":"A101","proposal_ref":"P101","minutes":-1}'::jsonb));
 begin perform public.ops_task_intake('save',sid,bad);raise exception 'Bad activity accepted';exception when invalid_parameter_value then null;end;
 if (select count(*) from public.ops_tasks)<>before_count then raise exception 'Partial import escaped rollback';end if;

 -- A fresh version can update an imported root without creating another task.
 bad:=jsonb_set(req,'{export,batch_ref}','"FRESH"');
 bad:=jsonb_set(bad,'{export,activities}','[]');
 bad:=jsonb_set(bad,'{export,proposals}',jsonb_build_array(jsonb_build_object(
 'proposal_ref','P200','operation','update','task_id',null,'related_proposal_ref','P001','context',req->'export'->'proposals'->0->'context','changes',jsonb_build_object('task_title','Prepare reviewed Unit 8 renewal'),'suggestions','{}'::jsonb,'source_refs','["S001"]'::jsonb,'match_reason','Reviewed fresh update')));
 bad:=jsonb_set(bad,'{expected_versions}',jsonb_build_object(t::text,(select updated_at from public.ops_tasks where id=t)));
 perform public.ops_task_intake('save',sid,bad);
 if not exists(select 1 from public.ops_tasks where id=t and task_title='Prepare reviewed Unit 8 renewal') then raise exception 'Fresh update failed';end if;
 -- Explicit General operations requires no fake property. Date-only due does not invent a timestamp.
 bad:=jsonb_set(req,'{export,batch_ref}','"GENERAL"');
 bad:=jsonb_set(bad,'{export,activities}','[]');
 bad:=jsonb_set(bad,'{export,proposals}',jsonb_build_array(jsonb_build_object(
 'proposal_ref','P201','operation','create','task_id',null,'related_proposal_ref',null,'context',jsonb_build_object('workflow_key','general','context_label','General operations'),'changes',jsonb_build_object('task_title','Fictional general task','status','pending','due',jsonb_build_object('date','2026-11-03','time',null,'timezone','America/New_York','original_text','November 3')),'suggestions','{}'::jsonb,'source_refs','["S001"]'::jsonb,'match_reason','General operations test')));
 bad:=jsonb_set(bad,'{resolutions}','{"P201":{"property_id":null,"unit_id":null}}');
 r:=public.ops_task_intake('save',sid,bad);
 if not exists(select 1 from public.ops_tasks where id=(r->'proposals'->0->>'task_id')::uuid and property_id is null and workflow_key='general' and due_at is null and intake_details->'due'->>'date'='2026-11-03') then raise exception 'General/date-only task incorrect';end if;
 -- Direct private-ledger writes must be denied, even to an editor.
 begin execute 'select * from ops_intake_private.items';raise exception 'Private ledger exposed';exception when insufficient_privilege then null;end;
end $$;
-- Another active editor/admin cannot read this user's private intake session.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$begin
 begin perform public.ops_task_intake('state',current_setting('ci.intake.session')::uuid);raise exception 'Cross-account session exposed';exception when invalid_parameter_value then null;end;
end $$;
-- Viewer, inactive and unknown members cannot use any intake RPC.
do $$declare id text;begin
 foreach id in array array['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005'] loop
  perform set_config('request.jwt.claim.sub',id,false);
  begin perform public.ops_task_intake('new');raise exception 'Unauthorized session created';exception when invalid_parameter_value then null;end;
 end loop;
end $$;
reset role;
set role anon;
do $$begin begin perform public.ops_task_intake('new');raise exception 'Anonymous RPC exposed';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'Task intake atomicity, idempotency, conflict and access checks passed' result;
