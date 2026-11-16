'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const modules=Promise.all([import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/oaktown-task-api/server.mjs'))),import(pathToFileURL(path.resolve(__dirname,'../supabase/functions/oaktown-task-api/plan-tools.mjs')))]);
const HOST='https://fictional.supabase.co',URL=HOST+'/functions/v1/oaktown-task-api/mcp',ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',P='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',EVENT='cccccccc-cccc-4ccc-8ccc-cccccccccccc',PLAN='dddddddd-dddd-4ddd-8ddd-dddddddddddd',HASH='a'.repeat(64),WHEN='2026-11-16T12:00:00.123456Z';
const plan={schema_version:'oaktown.sod-draft.v1',planId:PLAN,revision:1,workDate:'2026-11-16',text:'Fictional reviewed SOD',rows:[],sources:{manual:{id:'manual',label:'Fictional message',kind:'manual_chatgpt',originRef:'fictional-message',body:'Fictional source body should not be returned',verification:'Unverified source'}}};
const event={id:EVENT,actor_id:ID,occurred_at:WHEN,entity_type:'morning_plan',entity_id:PLAN,event_type:'morning_plan_approved_v1',event_metadata:{schema_version:'oaktown.morning-plan.v1',plan_id:PLAN,revision:1,work_date:plan.workDate,plan,approval_contract:'oaktown.sod-review.v1',review_request_id:P},review_proof:{schema_version:'oaktown.sod-review.v1',channel:'native_staff_review',event_id:EVENT,request_id:P,reviewer_id:ID,reviewed_at:WHEN,content_hash:HASH}};
const receipt={schema_version:'oaktown.plan-approval-receipt.v1',proposal_id:P,event_id:EVENT,reviewer_id:ID,reviewed_at:WHEN,saved_at:WHEN,content_hash:HASH};
async function invoke(h,name,args,token='fictional-scoped-token'){const r=await h(new Request(URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));return r.json()}
async function handler(fn){const [{createHandler}]=await modules;return createHandler({supabaseUrl:HOST,publishableKey:'fictional-public',verifyToken:async()=>({sub:ID}),fetchImpl:async(url,opts)=>{assert.equal(url,HOST+'/rest/v1/rpc/ops_morning_plan');assert.equal(opts.headers.Authorization,'Bearer fictional-scoped-token');return fn(JSON.parse(opts.body))}})}
test('plan read is scoped, requires a server proof and omits original message bodies',async()=>{
 const h=await handler(({action,payload})=>{assert.equal(action,'head');assert.deepEqual(payload,{work_date:plan.workDate});return Response.json({schema_version:'oaktown.daily-plan-head.v1',work_date:plan.workDate,approval_id:EVENT,event})});
 const r=await invoke(h,'read_daily_plan',{work_date:plan.workDate}),d=r.result.structuredContent;assert.equal(d.approval_id,EVENT);assert.equal(d.approved_plan.text,plan.text);assert.equal(d.approved_plan.sources[0].body,undefined);assert.ok(!JSON.stringify(r).includes('should not be returned'));
 const no=await invoke(h,'read_daily_plan',{work_date:plan.workDate},null);assert.equal(no.result.isError,true);
 const bad=await handler(()=>Response.json({schema_version:'oaktown.daily-plan-head.v1',work_date:plan.workDate,approval_id:EVENT,event:{...event,review_proof:null}}));assert.equal((await invoke(bad,'read_daily_plan',{work_date:plan.workDate})).result.isError,true);
});
test('submission saves only a pending request and cannot return a native review token or claim approval',async()=>{
 const calls=[],h=await handler(({action,payload})=>{calls.push(action);assert.equal(payload.expected_approval_id,null);return Response.json({schema_version:'oaktown.plan-submission.v1',proposal_id:P,state:'pending_staff_review',work_date:plan.workDate,content_hash:HASH,review_token:'forbidden-native-token',receipt:null})});
 const args={request_ref:'fictional-daily-plan',expected_approval_id:null,work_date:plan.workDate,text:plan.text,tasks:[],planning_items:[{title:'Verify report',action:'Review original source',section:'Additional work',source_ref:'fictional-note',source_note:'Manually reported; not verified.'}]};
 const r=await invoke(h,'submit_daily_plan',args);assert.equal(r.result.structuredContent.approved,false);assert.equal(r.result.structuredContent.outcome,'pending_staff_review');assert.deepEqual(calls,['submit']);assert.ok(!JSON.stringify(r).includes('forbidden-native-token'));
 const bad=await invoke(h,'submit_daily_plan',{...args,tasks:[{task_id:ID,expected_updated_at:WHEN,action:'Review',section:'Additional work',status:'completed'}]});assert.equal(bad.result.isError,true);assert.deepEqual(calls,['submit']);
 await invoke(h,'approve_daily_plan',{proposal_id:P,reviewed:true});assert.deepEqual(calls,['submit'],'No OAuth approval tool may be registered');
});
test('approved submission requires matching immutable receipt and separate event readback',async()=>{
 const [,{verifiedPlanReceipt}]=await modules;assert.equal(verifiedPlanReceipt(receipt,event,P),true);assert.equal(verifiedPlanReceipt({...receipt,reviewer_id:P},event,P),false);
 for(const mode of ['ok','mismatched-read','missing-proof','lost-read','pending','expired']){
  const calls=[],h=await handler(({action})=>{calls.push(action);if(action==='status')return Response.json({schema_version:'oaktown.plan-submission.v1',proposal_id:P,state:mode==='pending'?'pending_staff_review':mode==='expired'?'expired':'approved',receipt,event});if(mode==='lost-read')throw Error('Fictional unavailable read');return Response.json(mode==='mismatched-read'?{...event,occurred_at:'2026-11-17T00:00:00Z'}:mode==='missing-proof'?{...event,review_proof:null}:event)});
  const r=await invoke(h,'get_plan_submission',{proposal_id:P}),d=r.result.structuredContent;assert.equal(d.approved,mode==='ok',mode);assert.equal(d.verified,mode==='ok',mode);assert.deepEqual(calls,['pending','expired'].includes(mode)?['status']:['status','get']);
 }
});
test('revoked backend plan capability is surfaced without any fallback table or task write',async()=>{
 const calls=[],h=await handler(({action})=>{calls.push(action);return Response.json({code:'42501',message:'Native plan consent revoked'},{status:403})});const r=await invoke(h,'read_daily_plan',{work_date:plan.workDate});assert.equal(r.result.isError,true);assert.equal(r.result.structuredContent.error,'42501');assert.deepEqual(calls,['head']);
});
