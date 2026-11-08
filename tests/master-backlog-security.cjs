'use strict';
// Actual concurrent sessions and guarded rollback; fictional CI databases only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Requires disposable oaktown_portfolio_ci database');
const executable=process.env.OAKTOWN_PSQL_BIN||'psql',target='oaktown_master_backlog_security_ci';
function sql(database,input,allowFailure=false){
 const r=spawnSync(executable,['-X','-At','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:15000,maxBuffer:2e6});
 if(r.error)throw r.error;
 if(r.status!==0&&!allowFailure)throw Error((r.stderr||r.stdout).slice(-2000));
 return r;
}
const ready=sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and to_regclass('ci.before_hardening_rpc') is not null and (select count(*)=13 from ci.baseline_properties) and (select count(*)=3 from public.ops_tasks where task_code in ('W03','M12','M13'));");
assert.equal(ready.stdout.trim(),'t','Fictional baseline sentinel missing');
const auth="set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);";
const A='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',B='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';
const sessions=[];
function session(name){
 const child=spawn(executable,['-X','-At','-v','ON_ERROR_STOP=1','-d',target],{env:{...process.env,PGAPPNAME:name}});
 const s={child,out:'',err:'',closed:false};sessions.push(s);
 child.stdout.on('data',d=>{s.out+=d});child.stderr.on('data',d=>{s.err+=d});
 s.done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{s.closed=true;resolve(code)})});
 s.send=q=>child.stdin.write(q+'\n');
 return s;
}
async function until(predicate,label){
 const end=Date.now()+10000;
 while(Date.now()<end){if(predicate())return;await new Promise(r=>setTimeout(r,25))}
 throw Error('Timed out: '+label);
}
async function main(){
 let created=false;
 try{
  sql('postgres',`create database ${target} template oaktown_portfolio_ci;`);created=true;
  sql(target,`insert into public.ops_tasks(id,workflow_key,task_title,status) values('${A}','general','Fictional concurrent parent A','pending'),('${B}','general','Fictional concurrent parent B','pending');`);
  const a=session('oaktown_parent_a'),b=session('oaktown_parent_b');
  a.send(`begin;set local statement_timeout='12s';${auth}update public.ops_tasks set parent_task_id='${B}' where id='${A}';\n\\echo A_READY`);
  await until(()=>a.out.includes('A_READY')||a.closed,'first parent update');
  assert.ok(a.out.includes('A_READY'),a.err);
  b.child.stdin.end(`set statement_timeout='12s';${auth}update public.ops_tasks set parent_task_id='${A}' where id='${B}';\n`);
  await until(()=>b.closed||sql(target,"select exists(select 1 from pg_stat_activity where application_name='oaktown_parent_b' and wait_event_type='Lock');").stdout.trim()==='t','competing parent update');
  a.child.stdin.end('commit;\n');
  assert.equal(await a.done,0,a.err);
  assert.notEqual(await b.done,0,'Concurrent cyclic update committed');
  assert.match(b.err,/Circular task parent link|could not serialize|deadlock detected/);
  assert.equal(sql(target,`select parent_task_id is null from public.ops_tasks where id='${B}';`).stdout.trim(),'t');
  // A transaction with an older repeatable-read snapshot must also fail safely.
  sql(target,`update public.ops_tasks set parent_task_id=null where id='${A}';`);
  const stale=session('oaktown_parent_stale');
  stale.send(`begin isolation level repeatable read;set local statement_timeout='12s';${auth}select count(*) from public.ops_tasks;\n\\echo SNAPSHOT_READY`);
  await until(()=>stale.out.includes('SNAPSHOT_READY')||stale.closed,'repeatable-read snapshot');
  assert.ok(stale.out.includes('SNAPSHOT_READY'),stale.err);
  sql(target,`update public.ops_tasks set parent_task_id='${B}' where id='${A}';`);
  stale.child.stdin.end(`update public.ops_tasks set parent_task_id='${A}' where id='${B}';commit;\n`);
  assert.notEqual(await stale.done,0,'Stale-snapshot cyclic update committed');
  assert.match(stale.err,/could not serialize|Circular task parent link/);
  const rollback=fs.readFileSync(path.join(__dirname,'../supabase/rollback/20261108050604_master_backlog_controlled_import.sql'),'utf8');
  const refused=sql(target,rollback,true);
  assert.notEqual(refused.status,0,'Rollback dropped imported business data');
  assert.match(refused.stderr,/Cannot drop task hierarchy\/import schema after import/);
  assert.equal(sql(target,"select to_regprocedure('public.ops_master_backlog_import(text,jsonb,text,boolean)') is not null and (select count(*)=3 from public.ops_tasks where task_code in ('W03','M12','M13')) and (select count(*)=1 from ops_intake_private.master_backlog_imports);").stdout.trim(),'t','Rejected rollback changed schema or records');
  console.log('Concurrent and stale-snapshot parent cycles rejected; rollback preserved imported records and receipts.');
 }finally{
  for(const s of sessions)if(!s.closed){s.child.stdin.end('rollback;\n');s.child.kill();}
  if(created)sql('postgres',`drop database ${target} with (force);`);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
