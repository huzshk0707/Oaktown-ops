'use strict';
const {mock,signIn,ORIGIN,USER}=require('./focus-board-fixtures.cjs');
async function actionMock(page,count=9){
 const s=await mock(page,count),sessions=new Set(),receipts=new Map();let serial=0;
 Object.assign(s,{audit:[],saveCalls:[],denyWrite:false,saveHold:null,beforeSave:null,lostReply:false,badReceipt:false});
 s.tasks[0].workflow_key='general';s.tasks[0].intake_details.description='Fictional inspection and report review.';
 s.actionHandler=async(req,reply)=>{
  if(new URL(req.url()).pathname!=='/rest/v1/rpc/ops_task_intake')return reply({message:'Unsupported fictional write'},403);
  const body=req.postDataJSON();
  if(s.expireSession)return reply({message:'Fictional session expired'},401);
  if(s.denyWrite||!['admin','editor'].includes(s.role))return reply({message:'Active editor access required',code:'22023'},400);
  if(body.p_action==='new'){const id='10000000-0000-4000-8000-'+String(++serial).padStart(12,'0');sessions.add(id);return reply({session_id:id})}
  if(body.p_action!=='save'||!sessions.has(body.p_session))return reply({message:'Intake session unavailable',code:'22023'},400);
  s.saveCalls.push(body);if(s.saveHold)await s.saveHold;if(s.beforeSave){const fn=s.beforeSave;s.beforeSave=null;fn(s)}
  const p=body.p_payload,e=p.export,proposal=e.proposals[0],key=body.p_session+':'+e.batch_ref,prior=receipts.get(key);
  if(prior)return JSON.stringify(prior.request)===JSON.stringify(body)?reply(prior.receipt):reply({message:'Changed batch reference',code:'22023'},400);
  const row=s.tasks.find(t=>t.id===proposal.task_id);
  if(!row||row.archived_at)return reply({message:'Task unavailable',code:'22023'},400);
  if(row.updated_at!==p.expected_versions[row.id])return reply({message:'Task changed since review. Refresh and review again.',code:'22023'},400);
  if(s.failWrite)return reply({message:'Fictional network failure'},503);
  const before=structuredClone(row),after=structuredClone(row),changes=proposal.changes;
  if(!p.reviewed)return reply({message:'Review required',code:'22023'},400);
  for(const [k,v]of Object.entries(changes)){if(k==='status')after.status=v;else after.intake_details[k]=v}
  if(p.accept_clears.includes(proposal.proposal_ref))for(const k of proposal.proposed_clear_fields)delete after.intake_details[k];
  if(after.status==='completed'&&!after.intake_details.completion_summary?.trim()||after.status==='waiting'&&!after.intake_details.waiting_on?.trim()||after.status!=='waiting'&&Object.hasOwn(after.intake_details,'waiting_on')||after.status==='blocked'&&!after.intake_details.blocked_reason?.trim())return reply({message:'Task status details conflict',code:'22023'},400);
  after.updated_at='2026-11-15T21:00:00.'+String(++serial).padStart(6,'0')+'Z';
  if(changes.status)after.completed_at=changes.status==='completed'?'2026-11-15T21:00:00Z':null;
  Object.assign(row,after);s.audit.push({actor_id:USER,before,after:structuredClone(row),proposal:structuredClone(proposal)});
  const receipt={schema_version:'oaktown.task-receipt.v1',session_id:body.p_session,batch_ref:e.batch_ref,saved_at:'2026-11-15T21:00:00Z',proposals:[{proposal_ref:'P1',task_id:row.id,result:'imported'}],activities:[],tasks:[structuredClone(row)]};
  receipts.set(key,{request:structuredClone(body),receipt});
  if(s.lostReply){s.lostReply=false;return reply({message:'Fictional lost response'},503)}
  return reply(s.badReceipt?{...receipt,tasks:[]}:receipt);
 };
 return s;
}
async function open(page,count){const s=await actionMock(page,count);await page.goto(ORIGIN+'/#/focus');await signIn(page);return s}
module.exports={actionMock,open,ORIGIN,signIn};
