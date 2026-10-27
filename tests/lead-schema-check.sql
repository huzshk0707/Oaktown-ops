-- Run only after setup + staged schema in the same disposable CI database.
\set ON_ERROR_STOP on
do $ci$
begin
  if current_database()<>'oaktown_schema_ci'
     or current_setting('oaktown.staged_test_only',true) is distinct from 'isolated_ci' then
    raise exception 'Disposable CI marker and database required.';
  end if;
end $ci$;

create schema test_harness;
grant usage on schema test_harness to anon, authenticated;
create function test_harness.assert_ok(ok boolean, label text) returns void
language plpgsql security invoker set search_path='' as $fn$
begin
  if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $fn$;
create function test_harness.denied(command text) returns void
language plpgsql security invoker set search_path='' as $fn$
begin
  begin execute command;
  exception when insufficient_privilege then return;
  end;
  raise exception 'Expected permission/RLS denial: %',command;
end $fn$;
grant execute on all functions in schema test_harness to anon, authenticated;

select test_harness.assert_ok(
 (select count(*)=3 and bool_and(relrowsecurity)
  from pg_class where oid in ('public.leads'::regclass,'public.lead_messages'::regclass,'public.lead_property_interests'::regclass)),
 'RLS enabled on every lead table');

set role anon;
select set_config('request.jwt.claim.sub','',false);
select test_harness.denied('select * from public.leads');
select test_harness.denied('select * from public.lead_messages');
select test_harness.denied('select * from public.lead_property_interests');
select test_harness.denied($q$insert into public.leads(full_name) values ('Fictional anonymous lead')$q$);
select test_harness.denied($q$update public.leads set status='closed'$q$);
select test_harness.denied('delete from public.leads');
reset role;

-- Active editor: allowed inserts, database-owned creator, and real stale-write test.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select test_harness.assert_ok(current_user='authenticated','tests execute as authenticated');
select test_harness.assert_ok((select count(*)=1 from public.staff_memberships),'membership reads only own row');
insert into public.leads(primary_property_id,full_name,source,screening)
 values ('10000000-0000-4000-8000-000000000001','Fictional Editor Lead','Other','{}');
select set_config('test.lead_id',id::text,false),
       set_config('test.old_updated_at',updated_at::text,false)
 from public.leads where full_name='Fictional Editor Lead';
select test_harness.assert_ok(
 (select created_by=auth.uid() from public.leads where id=current_setting('test.lead_id')::uuid),
 'creator defaults to editor identity');
insert into public.lead_messages(lead_id,direction,body)
 values (current_setting('test.lead_id')::uuid,'tenant','Fictional inquiry for CI only.');
insert into public.lead_property_interests(lead_id,property_id)
 values (current_setting('test.lead_id')::uuid,'10000000-0000-4000-8000-000000000001');
with changed as (
 update public.leads set status='waiting'
 where id=current_setting('test.lead_id')::uuid
 and updated_at=current_setting('test.old_updated_at')::timestamptz returning id
) select test_harness.assert_ok((select count(*)=1 from changed),'matching timestamp update succeeds');
select test_harness.assert_ok(
 (select updated_at>current_setting('test.old_updated_at')::timestamptz
  from public.leads where id=current_setting('test.lead_id')::uuid),
 'trigger advances updated_at');
with changed as (
 update public.leads set status='closed'
 where id=current_setting('test.lead_id')::uuid
 and updated_at=current_setting('test.old_updated_at')::timestamptz returning id
) select test_harness.assert_ok((select count(*)=0 from changed),'stale update changes no rows');
select test_harness.denied($q$insert into public.leads(full_name,created_by)
 values ('Spoofed fictional creator','00000000-0000-4000-8000-000000000002')$q$);
select test_harness.denied($q$update public.leads set created_by='00000000-0000-4000-8000-000000000002'$q$);
select test_harness.denied('update public.leads set updated_at=now()');
select test_harness.denied('update public.leads set id=gen_random_uuid()');
select test_harness.denied($q$insert into public.lead_messages(lead_id,direction,body,created_by)
 values (current_setting('test.lead_id')::uuid,'tenant','Fictional spoof attempt','00000000-0000-4000-8000-000000000002')$q$);
select test_harness.denied($q$update public.lead_messages set body='Changed fictional text'$q$);
select test_harness.denied('update public.lead_property_interests set lead_id=gen_random_uuid()');
select test_harness.denied('delete from public.leads');
select test_harness.denied('delete from public.lead_messages');
select test_harness.denied('delete from public.lead_property_interests');

-- Admin can create and edit a shared record created by another approved editor.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
insert into public.leads(primary_property_id,full_name)
 values ('10000000-0000-4000-8000-000000000001','Fictional Admin Lead');
select test_harness.assert_ok(
 (select created_by=auth.uid() from public.leads where full_name='Fictional Admin Lead'),
 'creator defaults to admin identity');
with changed as (
 update public.leads set status='review'
 where id=current_setting('test.lead_id')::uuid returning id
) select test_harness.assert_ok((select count(*)=1 from changed),'admin may update shared lead');
insert into public.lead_messages(lead_id,direction,body)
 values (current_setting('test.lead_id')::uuid,'internal','Fictional reviewed note.');
with changed as (
 update public.lead_property_interests set interest_status='viewing'
 where lead_id=current_setting('test.lead_id')::uuid returning lead_id
) select test_harness.assert_ok((select count(*)=1 from changed),'admin may update interest');
select test_harness.denied('delete from public.leads');

-- Viewer sees shared data, but cannot insert or change it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select test_harness.assert_ok((select count(*)=2 from public.leads),'viewer reads shared leads');
select test_harness.assert_ok((select count(*)=2 from public.lead_messages),'viewer reads messages');
select test_harness.assert_ok((select count(*)=1 from public.lead_property_interests),'viewer reads interests');
select test_harness.denied($q$insert into public.leads(full_name) values ('Fictional viewer lead')$q$);
select test_harness.denied($q$insert into public.lead_messages(lead_id,direction,body)
 values (current_setting('test.lead_id')::uuid,'tenant','Fictional denied message')$q$);
select test_harness.denied($q$insert into public.lead_property_interests(lead_id,property_id)
 select id,'10000000-0000-4000-8000-000000000001'::uuid from public.leads where full_name='Fictional Admin Lead'$q$);
with changed as (update public.leads set status='closed' returning id)
 select test_harness.assert_ok((select count(*)=0 from changed),'viewer updates no lead');
with changed as (update public.lead_property_interests set interest_status='closed' returning lead_id)
 select test_harness.assert_ok((select count(*)=0 from changed),'viewer updates no interest');
select test_harness.denied('delete from public.leads');

-- Both inactive staff and users without a membership see and change no records.
do $checks$
declare actor text; changed integer;
begin
 foreach actor in array array[
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005'
 ] loop
  perform set_config('request.jwt.claim.sub',actor,false);
  perform test_harness.assert_ok((select count(*)=0 from public.leads),'unapproved/inactive leads hidden');
  perform test_harness.assert_ok((select count(*)=0 from public.lead_messages),'unapproved/inactive messages hidden');
  perform test_harness.assert_ok((select count(*)=0 from public.lead_property_interests),'unapproved/inactive interests hidden');
  perform test_harness.denied($q$insert into public.leads(full_name) values ('Fictional blocked lead')$q$);
  perform test_harness.denied($q$insert into public.lead_messages(lead_id,direction,body)
   values (current_setting('test.lead_id')::uuid,'tenant','Fictional blocked message')$q$);
  perform test_harness.denied($q$insert into public.lead_property_interests(lead_id,property_id)
   values (current_setting('test.lead_id')::uuid,'10000000-0000-4000-8000-000000000001')$q$);
  update public.leads set status='closed'; get diagnostics changed=row_count;
  perform test_harness.assert_ok(changed=0,'unapproved/inactive update denied by RLS');
  update public.lead_property_interests set interest_status='closed'; get diagnostics changed=row_count;
  perform test_harness.assert_ok(changed=0,'unapproved/inactive interest update denied by RLS');
  perform test_harness.denied('delete from public.leads');
 end loop;
end $checks$;
reset role;
select test_harness.assert_ok((select count(*)=2 from public.leads),'denials left fixtures unchanged');
select 'PASS: staged lead schema role, ownership, stale-write and delete checks' as result;
