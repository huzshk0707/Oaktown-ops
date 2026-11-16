'use strict';
// Actual RPC/transactions on a disposable clone only. No Supabase service connection.
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),M=require('../focus-actions-model.js');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const bin=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_focus_actions_ci',id='90000000-0000-4000-8000-000000000031',actor='00000000-0000-4000-8000-000000000001',children=[];
const quote=s=>"'"+String(s).replace(/'/g,"''")+"'";
function sql(database,input,fail=false){const r=spawnSync(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:20000,maxBuffer:2e6});if(r.error)throw r.error;if(r.status&&!fail)throw Error((r.stderr||r.stdout).slice(-2200));return r}
const auth=user=>`set role authenticated;select set_config('request.jwt.claim.sub',${quote(user)},false);`;
const statement=(action,session,payload={})=>`select public.ops_task_intake(${quote(action)},${session?quote(session)+'::uuid':'null'},${quote(JSON.stringify(payload))}::jsonb);`;
const call=(action,session,payload,user=actor)=>JSON.parse(sql(db,auth(user)+statement(action,session,payload)).stdout.trim().split('\n').at(-1));
const read=()=>JSON.parse(sql(db,`select to_jsonb(t) from public.ops_tasks t where id=${quote(id)};`).stdout.trim());
function prepare(kind,input,ref){const before=read(),plan=M.plan(before,kind,input,'2026-11-15'),session=call('new').session_id;return {before,plan,session,request:M.payload(plan,session,ref,'2026-11-15'),ref}}
function save(p){return call('save',p.session,p.request)}
function verify(p,r){assert.equal(M.verified(p.plan,r,read(),p.session,p.ref),true,'Actual receipt/readback did not match reviewed fields')}
function reject(p,pattern=/Task changed/){const r=sql(db,auth(actor)+statement('save',p.session,p.request),true);assert.notEqual(r.status,0);assert.match(r.stderr,pattern)}
function session(name){const child=spawn(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',db],{env:{...process.env,PGAPPNAME:name}}),s={child,out:'',err:'',closed:false};children.push(s);child.stdout.on('data',d=>s.out+=d);child.stderr.on('data',d=>s.err+=d);s.done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{s.closed=true;resolve(code)})});return s}
async function until(test){const end=Date.now()+12000;while(Date.now()<end){if(test())return;await new Promise(r=>setTimeout(r,25))}throw Error('Concurrency fixture timed out')}
async function competing(a,b,same=false){
 const first=session('focus_action_first'),second=session('focus_action_second');
 first.child.stdin.write(`begin;set local statement_timeout='15s';${auth(actor)}${statement('save',a.session,a.request)}\n\\echo FIRST_SAVED\n`);
 await until(()=>first.out.includes('FIRST_SAVED')||first.closed);assert.ok(first.out.includes('FIRST_SAVED'),first.err);
 second.child.stdin.end(`begin;set local statement_timeout='15s';${auth(actor)}${statement('save',b.session,b.request)}commit;`);
 await until(()=>second.closed||sql(db,"select exists(select 1 from pg_stat_activity where application_name='focus_action_second' and wait_event_type='Lock');").stdout.trim()==='t');first.child.stdin.end('commit;');assert.equal(await first.done,0,first.err);
 if(same)assert.equal(await second.done,0,second.err);else{assert.notEqual(await second.done,0);assert.match(second.err,/Task changed/)}
}
async function main(){let created=false;try{
 assert.equal(sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and to_regprocedure('public.ops_task_intake(text,uuid,jsonb)') is not null;").stdout.trim(),'t');
 sql('postgres',`create database ${db} template oaktown_portfolio_ci;`);created=true;
 sql(db,`insert into public.ops_tasks(id,workflow_key,task_title,status,priority,notes,due_at,intake_details) values(${quote(id)},'general','Fictional Focus Board task','pending','high','Retained fictional note','2026-11-14T14:15:00Z','{"description":"Fictional context","due":{"date":"2026-11-14","time":"09:15","timezone":"America/New_York","original_text":"Original recorded date"}}');`);
 const complete=prepare('complete',{summary:'Fictional inspection finished.'},'focus-complete');const r=save(complete);verify(complete,r);assert.equal(read().status,'completed');assert.deepEqual(save(complete),r,'Replay changed receipt');
 const recent=M.recent(complete.plan,read(),complete.ref,1000),undoPlan=M.undo(read(),recent,1001),undoSession=call('new').session_id,undo={plan:undoPlan,session:undoSession,ref:'focus-undo-complete',request:M.payload(undoPlan,undoSession,'focus-undo-complete','2026-11-15')};verify(undo,save(undo));assert.equal(read().status,'pending');assert.equal(read().completed_at,null);assert.equal(read().intake_details.completion_summary,undefined);
 const defer=prepare('defer',{date:'2026-11-18'},'focus-defer');verify(defer,save(defer));assert.equal(read().due_at,complete.before.due_at);assert.deepEqual(read().intake_details.due,complete.before.intake_details.due);assert.equal(read().status,'pending');
 const dRecent=M.recent(defer.plan,read(),defer.ref,1000),dPlan=M.undo(read(),dRecent,1001),dSession=call('new').session_id,dUndo={plan:dPlan,session:dSession,ref:'focus-undo-defer',request:M.payload(dPlan,dSession,'focus-undo-defer','2026-11-15')};verify(dUndo,save(dUndo));assert.equal(read().intake_details.follow_up,undefined);
 const invalid=prepare('complete',{summary:'Required summary'},'focus-invalid');delete invalid.request.export.proposals[0].changes.completion_summary;reject(invalid,/Completed task needs summary/);assert.equal(read().status,'pending');
 const stale=prepare('defer',{date:'2026-11-20'},'focus-stale');sql(db,`update public.ops_tasks set notes='Fictional newer staff edit' where id=${quote(id)};`);reject(stale);assert.equal(read().notes,'Fictional newer staff edit');
 const a=prepare('defer',{date:'2026-11-21'},'focus-competing-a'),b=prepare('defer',{date:'2026-11-22'},'focus-competing-b');await competing(a,b);assert.equal(read().intake_details.follow_up.date,'2026-11-21');
 const once=prepare('defer',{date:'2026-11-23'},'focus-concurrent-identical');await competing(once,once,true);
 const reverse=M.recent(once.plan,read(),once.ref,1000),rp=M.undo(read(),reverse,1001),rs=call('new').session_id,staleUndo={plan:rp,session:rs,request:M.payload(rp,rs,'focus-stale-undo','2026-11-15')};sql(db,`update public.ops_tasks set notes='Fictional intervening update after action' where id=${quote(id)};`);reject(staleUndo);assert.equal(read().intake_details.follow_up.date,'2026-11-23');
 for(const user of ['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005']){const denied=sql(db,auth(user)+statement('save',once.session,once.request),true);assert.notEqual(denied.status,0);assert.match(denied.stderr,/Active editor access required/)}
 sql(db,`update public.staff_memberships set is_active=false where user_id=${quote(actor)};`);reject(once,/Active editor access required/);sql(db,`update public.staff_memberships set is_active=true where user_id=${quote(actor)};`);
 const anonymous=sql(db,"set role anon;"+statement('save',once.session,once.request),true);assert.notEqual(anonymous.status,0);assert.match(anonymous.stderr,/permission denied/);
 const audit=JSON.parse(sql(db,`select jsonb_agg(jsonb_build_object('actor',actor_id,'event',event_type,'metadata',event_metadata)) from public.ops_events where entity_id=${quote(id)};`).stdout.trim());
 assert.equal(audit.length,6);assert.ok(audit.every(e=>e.actor===actor&&e.event==='task_intake_reviewed'));assert.ok(audit.some(e=>e.metadata.proposal.match_reason.includes('reversing focus-complete')));
 assert.equal(sql(db,`select count(*) from ops_intake_private.items where kind='source' and payload->>'label' like 'Staff-confirmed Focus Board%' and payload->>'evidence_excerpt' like '%"before"%';`).stdout.trim(),'6');
 console.log('Actual intake RPC: Complete/Defer/Undo, unchanged due/context, validation, idempotent concurrent retries, stale competing edits/reversal, revoked/anon/viewer denial and audit passed.');
 }finally{for(const c of children)if(!c.closed){c.child.stdin.end('rollback;');c.child.kill()}if(created)sql('postgres',`drop database ${db} with (force);`)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
