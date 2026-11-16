'use strict';
const {mock,signIn,ORIGIN,USER}=require('./focus-board-fixtures.cjs');
const {randomUUID,createHash}=require('node:crypto');
const {attest}=require('./plan-fixtures.cjs');
async function morningMock(page,count=9){
 const s=await mock(page,count);Object.assign(s,{events:[],approvalPosts:[],denyApproval:false,lostApproval:false,approvalHold:null,historyFail:false,afterApproval:null,intakeSessions:[],intakeHold:null});
 s.actionHandler=async(req,reply)=>{if(req.url().includes('/rpc/ops_task_intake')){const action=req.postDataJSON().p_action;if(action==='sessions')return reply(s.intakeSessions);if(action==='state'){if(s.intakeHold)await s.intakeHold;return reply({tasks:s.tasks,items:[],receipts:[]})}}return reply({message:'No operational writes permitted in Morning fixture'},403)};
 for(const task of s.tasks){task.intake_details.next_action='Review the saved source before continuing.';if(task.status==='waiting')task.intake_details.waiting_on='Example Reviewer';}
 s.records.properties=[{id:'10000000-0000-4000-8000-000000000001',street_address:'100 Fictional Lane'}];if(s.tasks[0])s.tasks[0].property_id=s.records.properties[0].id;
 Object.assign(s,{planCalls:[],requests:new Map(),planUnavailable:false,planDenied:false,rawJournal:[],planClients:[{client_id:'fictional-chatgpt',label:'Fictional ChatGPT',enabled:true,can_read_plans:false,can_submit_plans:false,my_can_read_plans:false,my_can_submit_plans:false}]});
 s.addPlanProposal=(plan,{agent=true,expected=null}={})=>{const id=randomUUID(),event={id:randomUUID(),entity_type:'morning_plan',entity_id:plan.planId,event_type:'morning_plan_approved_v1',summary:'Staff-approved morning plan for '+plan.workDate,event_metadata:{schema_version:'oaktown.morning-plan.v1',plan_id:plan.planId,revision:plan.revision,work_date:plan.workDate,plan,approval_contract:'oaktown.sod-review.v1',review_request_id:id}},hash=createHash('sha256').update(JSON.stringify(event)).digest('hex'),review={schema_version:'oaktown.plan-review.v1',proposal_id:id,review_token:randomUUID(),expires_at:new Date(Date.now()+1800000).toISOString(),event,content_hash:hash,confirmation:'APPROVE '+id};const p={review,agent,expected,state:'pending_staff_review'};s.requests.set(id,p);return p};
 await page.route('**/rest/v1/rpc/ops_morning_plan',async route=>{
  const req=route.request(),headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'},reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const body=req.postDataJSON(),{action,payload={}}=body;s.planCalls.push(body);
  if(s.planUnavailable)return reply({message:'Function unavailable',code:'PGRST202'},404);
  if(s.planDenied)return reply({message:'Plan access denied',code:'42501'},403);
  if(['head','list','get'].includes(action)){if(s.historyHold)await s.historyHold;if(s.historyFail)return reply({message:'Fictional review history unavailable'},503)}
  const ordered=()=>s.events.filter(e=>!payload.work_date||e.event_metadata.work_date===payload.work_date).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)||b.id.localeCompare(a.id));
  if(action==='head'){const event=ordered()[0]||null;return reply({schema_version:'oaktown.daily-plan-head.v1',work_date:payload.work_date,approval_id:event?.id||null,event})}
  if(action==='list')return reply(ordered().slice(payload.offset||0,(payload.offset||0)+100));
  if(action==='get'){const e=s.events.find(e=>e.id===payload.event_id);return e?reply(e):reply({message:'Approval not found',code:'P0002'},404)}
  if(action==='pending')return reply([...s.requests.values()].filter(p=>p.state==='pending_staff_review').map(p=>({proposal_id:p.review.proposal_id,work_date:p.review.event.event_metadata.work_date,from_chatgpt:p.agent,text:p.review.event.event_metadata.plan.text})));
  if(action==='prepare'){const p=s.addPlanProposal(payload.plan,{agent:false,expected:payload.expected_approval_id});return reply({proposal_id:p.review.proposal_id,state:p.state})}
  if(action==='my_connections')return reply(s.planClients);
  if(action==='capabilities'){const c=s.planClients.find(c=>c.client_id===payload.client_id);return c?reply(c):reply({message:'Unknown client'},404)}
  if(action==='configure'){if(s.role!=='admin')return reply({message:'Native administrator required',code:'42501'},403);const c=s.planClients.find(c=>c.client_id===payload.client_id);Object.assign(c,payload,{my_can_read_plans:false,my_can_submit_plans:false});return reply(c)}
  if(action==='consent'){if(payload.confirmed!==true||payload.can_submit_plans&&!payload.can_read_plans)return reply({message:'Explicit plan consent required',code:'22023'},400);const c=s.planClients.find(c=>c.client_id===payload.client_id);if(payload.can_read_plans&&!c.can_read_plans||payload.can_submit_plans&&!c.can_submit_plans)return reply({message:'Capability disabled',code:'42501'},403);Object.assign(c,{my_can_read_plans:payload.can_read_plans,my_can_submit_plans:payload.can_submit_plans});return reply({...payload,saved:true,actor_id:USER})}
  const p=s.requests.get(payload.proposal_id);if(!p)return reply({message:'Request not found',code:'P0002'},404);
  if(action==='review')return p.state==='approved'?reply({approved:true,event:p.saved}):reply(p.review);
  if(action==='status')return reply({schema_version:'oaktown.plan-submission.v1',proposal_id:p.review.proposal_id,state:p.state,event:p.saved||null,receipt:p.receipt||null});
  if(action==='approve'){
   s.writes.push({path:'/rest/v1/rpc/ops_morning_plan',body:req.postData()});s.approvalPosts.push(payload);if(s.approvalHold)await s.approvalHold;
   if(s.denyApproval||!['admin','editor'].includes(s.role))return reply({message:'Permission denied for approval',code:'42501'},403);
   if(payload.review_token!==p.review.review_token||payload.reviewed!==true||payload.confirmation!==p.review.confirmation)return reply({message:'Exact review required',code:'42501'},403);
   if(p.state==='approved')return reply({event:p.saved,receipt:p.receipt,replayed:true});
   if(s.conflictApproval)return reply({message:'Daily approval changed since review',code:'40001'},409);
   const saved=attest({...p.review.event,actor_id:USER,occurred_at:new Date().toISOString()},p.review.proposal_id,p.review.content_hash);p.saved=saved;p.state='approved';p.receipt={schema_version:'oaktown.plan-approval-receipt.v1',proposal_id:p.review.proposal_id,event_id:saved.id,reviewer_id:USER,content_hash:p.review.content_hash};s.events.push(saved);if(s.afterApproval)s.afterApproval(s);
   if(s.lostApproval){s.lostApproval=false;return reply({message:'Fictional lost response'},503)}return reply({event:saved,receipt:p.receipt,replayed:false});
  }
  return reply({message:'Unsupported fictional plan operation'},400);
 });
 // Keep unrelated workspace journal reads available; Phase 6 must not use this for SOD saves.
 await page.route('**/rest/v1/ops_events**',async route=>{s.rawJournal.push({method:route.request().method(),url:route.request().url()});return route.fulfill({status:route.request().method()==='GET'?200:403,contentType:'application/json',body:'[]'})});
 return s;
}
async function open(page,count){const s=await morningMock(page,count);await page.goto(ORIGIN+'/#/morning');await signIn(page);await page.locator('#morning-secondary').evaluate(n=>n.open=true);await page.locator('#morning-grid').waitFor({state:'visible'});return s}
async function addMessage(page,{kind='email',subject='Fictional deposit update',body='Deposit submitted: $1,500.00. Please confirm receipt.',ref='fictional-message-001'}={}){
 await page.locator('#morning-intake').evaluate(n=>n.open=true);await page.locator('#morning-source-kind').selectOption(kind);await page.locator('#morning-source-sender').fill('Example Staff');await page.locator('#morning-source-subject').fill(subject);await page.locator('#morning-source-ref').fill(ref);await page.locator('#morning-source-body').fill(body);await page.locator('#morning-intake-form').getByRole('button',{name:'Add for review',exact:true}).click();
}
async function reviewFirst(page){await page.locator('#morning-incoming').getByRole('button',{name:'Review IN-001',exact:true}).click();await page.locator('#morning-review-confirm').check();await page.locator('#morning-review-save').click()}
async function draft(page){await page.locator('#morning-priority-work').getByRole('button',{name:'Add to SOD',exact:true}).first().click();await page.locator('#sod-generate').click()}
async function approvePlan(page){await page.locator('#morning-approve-open').click();await page.locator('#morning-approve-confirm').check();await page.locator('#morning-approve-save').click();await page.locator('#morning-approve-dialog').waitFor({state:'hidden'})}
module.exports={morningMock,open,addMessage,reviewFirst,draft,approvePlan,signIn,ORIGIN,USER};
