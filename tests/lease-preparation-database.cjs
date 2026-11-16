'use strict';
// Only private clones of the fictional CI baseline. Never a production target.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync,spawn}=require('node:child_process');
if(process.env.PGDATABASE!=='oaktown_portfolio_ci')throw Error('Disposable oaktown_portfolio_ci required');
const bin=process.env.OAKTOWN_PSQL_BIN||'psql',db='oaktown_lease_editor_ci',empty='oaktown_lease_empty_ci',root=path.resolve(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261116060547_lease_preparation_page8_editor.sql'),'utf8'),rollback=fs.readFileSync(path.join(root,'supabase/rollback/20261116060547_lease_preparation_page8_editor.sql'),'utf8');
const q=x=>"'"+String(x).replaceAll("'","''")+"'",actor=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),sid=n=>'dddddddd-dddd-4ddd-8ddd-'+String(n).padStart(12,'0');
function sql(database,input,allowed=false){const r=spawnSync(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',database],{input,encoding:'utf8',timeout:20000,maxBuffer:3e6});if(r.error)throw r.error;if(r.status&&!allowed)throw Error((r.stderr||r.stdout).slice(-2500));return r}
function identity(n=1,extra={}){return `set role authenticated;select set_config('request.jwt.claim.sub',${q(actor(n))},false);select set_config('request.jwt.claims',${q(JSON.stringify({sub:actor(n),role:'authenticated',is_anonymous:false,session_id:sid(n),...extra}))},false);`}
const statement=(action,payload)=>`select public.ops_lease_preparation(${q(action)},${q(JSON.stringify(payload))}::jsonb);`;
const call=(action,payload={},n=1,extra={})=>JSON.parse(sql(db,identity(n,extra)+statement(action,payload)).stdout.trim().split('\n').at(-1));
function denied(action,payload,match,n=1,extra={}){const r=sql(db,identity(n,extra)+statement(action,payload),true);assert.notEqual(r.status,0);assert.match(r.stderr,match)}
function concurrent(input){return new Promise((resolve,reject)=>{const p=spawn(bin,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',db]);let err='';p.stderr.on('data',x=>err+=x);p.stdout.resume();p.on('error',reject);p.on('close',code=>resolve({code,err}));p.stdin.end(input)})}
async function main(){const created=[];try{
 for(const name of [db,empty]){sql('postgres',`create database ${name} template oaktown_portfolio_ci;`);created.push(name);sql(name,migration)}
 sql(empty,rollback);assert.equal(sql(empty,"select to_regprocedure('public.ops_lease_preparation(text,jsonb)') is null;").stdout.trim(),'t');
 sql(db,`alter table auth.sessions add column if not exists oauth_client_id uuid;insert into auth.sessions(id,user_id) select ('dddddddd-dddd-4ddd-8ddd-'||lpad(n::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;`);
 const unit=sql(db,'select id from public.units order by id limit 1;').stdout.trim(),other=sql(db,`select id from public.leases where unit_id<>${q(unit)}::uuid limit 1;`).stdout.trim();assert.ok(unit);
 const f=await require('./lease-template-fixture.cjs').fixture(),data={schema_version:'oaktown.lease-preparation.v1',leaseId:null,...f.data};Object.assign(data.state,{unitId:unit,cityline:'Example City, KY 40201',approvalReviewed:true,depositStepReviewed:true,conditionsReviewed:true,satisfactory:'Yes',occupants:['Fictional Resident'],utilities:Object.fromEntries(require('../renewal-rules.js').utilities.map(k=>[k,'Tenant'])),appliances:Object.fromEntries(require('../renewal-rules.js').appliances.map(k=>[k,'No']))});
 const originalTasks=sql(db,"select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.ops_tasks t;").stdout.trim();
 const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',request=n=>'cccccccc-cccc-4ccc-8ccc-'+String(n).padStart(12,'0');
 const save={id,expected_version:0,request_ref:request(1),status:'draft',data};
 assert.equal(call('save',save).version,1);assert.equal(call('save',save).version,1,'Identical retry duplicated draft');
 denied('save',{...save,data:{...data,state:{...data.state,address:'Different retry'}}},/identical payload/);
 denied('save',{...save,request_ref:request(2)},/changed/);
 denied('get',{id},/this account/,2);denied('get',{id},/staff editor/,3);denied('get',{id},/staff editor/,4);denied('get',{id},/Native staff/,1,{client_id:'fictional-oauth'});
 assert.equal(call('list',{}).cases.length,1);assert.equal(call('context',{unit_id:unit}).approved_conditions,null);
 if(other)denied('save',{...save,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',request_ref:request(3),data:{...data,leaseId:other}},/does not belong/);
 denied('save',{...save,expected_version:1,request_ref:request(4),status:'ready',data:{...data,state:{...data.state,bedrooms:'6'}}},/six-bedroom/);
 denied('save',{...save,expected_version:1,request_ref:request(40),status:'ready',data:{...data,state:{...data.state,roomPlacements:{living:{section:'kitchen',column:0,row:0}}}}},/collide/);
 denied('save',{...save,expected_version:1,request_ref:request(41),status:'ready',data:{...data,template:{...data.template,map:{...data.template.map,fields:data.template.map.fields.map((f,i)=>i===0?{...f,x:-10}:f)}}}},/outside/);
 denied('save',{...save,expected_version:1,request_ref:request(42),status:'ready',data:{...data,state:{...data.state,conditions:{...data.state.conditions,'bedroom-3::Floor':'Unmapped observation'}}}},/every entered/);
 denied('save',{...save,expected_version:1,request_ref:request(43),status:'ready',data:{...data,state:{...data.state,utilities:{}}}},/Confirm utility/);
 for(const key of ['term/utility-0','term/occupant-0','slot/basement/0/0/label']){
  denied('save',{...save,expected_version:1,request_ref:request(44),status:'ready',data:{...data,template:{...data.template,map:{...data.template.map,fields:data.template.map.fields.filter(f=>f.key!==key)}}}},/Map/);
 }
 denied('save',{...save,expected_version:1,request_ref:request(45),status:'ready',data:{...data,state:{...data.state,roomLocations:{'bedroom-3':'Second Floor'}}}},/Map room location/);
 denied('save',{...save,expected_version:1,request_ref:request(46),status:'ready',data:{...data,template:{...data.template,map:{...data.template.map,protectedAreas:[{page:8,x:-1,y:65,width:50,height:50}]}}}},/outside/);
 assert.equal(call('save',{...save,expected_version:1,request_ref:request(5),status:'ready'}).version,2);
 const approve={id,expected_version:2,request_ref:request(6),reviewed:true,confirmation:'APPROVE '+id+' VERSION 2'};
 denied('approve',{...approve,reviewed:false},/Exact native/);
 const approved=call('approve',approve);assert.equal(approved.version,3);assert.equal(approved.receipt.executed,false);assert.deepEqual(call('approve',approve).receipt,approved.receipt);
 assert.equal(sql(db,"select count(*) from public.ops_events where event_type='lease_preparation_approved_v1';").stdout.trim(),'1');
 const context=call('context',{unit_id:unit},2);assert.equal(context.approved_conditions.version,3);assert.equal(context.condition_history.length,1);assert.equal(context.condition_history[0].approved_by,actor(1));assert.deepEqual(call('templates',{},2).templates,[data.template]);assert.equal(JSON.stringify(context.approved_conditions).includes('fictional@example.invalid'),false,'Condition reuse leaked old tenancy terms');
 assert.equal(call('save',{...save,expected_version:3,request_ref:request(7)}).version,4);assert.equal(call('get',{id}).receipt,null);assert.equal(call('context',{unit_id:unit}).approved_conditions.version,3,'Editing destroyed approved condition history');
 const racers=await Promise.all([8,9].map(n=>concurrent(identity()+statement('save',{...save,expected_version:4,request_ref:request(n)}))));assert.equal(racers.filter(r=>r.code===0).length,1);assert.ok(racers.some(r=>/changed/.test(r.err)));assert.equal(call('get',{id}).version,5);
 const direct=sql(db,identity()+'select * from ops_lease_private.preparations;',true);assert.notEqual(direct.status,0);assert.match(direct.stderr,/permission denied/);
 const anonymous=sql(db,"set role anon;select public.ops_lease_preparation('list','{}');",true);assert.notEqual(anonymous.status,0);
 const agent=sql(db,"set role oaktown_task_agent;select public.ops_lease_preparation('list','{}');",true);assert.notEqual(agent.status,0);
 sql(db,`delete from auth.sessions where id=${q(sid(1))}::uuid;`);denied('get',{id},/session expired/);
 assert.equal(sql(db,"select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.ops_tasks t;").stdout.trim(),originalTasks,'Preparation wrote task records');
 const refused=sql(db,rollback,true);assert.notEqual(refused.status,0);assert.match(refused.stderr,/history exists/);
 console.log('Lease preparation DB: native roles/sessions, actor isolation, unit/lease linkage, CAS/concurrent save, identical replay, immutable approval/condition reuse, redaction, zero task changes and guarded/empty rollback passed.');
 }finally{for(const name of created.reverse())sql('postgres',`drop database ${name} with (force);`)}}
main().catch(error=>{console.error(error.message);process.exitCode=1});
