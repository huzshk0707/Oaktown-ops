/* Narrow reviewed actions over the existing intake contract; no storage or I/O. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel,typeof module==='object'&&module.exports?require('./reviewed-write-model.js'):root.OpsReviewedWrite);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsFocusActionsModel=api;})(typeof window!=='undefined'?window:null,function(T,W){
 'use strict';
 const owns=(v,k)=>Object.hasOwn(v||{},k),copy=v=>JSON.parse(JSON.stringify(v)),active=new Set(['pending','in_progress','waiting','blocked']);
 const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v??null);
 const same=(a,b)=>canonical(a)===canonical(b);
 function available(task){
  if(!task||task.archived_at||!active.has(task.status))return 'This task is no longer active. Refresh and review the saved record.';
  if(!W.sameVersion(task.updated_at,task.updated_at))return 'A saved task version is required. Refresh tasks first.';
  return '';
 }
 function value(task,key){return key==='status'?task.status:task.intake_details?.[key]}
 function schedule(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&T.validDate(v.date)&&v.timezone==='America/New_York'&&(v.time===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))&&typeof v.original_text==='string'&&v.original_text.trim().length>0&&v.original_text.length<=2000&&Object.keys(v).every(k=>['date','time','timezone','original_text'].includes(k))}
 function inverse(task,changes,clears){
  const restore={},remove=[];
  for(const key of new Set([...Object.keys(changes),...clears])){
   if(key==='status'){restore.status=task.status;continue}
   const prior=value(task,key);
   if(!owns(task.intake_details,key)){remove.push(key);continue}
   if(key==='follow_up'?!schedule(prior):typeof prior!=='string'||!prior.trim()||prior.length>2000)return null;
   restore[key]=copy(prior);
  }
  return {changes:restore,clears:remove};
 }
 function plan(task,kind,input={},day=T.today()){
  const problem=available(task);if(problem)throw Error(problem);
  let changes={},clears=[];
  if(kind==='complete'){
   const summary=String(input.summary||'').trim();
   if(!summary||summary.length>1200)throw Error('Describe the completed work (1–1,200 characters).');
   if(task.completed_at)throw Error('This active task already has a completion timestamp. Use Review Task to reconcile it.');
   changes={status:'completed',completion_summary:summary};
   clears=['waiting_on','blocked_reason'].filter(k=>owns(task.intake_details,k));
  }else if(kind==='defer'){
   if(!T.validDate(input.date)||input.date<=day)throw Error('Choose a follow-up date after today in Eastern time.');
   const prior=task.intake_details?.follow_up?.date;
   if(T.validDate(prior)&&input.date<=prior)throw Error('Choose a date later than the current follow-up.');
   changes={follow_up:{date:input.date,time:null,timezone:'America/New_York',original_text:'Follow-up moved to '+input.date+' by staff in Focus Board'}};
  }else throw Error('Unsupported task action.');
  return build(task,kind,changes,clears,inverse(task,changes,clears));
 }
 function build(task,kind,changes,clears,reverse=null,reverses=null){
  const after=copy(task);after.intake_details={...after.intake_details};
  for(const [k,v] of Object.entries(changes)){if(k==='status')after.status=v;else after.intake_details[k]=copy(v)}
  for(const k of clears)delete after.intake_details[k];
  if(changes.status&&changes.status!=='completed')after.completed_at=null;
  const d=after.intake_details;
  if(after.status==='waiting'&&!String(d.waiting_on||'').trim()||after.status!=='waiting'&&owns(d,'waiting_on')||after.status==='blocked'&&!String(d.blocked_reason||'').trim()||after.status==='completed'&&!String(d.completion_summary||'').trim())throw Error('Saved status details need review. Open Review Task before using quick actions.');
  const before=Object.fromEntries([...new Set([...Object.keys(changes),...clears])].map(k=>[k,owns(task.intake_details,k)||k==='status'?value(task,k):{absent:true}]));
  return {id:task.id,version:task.updated_at,title:task.task_title,code:task.task_code||task.id,kind,changes:copy(changes),clears:[...clears],before,after,reverse,reverses};
 }
 function undo(task,record,now=Date.now()){
  if(!record?.reverse||now>=record.expiresAt)throw Error('Undo is unavailable: the recent-action window has ended. Use Review Task for recovery.');
  if(!task||task.id!==record.id||task.archived_at||!W.sameVersion(task.updated_at,record.version))throw Error('Undo is unavailable: the task changed or is no longer accessible. Newer work will not be overwritten.');
  return build(task,'undo',record.reverse.changes,record.reverse.clears,null,record.reference);
 }
 function payload(plan,session,reference,day=T.today()){
  const evidence=JSON.stringify({interface:'Focus Board',action:plan.kind,reverses:plan.reverses,before:plan.before,changes:plan.changes,clears:plan.clears});
  if(evidence.length>8000)throw Error('This change contains too much context for a quick action. Use Review Task.');
  return {reviewed:true,expected_versions:{[plan.id]:plan.version},resolutions:{},accept_clears:plan.clears.length?['P1']:[],accept_suggestions:[],export:{schema_version:'oaktown.task-intake.v1',session_id:session,batch_ref:reference,work_date:day,timezone:'America/New_York',snapshot_ref:null,sources:[{source_ref:'S1',kind:'text',label:'Staff-confirmed Focus Board '+plan.kind,occurred_at:null,evidence_excerpt:evidence}],proposals:[{proposal_ref:'P1',operation:'update',task_id:plan.id,expected_updated_at:plan.version,match_reason:'Focus Board '+plan.kind+(plan.reverses?' reversing '+plan.reverses:'')+'; reviewed fields: '+Object.keys(plan.changes).concat(plan.clears).join(', '),context:{},changes:plan.changes,suggestions:{},source_refs:['S1'],needs_clarification:false,proposed_clear_fields:plan.clears}],activities:[],questions:[]}};
 }
 function receipted(plan,receipt,session,reference){
  const saved=receipt?.tasks?.[0];
  if(receipt?.schema_version!=='oaktown.task-receipt.v1'||receipt.session_id!==session||receipt.batch_ref!==reference||receipt.tasks?.length!==1||receipt.proposals?.length!==1||receipt.proposals[0].task_id!==plan.id||receipt.proposals[0].proposal_ref!=='P1'||!['imported','already_imported'].includes(receipt.proposals[0].result)||!saved||saved.id!==plan.id||!W.sameVersion(saved.updated_at,saved.updated_at))return false;
  return ['status','task_title','priority','workflow_key','property_id','unit_id','renewal_case_id','intake_details'].every(key=>same(saved[key],plan.after[key]));
 }
 function verified(plan,receipt,task,session,reference){
  const saved=receipt?.tasks?.[0];
  if(!receipted(plan,receipt,session,reference)||!task||task.id!==plan.id||task.archived_at||!W.sameVersion(saved.updated_at,task.updated_at))return false;
  for(const key of ['status','task_title','priority','workflow_key','property_id','unit_id','renewal_case_id','intake_details'])if(!same(saved[key],task[key])||!same(task[key],plan.after[key]))return false;
  for(const key of ['due_at','assigned_label','assigned_user_id','lease_id','parent_task_id','notes'])if(!same(task[key],plan.after[key]))return false;
  return plan.after.status==='completed'?!!task.completed_at:same(task.completed_at,plan.after.completed_at);
 }
 function recent(plan,task,reference,now=Date.now()){
  return {id:plan.id,title:plan.title,code:plan.code,kind:plan.kind,version:task.updated_at,reference,reverse:plan.reverse,expiresAt:now+120000};
 }
 function suggest(task,day=T.today()){
  const current=task?.intake_details?.follow_up?.date,base=T.validDate(current)&&current>day?current:day,d=new Date(base+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
 }
 return Object.freeze({available,plan,undo,payload,receipted,verified,recent,suggest,same});
});
