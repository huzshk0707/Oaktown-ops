'use strict';
const {mock,signIn,ORIGIN,USER}=require('./focus-board-fixtures.cjs');
async function morningMock(page,count=9){
 const s=await mock(page,count);Object.assign(s,{events:[],approvalPosts:[],denyApproval:false,lostApproval:false,approvalHold:null,historyFail:false,afterApproval:null,intakeSessions:[],intakeHold:null});
 s.actionHandler=async(req,reply)=>{if(req.url().includes('/rpc/ops_task_intake')){const action=req.postDataJSON().p_action;if(action==='sessions')return reply(s.intakeSessions);if(action==='state'){if(s.intakeHold)await s.intakeHold;return reply({tasks:s.tasks,items:[],receipts:[]})}}return reply({message:'No operational writes permitted in Morning fixture'},403)};
 for(const task of s.tasks){task.intake_details.next_action='Review the saved source before continuing.';if(task.status==='waiting')task.intake_details.waiting_on='Example Reviewer';}
 s.records.properties=[{id:'10000000-0000-4000-8000-000000000001',street_address:'100 Fictional Lane'}];if(s.tasks[0])s.tasks[0].property_id=s.records.properties[0].id;
 await page.route('**/rest/v1/ops_events**',async route=>{
  const req=route.request(),u=new URL(req.url()),headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(req.method()==='GET'){
   if(s.historyHold)await s.historyHold;
   if(s.historyFail)return reply({message:'Fictional journal unavailable'},503);
   const id=u.searchParams.get('id')?.replace(/^eq\./,''),date=u.searchParams.get('event_metadata->>work_date')?.replace(/^eq\./,''),offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);return reply(s.events.filter(e=>(!id||e.id===id)&&(!date||e.event_metadata?.work_date===date)).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)||b.id.localeCompare(a.id)).slice(offset,offset+limit));
  }
  const body=req.postDataJSON();s.writes.push({path:u.pathname,body:req.postData()});s.approvalPosts.push(body);
  if(s.approvalHold)await s.approvalHold;
  if(s.denyApproval||!['admin','editor'].includes(s.role))return reply({message:'Permission denied for approval',code:'42501'},403);
  if(s.events.some(e=>e.id===body.id))return reply({message:'Duplicate approval key',code:'23505'},409);
  const saved={...body,actor_id:USER,occurred_at:new Date().toISOString()};s.events.push(saved);if(s.afterApproval)s.afterApproval(s);
  if(s.lostApproval){s.lostApproval=false;return reply({message:'Fictional lost response'},503)}
  return reply([saved],201);
 });
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
