'use strict';
// Real role/transaction tests. The only target is a clone of fictional CI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync,spawn}=require('node:child_process');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const bin=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_sod_authorization_ci',empty='oaktown_sod_empty_ci';
const root=path.resolve(__dirname,'..'),migration=fs.readFileSync(path.join(root,'supabase/migrations/20261116012926_morning_plan_review_authorization.sql'),'utf8'),rollback=fs.readFileSync(path.join(root,'supabase/rollback/20261116012926_morning_plan_review_authorization.sql'),'utf8');
const aliasFix=fs.readFileSync(path.join(root,'supabase/migrations/20261122064143_morning_plan_personal_consent_alias.sql'),'utf8');
const quote=s=>"'"+String(s).replace(/'/g,"''")+"'",actor=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),nativeSid=n=>'dddddddd-dddd-4ddd-8ddd-'+String(n).padStart(12,'0'),oauthSid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const sessions=[];
function sql(database,input,allowed=false){const r=spawnSync(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:20000,maxBuffer:3e6});if(r.error)throw r.error;if(r.status&&!allowed)throw Error((r.stderr||r.stdout).slice(-3000));return r}
function identity(kind='native',user=1,overrides={}){const claims={sub:actor(user),role:kind==='agent'?'oaktown_task_agent':'authenticated',is_anonymous:false,session_id:kind==='agent'?oauthSid:nativeSid(user),...(kind==='agent'?{client_id:'fictional-chatgpt',aud:'https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp'}:{}),...overrides};return `set role ${kind==='agent'?'oaktown_task_agent':'authenticated'};select set_config('request.jwt.claim.sub',${quote(actor(user))},false);select set_config('request.jwt.claims',${quote(JSON.stringify(claims))},false);`}
const statement=(action,payload)=>`select public.ops_morning_plan(${quote(action)},${quote(JSON.stringify(payload))}::jsonb);`;
function call(action,payload={},kind='native',user=1,overrides={}){const r=sql(db,identity(kind,user,overrides)+statement(action,payload));return JSON.parse(r.stdout.trim().split('\n').at(-1))}
function denied(action,payload,match,kind='native',user=1,overrides={}){const r=sql(db,identity(kind,user,overrides)+statement(action,payload),true);assert.notEqual(r.status,0,'Unauthorized operation succeeded');assert.match(r.stderr,match);return r}
const approve=r=>({proposal_id:r.proposal_id,review_token:r.review_token,reviewed:true,confirmation:r.confirmation});
function session(name){const child=spawn(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',db],{env:{...process.env,PGAPPNAME:name}}),s={child,out:'',err:'',closed:false};sessions.push(s);child.stdout.on('data',d=>s.out+=d);child.stderr.on('data',d=>s.err+=d);s.done=new Promise((res,rej)=>{child.once('error',rej);child.once('close',c=>{s.closed=true;res(c)})});return s}
async function until(fn,label){const end=Date.now()+15000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,30))}throw Error('Timed out: '+label)}
async function competing(a,b,same){const first=session('sod_review_a'),second=session('sod_review_b');first.child.stdin.write(`begin;set local statement_timeout='16s';${identity()}${statement('approve',a)}\n\\echo FIRST_APPROVED\n`);await until(()=>first.out.includes('FIRST_APPROVED')||first.closed,'first approval');assert.ok(first.out.includes('FIRST_APPROVED'),first.err);second.child.stdin.end(`begin;set local statement_timeout='16s';${identity()}${statement('approve',b)}commit;\n`);await until(()=>second.closed||sql(db,"select exists(select 1 from pg_stat_activity where application_name='sod_review_b' and wait_event_type='Lock');").stdout.trim()==='t','second approval waits');first.child.stdin.end('commit;\n');assert.equal(await first.done,0,first.err);if(same){assert.equal(await second.done,0,second.err);assert.equal(JSON.parse(second.out.trim().split('\n').at(-1)).replayed,true)}else{assert.notEqual(await second.done,0);assert.match(second.err,/Daily approval changed|competing daily plan/)} }
const snapshotTool='read_morning_priority_snapshot';
const snapshotAction='morning_priority_snapshot';
const snapshotWorkDate='2026-11-22';
const snapshotMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261122070313_morning_priority_snapshot.sql'),'utf8');
const Today=require('../today-model.js'),Focus=require('../focus-board-model.js');
const taskStatement=(action,payload)=>`select public.ops_task_agent(${quote(action)},${quote(JSON.stringify(payload))}::jsonb);`;

function seedSnapshotTasks(){
 sql(db,`insert into public.ops_tasks(task_title,workflow_key,status,priority,assigned_label,property_id,unit_id,due_at,archived_at,notes,intake_details)
  select 'Fictional snapshot '||lpad(n::text,2,'0'),'maintenance',
   case n when 6 then 'waiting' when 7 then 'blocked' when 56 then 'completed' when 57 then 'cancelled' else 'pending' end,
   case when n in (1,3,56,57,58) then 'urgent' when n in (4,5,6,8,9) then 'high' else 'normal' end,
   case when n=1 then 'Fictional staff' end, u.property_id, u.id,
   case n when 1 then '2026-11-22T04:59:00Z'::timestamptz when 2 then '2026-11-22T05:00:00Z'::timestamptz
    when 10 then '2026-11-24T05:00:00Z'::timestamptz end, case when n=58 then clock_timestamp() end,
   'Fictional private task notes',
   jsonb_strip_nulls(jsonb_build_object(
    'next_action',case when n=12 then '{"unexpected":"Fictional private nested data"}'::jsonb
     when n in (5,9) then to_jsonb(E' \\t '::text) else to_jsonb('Review fictional evidence'::text) end,
    'due',case when n=3 then '{"date":"2026-11-24","original_text":"Fictional private due note"}'::jsonb
     when n=9 then '{"date":"2026-02-30"}'::jsonb when n=10 then '{"date":"2026-11-24"}'::jsonb end,
    'follow_up',case when n in (5,10) then '{"date":"2026-11-24"}'::jsonb when n=11 then '{"date":"2026-11-22"}'::jsonb end,
    'waiting_on',case when n=6 then 'Fictional vendor' when n=8 then 'Fictional staff reply' end,
    'blocked_reason',case when n=7 then 'Awaiting fictional confirmation' end,
    'description','Fictional private task description','completion_summary','Fictional private completion summary'))
  from generate_series(1,58) n cross join (select id,property_id from public.units order by id limit 1) u;`);
}

async function readAllSnapshotPages(tool,first){
 const tasks=[...first.tasks];
 let page=first;
 while(page.has_more){
  assert.ok(tasks.length<first.total_active,'Cursor must advance toward the declared total');
  page=await tool(snapshotTool,{work_date:snapshotWorkDate,cursor:page.next_cursor});
  assert.equal(page.offset,tasks.length);
  assert.equal(page.total_active,first.total_active);
  tasks.push(...page.tasks);
 }
 assert.equal(page.next_cursor,null);
 assert.equal(tasks.length,first.total_active);
 assert.equal(new Set(tasks.map(t=>t.task_id)).size,tasks.length);
 return tasks;
}

async function mcpRoundTrip(input){
 const {createHandler}=await import('../supabase/functions/oaktown-task-api/server.mjs');
 seedSnapshotTasks();
 const calls=[],host='https://fictional.supabase.co';
 // Real HTTP/MCP dispatch to disposable PostgreSQL with the scoped SQL role.
 // Signed OAuth token validation is exercised by the separate JWT unit tests.
 const handler=createHandler({supabaseUrl:host,publishableKey:'fictional-public',
  verifyToken:async()=>({sub:actor(1)}),
  fetchImpl:async(url,options)=>{
   const {action,payload}=JSON.parse(options.body);
   const snapshot=action===snapshotAction;
   assert.equal(url,host+'/rest/v1/rpc/'+(snapshot?'ops_task_agent':'ops_morning_plan'));
   assert.equal(options.headers.Authorization,'Bearer fictional-scoped-token');
   calls.push(action);
   const query=snapshot?taskStatement(action,payload):statement(action,payload);
   const result=sql(db,'\\set VERBOSITY verbose\n'+identity('agent')+query,true);
   if(result.status){
    const match=result.stderr.match(/ERROR:\s+([0-9A-Z]{5}): ([^\n]+)/);
    assert.ok(match,result.stderr);
    return Response.json({code:match[1],message:match[2]},{status:match[1]==='42501'?403:400});
   }
   return Response.json(JSON.parse(result.stdout.trim().split('\n').at(-1)));
  }
 });
 async function tool(name,args,expectedError){
  const response=await handler(new Request(host+'/functions/v1/oaktown-task-api/mcp',{method:'POST',
   headers:{Authorization:'Bearer fictional-scoped-token','Content-Type':'application/json',Accept:'application/json, text/event-stream'},
   body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));
  const {result}=await response.json();
  if(expectedError){
   assert.equal(result?.isError,true);
   assert.equal(result.structuredContent.error,expectedError);
  }else assert.notEqual(result?.isError,true,JSON.stringify(result));
  return result.structuredContent;
 }

 const date={work_date:snapshotWorkDate},query=taskStatement(snapshotAction,date);
 assert.match(sql(db,identity()+query,true).stderr,/requires scoped OAuth/);
 assert.match(sql(db,identity('agent',3)+query,true).stderr,/staff editor access required/);
 assert.match(sql(db,identity('agent')+"select ops_agent_private.morning_priority_snapshot('{}');",true).stderr,/permission denied/);
 const readOnly=sql(db,identity('agent',1,{client_id:'fictional-readonly'})+query);
 assert.equal(JSON.parse(readOnly.stdout.trim().split('\n').at(-1)).has_more,true);
 await tool(snapshotTool,{work_date:'2026-02-30'},'22023');

 const first=await tool(snapshotTool,date);
 assert.equal(first.has_more,true);
 assert.equal(first.tasks.length,25);
 assert.ok(first.total_active>50);
 const continuation={...date,cursor:first.next_cursor};
 const oauthGrant="where user_id='"+actor(1)+"' and client_id='fictional-chatgpt'";
 sql(db,`update auth.oauth_consents set revoked_at=clock_timestamp() ${oauthGrant};`);
 await tool(snapshotTool,continuation,'42501');
 sql(db,`update auth.oauth_consents set revoked_at=null ${oauthGrant};`);
 sql(db,"update ops_agent_private.clients set enabled=false where client_id='fictional-readonly';");
 assert.match(sql(db,identity('agent',1,{client_id:'fictional-readonly'})+query,true).stderr,/connection disabled/);
 sql(db,"update ops_agent_private.clients set enabled=true where client_id='fictional-readonly';");
 await tool(snapshotTool,{...date,cursor:first.next_cursor.replace(/^25:/,'26:')},'40001');
 await tool(snapshotTool,{...continuation,work_date:'2026-11-23'},'40001');
 assert.match(sql(db,identity('agent',1,{client_id:'fictional-readonly'})+taskStatement(snapshotAction,continuation),true).stderr,/cursor is invalid/);

 const tasks=await readAllSnapshotPages(tool,first);
 const raw=JSON.parse(sql(db,"select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.ops_tasks t;").stdout);
 const ordered=Focus.order(raw,snapshotWorkDate);
 assert.deepEqual(tasks.map(t=>t.task_id),ordered.map(t=>t.id));
 assert.ok(!tasks.some(t=>['Fictional snapshot 56','Fictional snapshot 57','Fictional snapshot 58'].includes(t.title)));
 assert.ok(!JSON.stringify(tasks).includes('Fictional private'));
 function find(n){return tasks.find(t=>t.title==='Fictional snapshot '+String(n).padStart(2,'0'))}
 for(const [i,item] of tasks.entries()){
  const saved=ordered[i],schedule=Today.scheduled(saved);
  assert.equal(item.schedule_date,schedule?.date??null);
  assert.equal(item.schedule_type,schedule?.type??null);
  assert.equal(item.updated_at,saved.updated_at);
  assert.deepEqual(Object.keys(item).sort(),['assigned_label','blocked_reason','categories','due_at','due_date','follow_up_date',
   'next_action','priority','property_id','schedule_date','schedule_type','status','task_code','task_id','title','unit_id','updated_at','waiting_on']);
 }
 assert.deepEqual(find(1).categories,['urgent','overdue']);
 assert.deepEqual(find(2).categories,['due_today']);
 assert.deepEqual(find(4).categories,['high_priority_actionable']);
 assert.deepEqual(find(5).categories,['scheduled_follow_up']);
 assert.deepEqual(find(6).categories,['waiting_blocked']);
 assert.deepEqual(find(7).categories,['waiting_blocked']);
 assert.deepEqual(find(8).categories,['waiting_blocked']);
 assert.deepEqual(find(9).categories,['other_active']);
 assert.equal(find(9).due_date,null);
 assert.equal(find(10).schedule_type,'Due');
 assert.equal(find(11).schedule_type,'Follow-up');
 assert.equal(find(12).next_action,null);
 const selected=find(1);
 assert.ok(selected.property_id&&selected.unit_id);
 assert.equal(selected.assigned_label,'Fictional staff');
 assert.equal(find(2).assigned_label,null);

 const head=await tool('read_daily_plan',date);
 const intent={...input,expected_approval_id:head.approval_id,tasks:[{
  task_id:selected.task_id,expected_updated_at:selected.updated_at,action:selected.next_action,section:'Immediate priorities'
 }]};
 assert.equal(head.approval_id,null);
 sql(db,`update public.ops_tasks set intake_details=jsonb_set(intake_details,'{next_action}','"Review updated fictional evidence"') where id=${quote(selected.task_id)};`);
 await tool(snapshotTool,continuation,'40001');
 await tool('submit_daily_plan',intent,'40001');
 const refreshed=await readAllSnapshotPages(tool,await tool(snapshotTool,date));
 const updated=refreshed.find(t=>t.task_id===selected.task_id);
 assert.notEqual(updated.updated_at,selected.updated_at);
 intent.tasks[0]={...intent.tasks[0],expected_updated_at:updated.updated_at,action:updated.next_action};
 intent.text=[
  'Good Morning Leslie,','','Hope you’re doing well!','','I’m getting started for the day. My priorities today are:',
  '- Fictional evidence: '+updated.next_action+'.','- Tenant Communications: Review and respond to new messages.',
  '- REI Hub – Import Feed: Review the pending entries.','',
  'Please let me know if there’s anything else you’d like me to prioritize today.','',
  'Thank you, and wishing you a wonderful Sunday!'
 ].join('\n');

 const submitted=await tool('submit_daily_plan',intent);
 assert.equal(submitted.approved,false);
 assert.equal(submitted.outcome,'pending_staff_review');
 assert.equal(submitted.review_token,undefined);
 assert.equal((await tool('submit_daily_plan',intent)).proposal_id,submitted.proposal_id);
 await tool('submit_daily_plan',{...intent,text:intent.text+' Altered request.'},'22023');
 const lookup={proposal_id:submitted.proposal_id};
 const pending=await tool('get_plan_submission',lookup);
 assert.equal(pending.state,'pending_staff_review');
 assert.equal(pending.approved,false);
 assert.equal((await tool('read_daily_plan',date)).approval_id,null);
 const reviewed=call('review',lookup);
 assert.equal(reviewed.event.event_metadata.plan.text,intent.text);
 assert.equal(reviewed.event.event_metadata.plan.sources['task:'+updated.task_id].version,updated.updated_at);
 denied('approve',approve(reviewed),/cannot review or approve/,'agent');
 const saved=call('approve',approve(reviewed));
 const checkedAt=calls.length;
 const verified=await tool('get_plan_submission',lookup);
 assert.deepEqual(calls.slice(checkedAt),['status','get']);
 assert.equal(verified.approved,true);
 assert.equal(verified.verified,true);
 assert.equal(verified.receipt.event_id,saved.event.id);
 assert.equal(verified.approved_plan.text,intent.text);
 assert.equal(verified.approved_plan.tasks[0].reviewed_version,updated.updated_at);
 const current=await tool('read_daily_plan',date);
 assert.equal(current.approval_id,saved.event.id);
 assert.equal(current.approved_plan.text,intent.text);
 assert.ok(!JSON.stringify(current).includes(intent.planning_items[0].source_note));
 const retry=await tool('submit_daily_plan',intent);
 assert.equal(retry.proposal_id,submitted.proposal_id);
 assert.equal(retry.outcome,'previously_reviewed');
 assert.equal(retry.approved,false);
}
async function main(){const created=[];try{
 assert.equal(sql('oaktown_portfolio_ci',"select current_database()='oaktown_portfolio_ci' and to_regclass('ops_agent_private.clients') is not null and to_regprocedure('public.ops_morning_plan(text,jsonb)') is null;").stdout.trim(),'t','Pre-Phase6 fictional baseline required');
 for(const name of [db,empty]){sql('postgres',`create database ${name} template oaktown_portfolio_ci;`);created.push(name)}
 sql(empty,migration);sql(empty,aliasFix);sql(empty,rollback);assert.equal(sql(empty,"select to_regprocedure('public.ops_morning_plan(text,jsonb)') is null and to_regprocedure('public.ops_task_agent(text,jsonb)') is not null;").stdout.trim(),'t');
 sql(empty,`do $fixture$ begin execute replace(
  pg_get_functiondef('ops_agent_private.run(text,jsonb)'::regprocedure),
  'if action not in (''search'',''get'',''history'',''preview'',''apply'') then',
  'if /* fictional drift */ action not in (''search'',''get'',''history'',''preview'',''apply'') then'
 );end $fixture$;`);
 const driftedSnapshot=sql(empty,snapshotMigration,true);
 assert.notEqual(driftedSnapshot.status,0);
 assert.match(driftedSnapshot.stderr,/Expected one scoped task allowlist/);
 assert.equal(sql(empty,"select to_regprocedure('ops_agent_private.morning_priority_snapshot(jsonb)') is null;").stdout.trim(),'t');
 sql(db,migration);
 sql(db,`alter table auth.sessions add column oauth_client_id uuid;insert into auth.sessions(id,user_id) select ('dddddddd-dddd-4ddd-8ddd-'||lpad(n::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;create table ci.plan_task_writes(actor text);create function ci.guard_plan_task_writes() returns trigger language plpgsql security definer set search_path='' as $$begin if current_setting('role',true) in ('authenticated','oaktown_task_agent') then insert into ci.plan_task_writes values(current_setting('role',true));end if;return new;end$$;create trigger ci_plan_writes after insert or update or delete on public.ops_tasks for each row execute function ci.guard_plan_task_writes();`);

 const lookup=identity()+statement('my_connections',{});
 const ambiguous=sql(db,lookup,true);
 assert.notEqual(ambiguous.status,0);
 assert.match(ambiguous.stderr,/column reference "c\.client_id" is ambiguous/);

 const proc="'ops_agent_private.morning_plan(text,jsonb)'::regprocedure";
 const functionMetadata=`select oid, proowner, proacl, prosecdef, proconfig from pg_proc where oid=${proc};`;
 const originalMetadata=sql(db,functionMetadata).stdout;
 sql(db,'begin;\n'+aliasFix+'\nrollback;');
 assert.match(sql(db,lookup,true).stderr,/column reference "c\.client_id" is ambiguous/);
 sql(db,aliasFix);
 assert.equal(sql(db,functionMetadata).stdout,originalMetadata,'Function identity, owner, grants and security settings must survive replacement');
 const runnerMetadata="select oid,proowner,proacl,prosecdef,proconfig from pg_proc where oid='ops_agent_private.run(text,jsonb)'::regprocedure;";
 const previousRunner=sql(db,runnerMetadata).stdout;
 sql(db,snapshotMigration);
 assert.equal(sql(db,runnerMetadata).stdout,previousRunner,'Snapshot must preserve the existing task authorization runner and grants');
 const drift=sql(db,aliasFix,true);
 assert.notEqual(drift.status,0);
 assert.match(drift.stderr,/Expected one Morning Plan my_connections query/);

 const client={client_id:'fictional-chatgpt',label:'Fictional ChatGPT',enabled:true,can_read_plans:false,can_submit_plans:false,my_can_read_plans:false,my_can_submit_plans:false};
 const reader={...client,client_id:'fictional-readonly',label:'Fictional reader'};
 assert.deepEqual(call('my_connections'),[client,reader]);
 sql(db,`delete from auth.oauth_consents where user_id=${quote(actor(2))};`);
 assert.deepEqual(call('my_connections',{},'native',2),[]);
 denied('my_connections',{},/cannot review or approve/,'agent');

 const task=JSON.parse(sql(db,"select to_jsonb(t) from public.ops_tasks t where task_title='Fictional integration task';").stdout.trim());
 const intent=(ref,day='2026-11-16',expected=null)=>({request_ref:ref,expected_approval_id:expected,work_date:day,text:'Fictional SOD: review original evidence. Submitted funds are not verified money.',tasks:[{task_id:task.id,expected_updated_at:task.updated_at,action:'Review the fictional source.',section:'Immediate priorities'}],planning_items:[{title:'Verify fictional report',action:'Check an approved source.',section:'Deposits and payments',source_ref:'fictional-email-001',source_note:'Deposit reported submitted. Not proof of receipt or clearance.'}]});
 const input=intent('plan-example');
 const planConsent={client_id:client.client_id,can_read_plans:true,can_submit_plans:true,confirmed:true};
 denied('list',{work_date:'2026-11-16'},/no approved plan capability/,'agent');
 denied('submit',input,/no approved plan capability/,'agent');
 denied('configure',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:true},/administrator/,'native',1);
 denied('configure',{client_id:client.client_id,can_read_plans:false,can_submit_plans:true},/requires explicit plan read permission/,'native',2);
 call('configure',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:true},'native',2);
 const configured={...client,can_read_plans:true,can_submit_plans:true};
 assert.deepEqual(call('my_connections'),[configured,reader]);
 denied('consent',planConsent,/Complete the OAuth connection first/,'native',2);
 denied('list',{work_date:'2026-11-16'},/no approved plan capability/,'agent');
 denied('submit',input,/no approved plan capability/,'agent');
 denied('consent',{...planConsent,can_read_plans:false},/Explicit native plan consent required/);
 call('consent',{...planConsent,can_submit_plans:false});
 assert.deepEqual(call('my_connections'),[{...configured,my_can_read_plans:true},reader]);
 assert.deepEqual(call('list',{work_date:input.work_date},'agent'),[]);
 denied('submit',input,/no approved plan capability/,'agent');
 call('consent',planConsent);
 assert.deepEqual(call('my_connections'),[{...configured,my_can_read_plans:true,my_can_submit_plans:true},reader]);
 assert.deepEqual(call('my_connections',{},'native',2),[]);
 assert.deepEqual(call('list',{work_date:'2026-11-16'},'agent'),[]);
 const submitted=call('submit',input,'agent');assert.equal(submitted.state,'pending_staff_review');assert.equal(submitted.approval_required,true);assert.equal(submitted.review_token,undefined);assert.equal(submitted.receipt,null);
 assert.equal(call('submit',input,'agent').proposal_id,submitted.proposal_id);denied('submit',{...input,text:'Different intent'},/reused with different content/,'agent');
 denied('prepare',{request_ref:'agent-native',expected_approval_id:null,plan:{}},/cannot review or approve/,'agent');
 denied('review',{proposal_id:submitted.proposal_id},/cannot review or approve/,'agent');
 denied('approve',{proposal_id:submitted.proposal_id,reviewed:true},/cannot review or approve/,'agent');
 denied('review',{proposal_id:submitted.proposal_id},/not found/,'native',2);
 denied('review',{proposal_id:submitted.proposal_id},/native staff session/,'native',1,{client_id:'unknown-oauth'});
 const reviewed=call('review',{proposal_id:submitted.proposal_id});assert.equal(reviewed.schema_version,'oaktown.plan-review.v1');
 const raw=reviewed.event;const forgery=sql(db,identity()+`insert into public.ops_events(id,entity_type,entity_id,event_type,actor_id,summary,event_metadata) values(${quote(raw.id)},'morning_plan',${quote(raw.entity_id)},'morning_plan_approved_v1',${quote(actor(1))},${quote(raw.summary)},${quote(JSON.stringify(raw.event_metadata))}::jsonb);`,true);assert.notEqual(forgery.status,0);assert.match(forgery.stderr,/native staff review operation/);
 denied('approve',{...approve(reviewed),review_token:'ffffffff-ffff-4fff-8fff-ffffffffffff'},/Exact native staff/);
 denied('approve',approve(reviewed),/cannot review or approve/,'agent');
 denied('approve',approve(reviewed),/Native staff editor review required/,'native',3);
 const receipt=call('approve',approve(reviewed));assert.equal(receipt.replayed,false);assert.equal(receipt.event.actor_id,actor(1));assert.equal(receipt.event.review_proof.event_id,raw.id);assert.equal(receipt.event.review_proof.channel,'native_staff_review');assert.equal(receipt.event.review_proof.content_hash,receipt.receipt.content_hash);
 assert.equal(call('approve',approve(reviewed)).replayed,true);assert.equal(call('get',{event_id:raw.id},'agent').id,raw.id);assert.equal(call('status',{proposal_id:submitted.proposal_id},'agent').state,'approved');assert.equal(call('list',{work_date:input.work_date},'agent').length,1);assert.equal(call('head',{work_date:input.work_date},'agent').approval_id,raw.id);
 const agentRead=call('get',{event_id:raw.id},'agent');assert.equal(agentRead.source_projection,'references_only');assert.ok(!JSON.stringify(agentRead).includes(input.planning_items[0].source_note),'Direct scoped RPC leaked original source note');assert.ok(JSON.stringify(call('get',{event_id:raw.id})).includes(input.planning_items[0].source_note),'Native review lost source evidence');
 const current=raw.id;denied('submit',intent('stale-daily',input.work_date),/Daily approval changed/,'agent');
 const unapproved=call('submit',intent('revoked-plan',input.work_date,current),'agent'),rv=call('review',{proposal_id:unapproved.proposal_id});
 call('configure',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:false},'native',2);denied('approve',approve(rv),/capability revoked/);denied('status',{proposal_id:submitted.proposal_id},/no approved plan capability/,'agent');call('configure',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:true},'native',2);denied('list',{work_date:input.work_date},/no approved plan capability/,'agent');assert.equal(JSON.parse(sql(db,identity('agent')+`select public.ops_task_agent('get',${quote(JSON.stringify({task_id:task.id}))}::jsonb);`).stdout.trim().split('\n').at(-1)).id,task.id,'Revoking plan consent altered existing task read permission');call('consent',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:true,confirmed:true});
 sql(db,"update auth.oauth_consents set revoked_at=clock_timestamp() where client_id='fictional-chatgpt';");
 assert.deepEqual(call('my_connections'),[reader]);
 denied('approve',approve(rv),/consent revoked/);denied('list',{work_date:input.work_date},/OAuth consent/,'agent');sql(db,"update auth.oauth_consents set revoked_at=null where client_id='fictional-chatgpt';");
 denied('consent',{client_id:'fictional-chatgpt',can_read_plans:true,can_submit_plans:true,confirmed:true},/cannot review or approve/,'agent');
 call('consent',{...planConsent,can_read_plans:false,can_submit_plans:false});
 assert.deepEqual(call('my_connections'),[configured,reader]);
 denied('approve',approve(rv),/native plan consent revoked/);denied('list',{work_date:input.work_date},/no approved plan capability/,'agent');
 denied('submit',input,/no approved plan capability/,'agent');

 // Reviewed scoped task writes still work without personal plan consent.
 sql(db,`begin;
 ${identity('agent')}
 do $task$
 declare original jsonb; proposal jsonb; saved jsonb;
 begin
  proposal:=public.ops_task_agent('preview',jsonb_build_object(
   'operation','create','request_ref','fictional-create-with-snapshot',
   'source_note','Fictional task API regression with snapshot installed',
   'changes',jsonb_build_object('task_title','Fictional reviewed snapshot regression'),
   'clear_fields','[]'::jsonb
  ));
  saved:=public.ops_task_agent('apply',jsonb_build_object(
   'proposal_id',proposal->>'proposal_id','preview_token',proposal->>'preview_token',
   'confirmation',proposal->>'confirmation','reviewed',true
  ));
  if saved->'task'->>'task_title' is distinct from 'Fictional reviewed snapshot regression'
     or public.ops_task_agent('get',jsonb_build_object('task_id',saved->>'task_id')) is distinct from saved->'task'
  then raise exception 'Scoped task create/readback failed with snapshot installed';end if;

  original:=public.ops_task_agent('get',jsonb_build_object('task_id',${quote(task.id)}));
  proposal:=public.ops_task_agent('preview',jsonb_build_object(
   'operation','update','request_ref','fictional-after-plan-revoke','task_id',${quote(task.id)},
   'expected_updated_at',original->>'updated_at','source_note','Fictional change after plan consent revocation',
   'changes',jsonb_build_object('priority','urgent'),'clear_fields','[]'::jsonb
  ));
  saved:=public.ops_task_agent('apply',jsonb_build_object(
   'proposal_id',proposal->>'proposal_id','preview_token',proposal->>'preview_token',
   'confirmation',proposal->>'confirmation','reviewed',true
  ));
  if saved->'task'->>'priority' is distinct from 'urgent'
     or public.ops_task_agent('get',jsonb_build_object('task_id',${quote(task.id)})) is distinct from saved->'task'
  then raise exception 'Scoped task update/readback failed after plan consent revocation';end if;
 end $task$;
 rollback;`);
 call('consent',planConsent);
 const src=call('submit',intent('changed-task','2026-11-17'),'agent'),sr=call('review',{proposal_id:src.proposal_id});sql(db,`update public.ops_tasks set updated_at=updated_at+interval '0.000001 seconds' where id=${quote(task.id)};`);denied('approve',approve(sr),/saved task changed/);sql(db,`update public.ops_tasks set updated_at=${quote(task.updated_at)} where id=${quote(task.id)};`);task.updated_at=sql(db,`select updated_at from public.ops_tasks where id=${quote(task.id)};`).stdout.trim();
 sql(db,`update ops_agent_private.plan_requests set expires_at=clock_timestamp()-interval '1 second' where id=${quote(src.proposal_id)};`);denied('approve',approve(sr),/expired/);
 const p1=call('submit',intent('concurrent-one','2026-11-18'),'agent'),p2=call('submit',intent('concurrent-two','2026-11-18'),'agent'),r1=call('review',{proposal_id:p1.proposal_id}),r2=call('review',{proposal_id:p2.proposal_id});await competing(approve(r1),approve(r2),false);
 const p3=call('submit',intent('same-retry','2026-11-19'),'agent'),r3=call('review',{proposal_id:p3.proposal_id});await competing(approve(r3),approve(r3),true);
 await mcpRoundTrip(intent('mcp-native-roundtrip','2026-11-22'));
 const manual=JSON.parse(JSON.stringify(reviewed.event.event_metadata.plan));manual.planId=actor(100);manual.workDate='2026-11-23';manual.revision=2;manual.rows[0].code=task.task_code||'';manual.rows[0].updatedAt=task.updated_at;manual.sources[manual.rows[0].sourceId].version=task.updated_at;
 const prepared=call('prepare',{request_ref:'native-editor-contract',expected_approval_id:null,plan:manual}),nativeReview=call('review',{proposal_id:prepared.proposal_id});assert.deepEqual(nativeReview.event.event_metadata.plan,manual);assert.equal(call('approve',approve(nativeReview)).event.event_metadata.plan.planId,manual.planId);

 for(const n of [3,4,5])denied('prepare',{request_ref:'denied-'+n,expected_approval_id:null,plan:{}},/editor|staff access/,'native',n);
 denied('list',{work_date:input.work_date},/active staff session/,'native',1,{is_anonymous:true});
 sql(db,`update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=${quote(nativeSid(1))};`);denied('list',{work_date:input.work_date},/expired or revoked/);sql(db,`update auth.sessions set not_after=null,oauth_client_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id=${quote(nativeSid(1))};`);denied('list',{work_date:input.work_date},/native staff session/);sql(db,`update auth.sessions set oauth_client_id=null where id=${quote(nativeSid(1))};`);
 const tableDenied=sql(db,identity()+"select * from ops_agent_private.plan_requests;",true);assert.notEqual(tableDenied.status,0);assert.match(tableDenied.stderr,/permission denied/);
 assert.equal(sql(db,'select count(*) from ci.plan_task_writes;').stdout.trim(),'0','Plan operations changed task records');
 assert.equal(sql(db,"select count(*) from public.ops_events where event_type='morning_plan_approved_v1';").stdout.trim(),'5','Approval retries duplicated journal events');
 const refused=sql(db,rollback,true);assert.notEqual(refused.status,0);assert.match(refused.stderr,/preservation\/recovery plan/);
 console.log('Morning integration: complete scoped task snapshot, ordering, cursor restart, projection, OAuth and plan consent, scoped task create/update, exact submission, native approval, independent readback, stale and duplicate requests, concurrent approval and guarded rollback passed.');
 }finally{for(const s of sessions)if(!s.closed){s.child.stdin.end('rollback;\n');s.child.kill()}for(const name of created.reverse())sql('postgres',`drop database ${name} with (force);`)} }
main().catch(e=>{console.error(e);process.exitCode=1});
