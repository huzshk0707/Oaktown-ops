'use strict';
// Existing staff journal only, cloned from the disposable workflow database.
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),M=require('../morning-model.js');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const bin=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_morning_plan_ci',actor='00000000-0000-4000-8000-000000000001',event='90000000-0000-4000-8000-000000000041',planId='90000000-0000-4000-8000-000000000042';
const quote=s=>"'"+String(s).replace(/'/g,"''")+"'";
function sql(database,input,fail=false){const r=spawnSync(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:20000,maxBuffer:2e6});if(r.error)throw r.error;if(r.status&&!fail)throw Error((r.stderr||r.stdout).slice(-2000));return r}
const auth=user=>`set role authenticated;select set_config('request.jwt.claim.sub',${quote(user)},false);`;
function insert(row){return `insert into public.ops_events select x.* from jsonb_populate_record(null::public.ops_events,${quote(JSON.stringify({...row,occurred_at:'2000-01-01T00:00:00Z',actor_id:'00000000-0000-4000-8000-000000000002'}))}::jsonb) x returning to_jsonb(ops_events);`}
let created=false;
try{
 assert.equal(sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and exists(select 1 from pg_trigger where tgname='ops_stamp_event_attribution');").stdout.trim(),'t');
 sql('postgres',`create database ${db} template oaktown_portfolio_ci;`);created=true;
 const before=sql(db,"select jsonb_agg(to_jsonb(t) order by id) from public.ops_tasks t;").stdout.trim();
 const source={id:'manual-1',label:'IN-001 · Fictional deposit message',kind:'manual_email',body:'Deposit submitted $500. This is not proof of receipt.',verification:'Manually provided; not independently verified'};
 const plan={schema_version:'oaktown.sod-draft.v1',planId,revision:4,workDate:'2026-11-16',text:'Deposits and payments\n- Verify the reported submission [IN-001]',rows:[{id:source.id,type:'planning',subject:'Verify report',action:'Check the original financial source.',sourceId:source.id}],sources:{[source.id]:source},stale:[]};
 const expected=M.approval(plan,event,planId,actor),r=sql(db,auth(actor)+insert(expected));
 const saved=JSON.parse(r.stdout.trim().split('\n').at(-1));assert.equal(M.verified(expected,[saved],actor),true);assert.equal(saved.actor_id,actor);assert.notEqual(saved.occurred_at,'2000-01-01T00:00:00+00:00');
 const duplicate=sql(db,auth(actor)+insert(expected),true);assert.notEqual(duplicate.status,0);assert.match(duplicate.stderr,/duplicate key/);
 assert.equal(sql(db,`select count(*) from public.ops_events where id=${quote(event)};`).stdout.trim(),'1');
 const rows=JSON.parse(sql(db,auth(actor)+`select jsonb_agg(to_jsonb(e)) from public.ops_events e where id=${quote(event)};`).stdout.trim().split('\n').at(-1));assert.equal(M.verified(expected,rows,actor),true);
 for(const user of ['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005']){
  const denied=sql(db,auth(user)+insert({...expected,id:'90000000-0000-4000-8000-000000000043'}),true);assert.notEqual(denied.status,0);assert.match(denied.stderr,/row-level security|permission denied/);
 }
 const anon=sql(db,'set role anon;'+insert({...expected,id:'90000000-0000-4000-8000-000000000044'}),true);assert.notEqual(anon.status,0);assert.match(anon.stderr,/permission denied/);
 const update=sql(db,auth(actor)+`update public.ops_events set summary='Must not overwrite approval' where id=${quote(event)};`,true);assert.notEqual(update.status,0);assert.match(update.stderr,/permission denied/);
 const removed=sql(db,auth(actor)+`delete from public.ops_events where id=${quote(event)};`,true);assert.notEqual(removed.status,0);
 assert.equal(sql(db,"select jsonb_agg(to_jsonb(t) order by id) from public.ops_tasks t;").stdout.trim(),before,'Planning changed operational task records');
 console.log('Morning approval: existing journal authorization, server actor/time, exact readback, duplicate-key safety, append-only history and zero task changes passed.');
}finally{if(created)sql('postgres',`drop database ${db} with (force);`)}
