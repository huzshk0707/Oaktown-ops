'use strict';
// Real transactions and the actual rollback script, only in cloned fictional CI.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const executable=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_task_agent_security_ci',sessions=[];
function sql(database,input,allowFailure=false){
 const r=spawnSync(executable,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:15000,maxBuffer:2e6});
 if(r.error)throw r.error;if(r.status!==0&&!allowFailure)throw Error((r.stderr||r.stdout).slice(-2000));return r;
}
const ready=sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and to_regclass('ci.before_hardening_rpc') is not null and (select count(*)=13 from ci.baseline_properties) and (select count(*)=1 from public.ops_tasks where task_title='Fictional integration task');");
assert.equal(ready.stdout.trim(),'t','Fictional CI baseline missing');
const quote=s=>"'"+s.replace(/'/g,"''")+"'",auth='set role oaktown_task_agent;select ci.agent_identity(1);';
const statement=(action,payload)=>`select public.ops_task_agent(${quote(action)},${quote(JSON.stringify(payload))}::jsonb);`;
function call(action,payload){return JSON.parse(sql(db,auth+statement(action,payload)).stdout.trim().split('\n').at(-1))}
function session(name){
 const child=spawn(executable,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',db],{env:{...process.env,PGAPPNAME:name}});
 const s={child,out:'',err:'',closed:false};sessions.push(s);child.stdout.on('data',d=>{s.out+=d});child.stderr.on('data',d=>{s.err+=d});
 s.done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{s.closed=true;resolve(code)})});return s;
}
async function until(test,label){const deadline=Date.now()+10000;while(Date.now()<deadline){if(test())return;await new Promise(r=>setTimeout(r,25))}throw Error('Timed out: '+label)}
async function competing(first,second,same){
 const a=session('oaktown_agent_a'),b=session('oaktown_agent_b');
 a.child.stdin.write(`begin;set local statement_timeout='12s';${auth}${statement('apply',first)}\n\\echo FIRST_SAVED\n`);
 await until(()=>a.out.includes('FIRST_SAVED')||a.closed,'first reviewed save');assert.ok(a.out.includes('FIRST_SAVED'),a.err);
 b.child.stdin.end(`begin;set local statement_timeout='12s';${auth}${statement('apply',second)}commit;\n`);
 await until(()=>b.closed||sql(db,"select exists(select 1 from pg_stat_activity where application_name='oaktown_agent_b' and wait_event_type='Lock');").stdout.trim()==='t','competing reviewed save');
 a.child.stdin.end('commit;\n');assert.equal(await a.done,0,a.err);
 if(same){assert.equal(await b.done,0,b.err);assert.equal(JSON.parse(b.out.trim().split('\n').at(-1)).replayed,true)}
 else{assert.notEqual(await b.done,0,'Stale concurrent edit committed');assert.match(b.err,/Task changed since review/)}
}
async function main(){let created=false;try{
 sql('postgres',`create database ${db} template oaktown_portfolio_ci;`);created=true;
 const id=sql(db,"select id from public.ops_tasks where task_title='Fictional integration task';").stdout.trim();
 const prepare=(ref,changes)=>{const t=call('get',{task_id:id});const p=call('preview',{operation:'update',request_ref:ref,task_id:id,expected_updated_at:t.updated_at,source_note:'Fictional concurrency report',changes,clear_fields:[]});return {proposal_id:p.proposal_id,preview_token:p.preview_token,confirmation:p.confirmation,reviewed:true}};
 const p=prepare('fictional-concurrent-retry',{priority:'urgent'});await competing(p,p,true);
 assert.equal(sql(db,`select count(*) from public.ops_events where event_metadata->>'proposal_id'=${quote(p.proposal_id)};`).stdout.trim(),'1','Concurrent replay duplicated history');
 const a=prepare('fictional-concurrent-first',{next_action:'Fictional first approved action'}),b=prepare('fictional-concurrent-second',{next_action:'Fictional stale action'});
 await competing(a,b,false);assert.equal(call('get',{task_id:id}).next_action,'Fictional first approved action');
 const before=sql(db,'select count(*) from ops_agent_private.proposals;').stdout.trim();
 const rollback=fs.readFileSync(path.join(__dirname,'../supabase/rollback/20261108061801_authenticated_task_connection.sql'),'utf8');
 const refused=sql(db,rollback,true);assert.notEqual(refused.status,0);assert.match(refused.stderr,/configuration or proposal history/);
 assert.equal(sql(db,'select count(*) from ops_agent_private.proposals;').stdout.trim(),before);assert.equal(call('get',{task_id:id}).next_action,'Fictional first approved action');
 console.log('Concurrent retries saved once; competing stale proposals rejected; actual rollback preserved task and private audit history.');
 }finally{for(const s of sessions)if(!s.closed){s.child.stdin.end('rollback;\n');s.child.kill()}if(created)sql('postgres',`drop database ${db} with (force);`)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
