'use strict';
// Integration test for the actual migration transaction. Fictional CI databases only.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Requires disposable oaktown_portfolio_ci database');
const executable=process.env.OAKTOWN_PSQL_BIN||'psql',target='oaktown_hardening_failure_ci';
const root=path.resolve(__dirname,'..');
function sql(database,query,allowFailure=false){
 const r=spawnSync(executable,['-X','-v','ON_ERROR_STOP=1','-A','-t','-d',database],{input:query,encoding:'utf8',maxBuffer:2e6});
 if(r.error)throw r.error;
 if(r.status!==0&&!allowFailure)throw Error((r.stderr||r.stdout).slice(-2000));
 return r;
}
const ready=sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and to_regclass('ci.before_hardening_rpc') is not null and (select count(*)=13 from ci.baseline_properties);");
if(ready.stdout.trim()!=='t')throw Error('Fictional baseline sentinel missing');
const preflight=fs.readFileSync(path.join(root,'supabase/verification/portfolio-integrity-preflight.sql'),'utf8');
const clean=JSON.parse(sql('oaktown_portfolio_ci',preflight).stdout);
if(Object.values(clean.violations).some(n=>n!==0))throw Error('Normal workspace regressions left an inconsistent context or source reference');
let created=false;
try{
 sql('postgres',`create database ${target} template oaktown_portfolio_ci;`);created=true;
 sql(target,fs.readFileSync(path.join(root,'supabase/rollback/20261104220620_portfolio_record_links_and_event_attribution.sql'),'utf8'));
 sql(target,"insert into public.renewal_cases(unit_id,tenancy_id,oak_record_id) values(ci.id(1,1),ci.id(5,2),'CI-DIRTY-CONTEXT');");
 const dirty=JSON.parse(sql(target,preflight).stdout);
 if(dirty.violations.renewal_tenancy_unit!==1)throw Error('Read-only preflight failed to detect the mismatched fixture');
 const result=sql(target,fs.readFileSync(path.join(root,'supabase/migrations/20261104220620_portfolio_record_links_and_event_attribution.sql'),'utf8'),true);
 if(result.status===0||!result.stderr.includes('renewal_cases_tenancy_unit_fkey'))throw Error('Migration did not reject the existing mismatched context as expected');
 const preserved=sql(target,`select
  not exists(select 1 from pg_constraint where conname in ('leases_id_unit_id_key','renewal_cases_tenancy_unit_fkey'))
  and to_regclass('public.ops_tasks_archived_by_idx') is null
  and (select count(*)=1 from public.renewal_cases where oak_record_id='CI-DIRTY-CONTEXT' and unit_id=ci.id(1,1) and tenancy_id=ci.id(5,2))
  and (select pg_get_functiondef('public.ops_task_update_v1(uuid,timestamptz,jsonb)'::regprocedure)=definition from ci.before_hardening_rpc);`);
 if(preserved.stdout.trim()!=='t')throw Error('Rejected migration left partial schema changes or altered a source record');
 sql(target,"delete from public.renewal_cases where oak_record_id='CI-DIRTY-CONTEXT';");
 const definition=sql(target,"select pg_get_functiondef('public.ops_task_update_v1(uuid,timestamptz,jsonb)'::regprocedure);").stdout;
 const revised=definition.replace('actor uuid:=auth.uid();','actor uuid:=auth.uid(); -- CI concurrent revision');
 if(revised===definition)throw Error('Expected RPC baseline declaration missing');
 sql(target,revised);
 const changed=sql(target,fs.readFileSync(path.join(root,'supabase/migrations/20261104220620_portfolio_record_links_and_event_attribution.sql'),'utf8'),true);
 if(changed.status===0||!changed.stderr.includes('Today editor definition changed'))throw Error('Unreviewed RPC revision was overwritten');
 const untouched=sql(target,"select position('CI concurrent revision' in prosrc)>0 and to_regclass('public.ops_tasks_archived_by_idx') is null from pg_proc where oid='public.ops_task_update_v1(uuid,timestamptz,jsonb)'::regprocedure;");
 if(untouched.stdout.trim()!=='t')throw Error('RPC version check left partial changes');
 console.log('Existing mismatch rejected; migration rolled back atomically with the original record and RPC unchanged.');
 console.log('Unreviewed RPC revision rejected before any schema change.');
}finally{
 if(created)sql('postgres',`drop database ${target};`);
}
