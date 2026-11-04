-- Disposable PostgreSQL only. All identities and operational rows are fictional.
\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;

create table ci.before_hardening as
 select 'units' as name,jsonb_agg(to_jsonb(t) order by id) as rows from public.units t
 union all select 'tenancies',jsonb_agg(to_jsonb(t) order by id) from public.tenancies t
 union all select 'leases',jsonb_agg(to_jsonb(t) order by id) from public.leases t
 union all select 'renewal_cases',jsonb_agg(to_jsonb(t) order by id) from public.renewal_cases t
 union all select 'ops_tasks',jsonb_agg(to_jsonb(t) order by id) from public.ops_tasks t
 union all select 'ops_events',jsonb_agg(to_jsonb(t) order by id) from public.ops_events t;
create table ci.before_hardening_rpc as
 select pg_get_functiondef('public.ops_task_update_v1(uuid,timestamptz,jsonb)'::regprocedure) as definition;
create table ci.before_hardening_constraints as
 select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated)
  order by conrelid::regclass::text,conname) as definitions
 from pg_constraint where conrelid in ('public.units'::regclass,'public.tenancies'::regclass,'public.leases'::regclass,'public.renewal_cases'::regclass,'public.ops_tasks'::regclass);

\ir ../supabase/migrations/20261104220620_portfolio_record_links_and_event_attribution.sql

do $$declare baseline record; actual jsonb;begin
 for baseline in select * from ci.before_hardening loop
  execute format('select jsonb_agg(to_jsonb(t) order by id) from public.%I t',baseline.name) into actual;
  perform ci.assert_true(actual is not distinct from baseline.rows,'migration preserves existing '||baseline.name||' rows');
 end loop;
 perform ci.assert_true((select count(*)=10 and bool_and(convalidated) from pg_constraint where conname in (
  'renewal_cases_unit_property_fkey','renewal_cases_tenancy_unit_fkey','renewal_cases_lease_unit_fkey','renewal_cases_lease_tenancy_fkey','renewal_cases_linked_unit_required',
  'ops_tasks_unit_property_fkey','ops_tasks_tenancy_unit_fkey','ops_tasks_lease_unit_fkey','ops_tasks_lease_tenancy_fkey','ops_tasks_linked_unit_required'
 )),'all new relationships validated');
 perform ci.assert_true(not exists(
  select 1 from pg_constraint fk where fk.conrelid in ('public.renewal_cases'::regclass,'public.ops_tasks'::regclass) and fk.contype='f'
  and not exists(select 1 from pg_index ix where ix.indrelid=fk.conrelid and ix.indisvalid and ix.indpred is null
   and ix.indnkeyatts>=cardinality(fk.conkey) and not exists(
    select 1 from unnest(fk.conkey) with ordinality c(attnum,pos) where ix.indkey[c.pos::integer-1]<>c.attnum
   ))
 ),'relationship lookups have supporting indexes');
end $$;

begin;
select set_config('request.jwt.claim.sub','',true);
insert into public.units(id,property_id,unit_label) values
 (ci.id(80,1),'10000000-0000-4000-8000-000000000001','Hardening A'),
 (ci.id(80,2),'10000000-0000-4000-8000-000000000002','Hardening B');
insert into public.tenancies(id,unit_id) values
 (ci.id(81,1),ci.id(80,1)),(ci.id(81,2),ci.id(80,2)),(ci.id(81,3),ci.id(80,1));
insert into public.leases(id,unit_id,tenancy_id) values
 (ci.id(82,1),ci.id(80,1),ci.id(81,1)),(ci.id(82,2),ci.id(80,2),ci.id(81,2)),
 (ci.id(82,3),ci.id(80,1),ci.id(81,3)),(ci.id(82,4),ci.id(80,1),null);
insert into public.renewal_cases(id,property_id,unit_id,tenancy_id,lease_id) values
 (ci.id(83,1),'10000000-0000-4000-8000-000000000001',ci.id(80,1),ci.id(81,1),ci.id(82,1)),
 (ci.id(83,2),'10000000-0000-4000-8000-000000000002',null,null,null),
 (ci.id(83,3),null,ci.id(80,1),null,ci.id(82,4));
insert into public.ops_tasks(id,property_id,unit_id,tenancy_id,lease_id,renewal_case_id,workflow_key,task_title) values
 (ci.id(84,1),'10000000-0000-4000-8000-000000000001',ci.id(80,1),ci.id(81,1),ci.id(82,1),ci.id(83,1),'renewal','Fictional linked task'),
 (ci.id(84,2),null,null,null,null,null,'general','Fictional general task'),
 (ci.id(84,3),'10000000-0000-4000-8000-000000000002',null,null,null,ci.id(83,2),'renewal','Fictional property-level task'),
 (ci.id(84,4),null,ci.id(80,1),null,ci.id(82,4),null,'renewal','Fictional unknown-tenancy task');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select ci.expect_error($q$insert into public.renewal_cases(unit_id,property_id) values(ci.id(80,1),'10000000-0000-4000-8000-000000000002')$q$,'23503','renewal rejects another property');
select ci.expect_error($q$insert into public.renewal_cases(unit_id,tenancy_id) values(ci.id(80,1),ci.id(81,2))$q$,'23503','renewal rejects another unit tenancy');
select ci.expect_error($q$insert into public.renewal_cases(unit_id,lease_id) values(ci.id(80,1),ci.id(82,2))$q$,'23503','renewal rejects another unit lease');
select ci.expect_error($q$insert into public.renewal_cases(unit_id,tenancy_id,lease_id) values(ci.id(80,1),ci.id(81,1),ci.id(82,3))$q$,'23503','renewal rejects another tenancy in the same unit');
select ci.expect_error($q$insert into public.renewal_cases(property_id,tenancy_id) values('10000000-0000-4000-8000-000000000001',ci.id(81,1))$q$,'23514','linked renewal needs explicit unit context');
select ci.expect_error($q$insert into public.ops_tasks(unit_id,property_id,workflow_key,task_title) values(ci.id(80,1),'10000000-0000-4000-8000-000000000002','renewal','Bad')$q$,'23503','task rejects another property');
select ci.expect_error($q$insert into public.ops_tasks(unit_id,tenancy_id,workflow_key,task_title) values(ci.id(80,1),ci.id(81,2),'renewal','Bad')$q$,'23503','task rejects another unit tenancy');
select ci.expect_error($q$insert into public.ops_tasks(unit_id,lease_id,workflow_key,task_title) values(ci.id(80,1),ci.id(82,2),'renewal','Bad')$q$,'23503','task rejects another unit lease');
select ci.expect_error($q$insert into public.ops_tasks(unit_id,tenancy_id,lease_id,workflow_key,task_title) values(ci.id(80,1),ci.id(81,1),ci.id(82,3),'renewal','Bad')$q$,'23503','task rejects another tenancy in the same unit');
select ci.expect_error($q$insert into public.ops_tasks(property_id,lease_id,workflow_key,task_title) values('10000000-0000-4000-8000-000000000001',ci.id(82,1),'renewal','Bad')$q$,'23514','linked task needs explicit unit context');
select ci.expect_error($q$update public.renewal_cases set tenancy_id=ci.id(81,3) where id=ci.id(83,1)$q$,'23503','renewal updates preserve lease tenancy');
select ci.expect_error($q$update public.ops_tasks set lease_id=ci.id(82,3) where id=ci.id(84,1)$q$,'23503','direct task updates preserve lease tenancy');
select ci.expect_error($q$update public.units set property_id='10000000-0000-4000-8000-000000000002' where id=ci.id(80,1)$q$,'23503','parent unit move cannot invalidate child property context');
select ci.expect_error($q$update public.leases set unit_id=ci.id(80,2) where id=ci.id(82,4)$q$,'23503','parent lease move cannot invalidate children even when tenancy is unknown');
select ci.expect_error($q$update public.leases set tenancy_id=ci.id(81,3) where id=ci.id(82,1)$q$,'23503','parent lease tenancy change cannot invalidate children');
update public.ops_tasks set status='waiting' where id=ci.id(84,2);
update public.renewal_cases set notes='Fictional property-level update' where id=ci.id(83,2);

-- An explicitly selected new lease in the SAME unit must clear the old tenancy.
do $$declare v timestamptz;result jsonb;begin
 select updated_at into v from public.ops_tasks where id=ci.id(84,1);
 result:=public.ops_task_update_v1(ci.id(84,1),v,jsonb_build_object(
  'task_title','Fictional switched lease','property_id','10000000-0000-4000-8000-000000000001',
  'unit_id',ci.id(80,1),'lease_id',ci.id(82,3),'renewal_case_id',null,'status','waiting','priority','normal',
  'assigned_label',null,'due_date',null,'follow_up_date',null,'next_action',null,'notes',null));
 perform ci.assert_true((select lease_id=ci.id(82,3) and tenancy_id is null from public.ops_tasks where id=ci.id(84,1)),'same-unit lease switch clears the old tenancy');
 perform ci.assert_true((select count(*)=1 from public.ops_events where entity_id=ci.id(84,1) and event_type='task_updated_from_today'),'reviewed RPC still appends one journal entry');
end $$;

do $$declare e public.ops_events%rowtype;started timestamptz:=clock_timestamp();begin
 insert into public.ops_events(entity_type,entity_id,event_type,actor_id,occurred_at,event_metadata)
 values('task',ci.id(84,1),'fictional_attribution','00000000-0000-4000-8000-000000000002','1900-01-01',
  '{"work_date":"2026-10-31","minutes":10}') returning * into e;
 perform ci.assert_true(e.actor_id=auth.uid(),'caller cannot impersonate another staff member');
 perform ci.assert_true(e.occurred_at between started and clock_timestamp(),'receipt timestamp is server owned');
 perform ci.assert_true(e.event_metadata->>'work_date'='2026-10-31','reported work date is preserved separately');
 insert into public.ops_events(entity_type,entity_id,event_type) values('task',ci.id(84,1),'fictional_missing_actor') returning * into e;
 perform ci.assert_true(e.actor_id=auth.uid(),'omitted actor is filled from authenticated identity');
end $$;
select ci.expect_error($q$update public.ops_events set actor_id=null$q$,'42501','journal remains append-only to clients');

do $$declare who text;begin
 foreach who in array array['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005',''] loop
  perform set_config('request.jwt.claim.sub',who,true);
  perform ci.expect_error($q$insert into public.ops_events(entity_type,entity_id,event_type) values('task',ci.id(84,1),'not_allowed')$q$,'42501','unapproved journal insert rejected');
 end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into public.ops_events(entity_type,entity_id,event_type,actor_id,occurred_at)
 values('task',ci.id(84,1),'fictional_admin_import','00000000-0000-4000-8000-000000000001','2000-01-01');
select ci.assert_true((select occurred_at='2000-01-01'::timestamptz from public.ops_events where event_type='fictional_admin_import'),'trusted historical administrator import retains its supplied receipt time');
rollback;

-- Rehearse the reviewed rollback, verify preservation, then restore new guards so
-- the remaining CI intake/Today/archive tests exercise the hardened schema.
\ir ../supabase/rollback/20261104220620_portfolio_record_links_and_event_attribution.sql
select ci.assert_true((select pg_get_functiondef('public.ops_task_update_v1(uuid,timestamptz,jsonb)'::regprocedure)=definition from ci.before_hardening_rpc),'rollback restores the prior RPC definition');
select ci.assert_true((select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated)
 order by conrelid::regclass::text,conname) from pg_constraint where conrelid in ('public.units'::regclass,'public.tenancies'::regclass,'public.leases'::regclass,'public.renewal_cases'::regclass,'public.ops_tasks'::regclass))=
 (select definitions from ci.before_hardening_constraints),'rollback preserves every preexisting relationship constraint');
do $$declare baseline record;actual jsonb;begin
 for baseline in select * from ci.before_hardening loop
  execute format('select jsonb_agg(to_jsonb(t) order by id) from public.%I t',baseline.name) into actual;
  perform ci.assert_true(actual is not distinct from baseline.rows,'rollback preserves existing '||baseline.name||' rows');
 end loop;
end $$;
\ir ../supabase/migrations/20261104220620_portfolio_record_links_and_event_attribution.sql
select 'Portfolio relationship guards, server attribution, same-unit lease changes and schema-only rollback passed' as result;
