-- Disposable PostgreSQL regression tests; never run against a Supabase project.
\set ON_ERROR_STOP on
do $ci$ begin
 if current_database()<>'oaktown_portfolio_ci' then
  raise exception 'Requires disposable oaktown_portfolio_ci database.';
 end if;
end $ci$;

create function ci.assert_true(ok boolean,label text) returns void
language plpgsql security invoker set search_path='' as $fn$
begin if ok is distinct from true then raise exception 'Assertion failed: %',label; end if; end $fn$;
create function ci.expect_error(statement text,expected_state text,label text) returns void
language plpgsql security invoker set search_path='' as $fn$
begin
 begin execute statement;
 exception when others then
  if sqlstate=expected_state then return; end if;
  raise exception '%: expected SQLSTATE %, got % (%)',label,expected_state,sqlstate,sqlerrm;
 end;
 raise exception '%: expected SQLSTATE %, statement succeeded',label,expected_state;
end $fn$;
create function ci.id(kind integer,number integer) returns uuid
language sql immutable security invoker set search_path='' as $fn$
 select ((20000000+kind)::text||'-0000-4000-8000-'||lpad(number::text,12,'0'))::uuid
$fn$;
create function ci.fixture_id(kind integer) returns uuid
language sql stable security invoker set search_path='' as $fn$
 select ci.id(kind,current_setting('oaktown.fixture_number')::integer)
$fn$;

-- Before exercising writes: additive migrations must preserve every existing row.
select ci.assert_true((select count(*)=13 from public.properties),'13 original properties preserved');
select ci.assert_true(not exists(
 select 1 from ci.baseline_properties b left join public.properties p on p.id=b.id
 where p.id is null or (to_jsonb(p)-array['portfolio_id','asset_class','portfolio_state','portfolio_notes','portfolio_verified_at']) is distinct from b.row_data
),'property UUIDs and all original fields unchanged by migrations');
select ci.assert_true((select count(*)=13 from public.property_addressees)
 and not exists(select 1 from ci.baseline_addressees b left join public.property_addressees a on a.id=b.id where to_jsonb(a) is distinct from b.row_data),'notice addressees unchanged');
select ci.assert_true(not exists(select 1 from ci.baseline_batches b left join public.notice_batches n on n.id=b.id where to_jsonb(n) is distinct from b.row_data),'v0.4 batches unchanged');
select ci.assert_true(not exists(select 1 from ci.baseline_staff b left join public.staff_memberships s on s.user_id=b.user_id where to_jsonb(s) is distinct from b.row_data),'staff membership unchanged');

-- One valid fixture per table, in dependency order. Only fictional identifiers/data.
create table ci.cases(kind integer primary key,table_name text unique,insert_sql text,update_column text);
insert into ci.cases values
 (1,'units',$q$insert into public.units(id,property_id,unit_label) values(ci.fixture_id(1),'10000000-0000-4000-8000-000000000001','Unit '||current_setting('oaktown.fixture_number'))$q$,'notes'),
 (2,'property_aliases',$q$insert into public.property_aliases(id,property_id,alias) values(ci.fixture_id(2),'10000000-0000-4000-8000-000000000001','Fictional address alias '||current_setting('oaktown.fixture_number'))$q$,'source_note'),
 (3,'unit_aliases',$q$insert into public.unit_aliases(id,unit_id,alias) values(ci.fixture_id(3),ci.fixture_id(1),'Fictional unit alias')$q$,'source_note'),
 (4,'people',$q$insert into public.people(id,display_name) values(ci.fixture_id(4),'Fictional Person')$q$,'notes'),
 (5,'tenancies',$q$insert into public.tenancies(id,unit_id,move_in_date,move_out_date) values(ci.fixture_id(5),ci.fixture_id(1),'2026-01-01','2026-12-31')$q$,'notes'),
 (6,'tenancy_people',$q$insert into public.tenancy_people(id,tenancy_id,person_id) values(ci.fixture_id(6),ci.fixture_id(5),ci.fixture_id(4))$q$,'party_role'),
 (7,'leases',$q$insert into public.leases(id,unit_id,tenancy_id,term_start,term_end) values(ci.fixture_id(7),ci.fixture_id(1),ci.fixture_id(5),'2026-01-01','2026-12-31')$q$,'notes'),
 (8,'lease_signatures',$q$insert into public.lease_signatures(id,lease_id,person_id) values(ci.fixture_id(8),ci.fixture_id(7),ci.fixture_id(4))$q$,'notes'),
 (9,'rent_schedules',$q$insert into public.rent_schedules(id,lease_id,amount_usd) values(ci.fixture_id(9),ci.fixture_id(7),1234.56)$q$,'notes'),
 (10,'bookings',$q$insert into public.bookings(id,unit_id,guest_person_id,check_in,check_out) values(ci.fixture_id(10),ci.fixture_id(1),ci.fixture_id(4),'2026-11-01','2026-11-03')$q$,'notes'),
 (11,'renewal_cases',$q$insert into public.renewal_cases(id,unit_id,tenancy_id,lease_id,fixed_offer_reference_usd) values(ci.fixture_id(11),ci.fixture_id(1),ci.fixture_id(5),ci.fixture_id(7),1500)$q$,'notes'),
 (12,'ops_tasks',$q$insert into public.ops_tasks(id,property_id,unit_id,tenancy_id,renewal_case_id,workflow_key,task_title) values(ci.fixture_id(12),'10000000-0000-4000-8000-000000000001',ci.fixture_id(1),ci.fixture_id(5),ci.fixture_id(11),'renewal','Fictional follow-up task')$q$,'notes'),
 (13,'import_batches',$q$insert into public.import_batches(id,source_name,source_type,source_checksum,row_count) values(ci.fixture_id(13),'Fictional workbook','ci',current_setting('oaktown.fixture_number'),1)$q$,'notes'),
 (14,'source_links',$q$insert into public.source_links(id,import_batch_id,source_sheet,source_row,entity_type,entity_id) values(ci.fixture_id(14),ci.fixture_id(13),'Fictional sheet',1,'unit',ci.fixture_id(1))$q$,'reconciliation_status'),
 (15,'verification_issues',$q$insert into public.verification_issues(id,property_id,unit_id,issue_type,description) values(ci.fixture_id(15),'10000000-0000-4000-8000-000000000001',ci.fixture_id(1),'ci','Fictional verification item')$q$,'resolution_note'),
 (16,'ops_events',$q$insert into public.ops_events(id,entity_type,entity_id,event_type,event_metadata) values(ci.fixture_id(16),'unit',ci.fixture_id(1),'ci_test','{"fictional":true}')$q$,null);
grant usage on schema ci to anon,authenticated;
grant select on ci.cases to anon,authenticated;
grant execute on all functions in schema ci to anon,authenticated;

do $checks$
declare item record; count_rows bigint;
begin
 perform ci.assert_true((select count(*)=16 from ci.cases),'exactly 16 portfolio tables tested');
 for item in select * from ci.cases order by kind loop
  perform ci.assert_true((select c.relrowsecurity from pg_class c where c.oid=('public.'||item.table_name)::regclass),item.table_name||' enables RLS');
  perform ci.assert_true(not has_table_privilege('anon','public.'||item.table_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),item.table_name||' has no anonymous grants');
  perform ci.assert_true(not has_table_privilege('authenticated','public.'||item.table_name,'DELETE,TRUNCATE'),item.table_name||' denies client delete/truncate');
  if item.table_name<>'ops_events' then
   perform ci.assert_true((select count(*)=1 from pg_policy p where p.polrelid=('public.'||item.table_name)::regclass and p.polcmd='w' and p.polqual is not null and p.polwithcheck is not null),item.table_name||' update checks old and new row');
  end if;
  execute format('select count(*) from public.%I',item.table_name) into count_rows;
  perform ci.assert_true(count_rows=0,item.table_name||' migration contains no imported records');
 end loop;
 -- Every new FK has a valid, nonpartial index whose leading columns cover it.
 perform ci.assert_true(not exists(
  select 1 from pg_constraint fk join ci.cases c on fk.conrelid=('public.'||c.table_name)::regclass
  where fk.contype='f' and not exists(
   select 1 from pg_index ix where ix.indrelid=fk.conrelid and ix.indisvalid and ix.indpred is null
    and ix.indnkeyatts>=cardinality(fk.conkey)
    and not exists(select 1 from unnest(fk.conkey) with ordinality col(attnum,pos) where ix.indkey[col.pos::integer-1]<>col.attnum)
  )
 ),'all portfolio foreign keys have supporting indexes');
 perform set_config('oaktown.fixture_number','1',false);
 for item in select * from ci.cases order by kind loop execute item.insert_sql; end loop;
end $checks$;

create function ci.anonymous_matrix() returns void
language plpgsql security invoker set search_path='' as $fn$
declare item record;
begin
 perform set_config('request.jwt.claim.sub','',false);
 perform set_config('oaktown.fixture_number','9',false);
 for item in select * from ci.cases order by kind loop
  perform ci.expect_error(format('select * from public.%I',item.table_name),'42501','anon read '||item.table_name);
  perform ci.expect_error(item.insert_sql,'42501','anon insert '||item.table_name);
  perform ci.expect_error(format('update public.%I set id=id',item.table_name),'42501','anon update '||item.table_name);
  perform ci.expect_error(format('delete from public.%I',item.table_name),'42501','anon delete '||item.table_name);
  perform ci.expect_error(format('truncate public.%I',item.table_name),'42501','anon truncate '||item.table_name);
 end loop;
end $fn$;
create function ci.role_matrix(subject text,readable boolean,writable boolean,fixture integer,label text) returns void
language plpgsql security invoker set search_path='' as $fn$
declare item record; visible bigint; affected bigint;
begin
 perform set_config('request.jwt.claim.sub',subject,false);
 perform set_config('oaktown.fixture_number',fixture::text,false);
 for item in select * from ci.cases order by kind loop
  execute format('select count(*) from public.%I',item.table_name) into visible;
  perform ci.assert_true(case when readable then visible>0 else visible=0 end,label||' read '||item.table_name);
  if writable then execute item.insert_sql;
  else perform ci.expect_error(item.insert_sql,'42501',label||' insert '||item.table_name);
  end if;
  if item.table_name='ops_events' then
   perform ci.expect_error('update public.ops_events set summary=''changed''','42501',label||' event journal is append-only');
  else
   execute format('update public.%I set %I=%L where id=ci.id(%s,1)',item.table_name,item.update_column,'Fictional CI role update',item.kind);
   get diagnostics affected=row_count;
   perform ci.assert_true(affected=case when writable then 1 else 0 end,label||' update '||item.table_name);
  end if;
  perform ci.expect_error(format('delete from public.%I',item.table_name),'42501',label||' delete '||item.table_name);
  perform ci.expect_error(format('truncate public.%I',item.table_name),'42501',label||' truncate '||item.table_name);
 end loop;
 raise notice 'Passed all 16 tables for %',label;
end $fn$;
grant execute on function ci.anonymous_matrix(),ci.role_matrix(text,boolean,boolean,integer,text) to anon,authenticated;
set role anon;
select ci.anonymous_matrix();
reset role;
set role authenticated;
select ci.role_matrix('00000000-0000-4000-8000-000000000001',true,true,2,'active editor');
select ci.role_matrix('00000000-0000-4000-8000-000000000002',true,true,3,'active administrator');
select ci.role_matrix('00000000-0000-4000-8000-000000000003',true,false,4,'viewer');
select ci.role_matrix('00000000-0000-4000-8000-000000000004',false,false,5,'inactive editor');
select ci.role_matrix('00000000-0000-4000-8000-000000000005',false,false,6,'unapproved account');
select ci.role_matrix('',false,false,7,'authenticated role without user identity');
reset role;

-- Uniqueness and relational integrity: reject duplicates and mixed-unit leases.
select ci.expect_error($q$insert into public.units(property_id,unit_label) values('10000000-0000-4000-8000-000000000001','  uNiT 1  ')$q$,'23505','unit labels normalize case and surrounding spaces');
insert into public.units(id,property_id,unit_label,unit_code)
 values(ci.id(99,1),'10000000-0000-4000-8000-000000000002','Unit 1','FICTIONAL-OTHER-UNIT');
select ci.expect_error($q$insert into public.units(property_id,unit_label,unit_code) values('10000000-0000-4000-8000-000000000002','Another label','FICTIONAL-OTHER-UNIT')$q$,'23505','unit codes are globally unique');
select ci.expect_error($q$insert into public.units(property_id,unit_label) values('10000000-0000-4000-8000-000000000001','   ')$q$,'23514','unit label must be nonblank');
select ci.expect_error($q$insert into public.leases(unit_id,tenancy_id) values(ci.id(99,1),ci.id(5,1))$q$,'23503','lease tenancy must belong to its unit');
select ci.expect_error($q$update public.leases set unit_id=ci.id(99,1) where id=ci.id(7,1)$q$,'23503','lease update cannot cross unit tenancy');
select ci.expect_error($q$update public.tenancies set unit_id=ci.id(99,1) where id=ci.id(5,1)$q$,'23503','tenancy cannot move away from its existing lease');
select ci.expect_error($q$insert into public.leases(unit_id,term_start,term_end) values(ci.id(1,1),'2026-12-31','2026-01-01')$q$,'23514','lease term date order');
select ci.expect_error($q$insert into public.tenancies(unit_id,move_in_date,move_out_date) values(ci.id(1,1),'2026-12-31','2026-01-01')$q$,'23514','tenancy move date order');
select ci.expect_error($q$insert into public.rent_schedules(lease_id,amount_usd) values(ci.id(7,1),-1)$q$,'23514','negative contracted rent rejected');
select ci.expect_error($q$insert into public.lease_signatures(lease_id,signer_name) values(ci.id(7,1),' ')$q$,'23514','signature requires a person or name');
select ci.expect_error($q$insert into public.bookings(unit_id,check_in,check_out) values(ci.id(1,1),'2026-11-03','2026-11-01')$q$,'23514','booking date order');
select ci.expect_error($q$insert into public.ops_tasks(workflow_key,task_title) values('ci','Fictional task without context')$q$,'23514','task requires entity context');
select ci.assert_true((select amount_usd=1234.56 from public.rent_schedules where id=ci.id(9,1)) and (select fixed_offer_reference_usd=1500 from public.renewal_cases where id=ci.id(11,1)),'contracted rent and renewal offer references remain separate');

update public.properties set portfolio_id='FICTIONAL-P1',asset_class='fictional_class',
 portfolio_state='needs_review',portfolio_notes='Fictional portfolio metadata',
 portfolio_verified_at='2026-10-26T00:00:00Z'
 where id='10000000-0000-4000-8000-000000000001';
select ci.expect_error($q$update public.properties set portfolio_id='FICTIONAL-P1' where id='10000000-0000-4000-8000-000000000002'$q$,'23505','non-null portfolio IDs unique');

-- Real v0.4 RPC implementations must still work after both portfolio migrations.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $compatibility$
declare old_stamp timestamptz; saved jsonb; made jsonb; batch jsonb; new_batch jsonb; new_property_id uuid;
 p jsonb='{"street_address":"101 Fictional Lane","unit":"","city":"Example City","state":"KY","postal_code":"00000","landlord_entity":"Fictional Updated Owner","tenant":"Fictional Updated Household & All Occupants"}';
 payload jsonb='{"notices":[{"id":"fictional-notice-2","charges":[]}],"properties":[]}';
begin
 select updated_at into old_stamp from public.properties where id='10000000-0000-4000-8000-000000000001';
 saved=public.save_property('10000000-0000-4000-8000-000000000001',old_stamp,p);
 perform ci.assert_true(saved->'property'->>'id'='10000000-0000-4000-8000-000000000001','v0.4 edit preserves property UUID');
 perform ci.assert_true(saved->'property'->>'portfolio_id'='FICTIONAL-P1'
  and saved->'property'->>'asset_class'='fictional_class'
  and saved->'property'->>'portfolio_state'='needs_review'
  and saved->'property'->>'portfolio_notes'='Fictional portfolio metadata'
  and (saved->'property'->>'portfolio_verified_at')::timestamptz='2026-10-26T00:00:00Z'::timestamptz,'v0.4 edit preserves new portfolio metadata');
 perform ci.assert_true(saved->>'notice_addressee_text'='Fictional Updated Household & All Occupants','v0.4 addressee update succeeds');
 perform ci.expect_error(format('select public.save_property(%L,%L::timestamptz,%L::jsonb)','10000000-0000-4000-8000-000000000001',old_stamp,p::text),'40001','v0.4 property optimistic conflict remains enforced');
 made=public.save_property(null,null,p||'{"street_address":"999 Fictional New Road","tenant":"Fictional New Household"}'::jsonb);
 new_property_id=(made->'property'->>'id')::uuid;
 perform ci.assert_true(new_property_id is not null and new_property_id<>'10000000-0000-4000-8000-000000000001'::uuid,'v0.4 create produces separate property UUID');
 perform ci.assert_true((select count(*)=1 from public.property_addressees where property_id=new_property_id),'v0.4 create also writes notice addressee');

 batch=public.save_notice_batch(null,null,'Fictional regression batch',payload);
 perform ci.assert_true((batch->>'version')::integer=1,'v0.4 batch starts at version 1');
 new_batch=public.save_notice_batch((batch->>'id')::uuid,1,'Fictional updated batch',payload);
 perform ci.assert_true((new_batch->>'version')::integer=2,'v0.4 batch save increments version');
 perform ci.expect_error(format('select public.save_notice_batch(%L::uuid,1,%L,%L::jsonb)',batch->>'id','Fictional stale batch',payload::text),'40001','v0.4 batch optimistic conflict remains enforced');
end $compatibility$;
reset role;

select ci.assert_true(not exists(select 1 from ci.baseline_properties b left join public.properties p on p.id=b.id where p.id is null),'all 13 original UUIDs remain after property edits and creation');
select ci.assert_true(not exists(select 1 from ci.baseline_batches b left join public.notice_batches n on n.id=b.id where to_jsonb(n) is distinct from b.row_data),'preexisting notice batch/sourcePropertyId preserved after RPC tests');
select ci.assert_true(to_regclass('public.leads') is null and to_regclass('public.lead_messages') is null,'portfolio replay does not activate staged Lead Copilot');
select 'PASS: portfolio migrations, 16-table role matrix, relational constraints, original UUID preservation and v0.4 RPC compatibility' as result;
