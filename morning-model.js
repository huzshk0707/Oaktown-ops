/* Morning intake and review projections. No fetching, storage, AI calls or writes. */
(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports,api=factory(node?require('./today-model.js'):root.OpsTodayModel,node?require('./focus-board-model.js'):root.OpsFocusBoardModel,node?require('./renewal-rules.js'):root.OpsRenewalRules,node?require('./reviewed-write-model.js'):root.OpsReviewedWrite);if(node)module.exports=api;if(root)root.OpsMorningModel=api;})(typeof window!=='undefined'?window:null,function(T,F,R,W){
 'use strict';
 const categories=Object.freeze(['Deposit report','Staff instruction','Property request','Follow-up','Other']);
 const stages=Object.freeze(['reported_submitted','reported_received','verified_credited','pending_confirmation','failed_disputed','manual_reconciliation']);
 const stageLabels=Object.freeze({reported_submitted:'Reported submitted',reported_received:'Reported received',verified_credited:'Verified deposited / credited',pending_confirmation:'Pending confirmation',failed_disputed:'Failed / disputed report',manual_reconciliation:'Manual reconciliation'});
 const sections=Object.freeze(['Immediate priorities','Deposits and payments','Property operations','Staff assignments','Pending and blocked','Additional work']);
 const text=(v,max=8000)=>typeof v==='string'?v.trim().slice(0,max):'';
 const norm=v=>text(v).toLocaleLowerCase('en-US').replace(/\s+/g,' ').trim();
 const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v??null);
 function intake(input,id,code,now=new Date().toISOString()){
  const kind=['email','text','whatsapp','call','staff'].includes(input?.kind)?input.kind:null;
  if(!kind||!text(input.body)||input.body.length>8000)throw Error('Choose a source and enter a message of at most 8,000 characters.');
  if(!T.validDate(input.sourceDate))throw Error('Enter the reported source date.');
  const receivedAt=text(input.receivedAt,80);
  if(receivedAt&&(!T.validDate(receivedAt.slice(0,10))||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(receivedAt)||!Number.isFinite(Date.parse(receivedAt))))throw Error('A received timestamp must include its UTC offset or Z. Leave it blank if unknown.');
  return {id,code,kind,body:input.body.trim(),subject:text(input.subject,200),sender:text(input.sender,200),sourceDate:input.sourceDate,receivedAt:receivedAt||null,originRef:text(input.originRef,240),addedAt:now,status:'unreviewed',propertyId:null,taskId:null,review:null,classification:classify(input.body,input.subject)};
 }
 function fingerprint(item){return canonical([item.kind,norm(item.sender),norm(item.subject),norm(item.body)])}
 function duplicate(item,items){return items.find(row=>item.originRef&&row.kind===item.kind&&row.originRef===item.originRef||fingerprint(row)===fingerprint(item))||null}
 function classify(body,subject=''){
  const raw=text(subject,200)+'\n'+text(body),lower=raw.toLowerCase(),deposit=/\bdeposit\b/.test(lower);
  let category=deposit?'Deposit report':/\b(prepare|please|assign(?:ed|ment)?|asked|need you|instruction)\b/.test(lower)?'Staff instruction':/\b(maintenance|repair|tenant|property|notice|lease)\b/.test(lower)?'Property request':/\b(follow.?up|remind|reminder)\b/.test(lower)?'Follow-up':'Other';
  const urgent=/\b(urgent|asap|immediately)\b/.test(lower)&&! /\b(not urgent|no urgency|not immediately)\b/.test(lower);
  const amounts=[...new Set([...raw.matchAll(/(?:\$|\bUSD\s*)(\d[\d,]*(?:\.\d+)?)(?!\d)/gi)].map(m=>R.moneyCents(m[1])).filter(v=>v!==null&&v>0))];
  let stage=null;const signals=[];
  if(deposit){
   if(/\b(failed|disputed|reversed|chargeback)\b/.test(lower))signals.push('failed_disputed');
   if(/\b(pending|awaiting|not received|not cleared|hasn.t cleared|unconfirmed)\b/.test(lower))signals.push('pending_confirmation');
   if(/\bsubmitted\b/.test(lower))signals.push('reported_submitted');
   if(/\b(received|credited|cleared|deposited)\b/.test(lower.replace(/\b(not received|not cleared|hasn.t cleared)\b/g,'')))signals.push('reported_received');
   stage=signals.length===1?signals[0]:'manual_reconciliation';
  }
  const owner=raw.match(/^\s*(?:owner|assigned to)\s*:\s*(.+)$/im),deadline=raw.match(/\b(?:due|deadline|by)\s*:?\s*(\d{4}-\d\d-\d\d)\b/i);
  const due=deadline&&T.validDate(deadline[1])?deadline[1]:null;
  const action=raw.split(/\r?\n/).map(x=>x.trim()).find(x=>/\b(prepare|review|confirm|inspect|schedule|follow up|contact|file|check|send)\b/i.test(x))||null;
  return {category,urgency:urgent?'urgent':'normal',basis:category==='Other'?'No specific rule matched':'Text rule matched; staff review required',confidence:'Unverified manual source',depositStage:stage,amountCents:amounts.length===1?amounts[0]:null,multipleAmounts:amounts.length>1,claimedCredit:deposit&&/\b(credited|cleared|deposited)\b/.test(lower),fundsVerified:false,
   proposal:action?{title:text(subject,200)||text(action.replace(/^(?:subject|instruction)\s*:\s*/i,''),200),action:text(action,820),priority:urgent?'urgent':'normal',owner:owner?text(owner[1],120):null,due,missing:[!owner?'Owner not explicitly provided':null,!due?'Confirmed deadline not provided':null].filter(Boolean)}:null};
 }
 function review(item,input,data){
  if(!categories.includes(input.category)||!['urgent','high','normal','low'].includes(input.urgency))throw Error('Choose a category and suggested urgency.');
  const stage=input.category==='Deposit report'?input.depositStage:null;
  if(input.category==='Deposit report'&&(!stages.includes(stage)||stage==='verified_credited'))throw Error('Funds cannot be verified through pasted messages. Use an approved reconciliation source.');
  const propertyId=input.propertyId||null,taskId=input.taskId||null;
  if(propertyId&&!data.properties.some(p=>p.id===propertyId))throw Error('The selected property is no longer accessible.');
  if(taskId&&!data.tasks.some(t=>t.id===taskId&&!t.archived_at))throw Error('The selected task is no longer accessible.');
  if(propertyId&&taskId&&data.tasks.find(t=>t.id===taskId)?.property_id!==propertyId)throw Error('The task and property links do not match saved records.');
  const title=text(input.title,200),action=text(input.action,820);
  if(!title||!action||/[\r\n]/.test(title)||/[\r\n]/.test(action))throw Error('Enter a one-line title and action for this reviewed item.');
  if(input.due&&!T.validDate(input.due))throw Error('Choose a valid requested deadline, or leave it unknown.');
  if(input.amountCents!=null&&(!Number.isSafeInteger(input.amountCents)||input.amountCents<0))throw Error('Check the reported amount.');
  return {...item,propertyId,taskId,reviewRevision:(item.reviewRevision||0)+1,status:'reviewed',review:{category:input.category,urgency:input.urgency,depositStage:stage,title,action,owner:text(input.owner,120)||null,due:input.due||null,amountCents:Object.hasOwn(input,'amountCents')?input.amountCents:item.classification.amountCents,sourceVerified:false}};
 }
 function citation(item){return {id:item.id,code:item.code,label:item.code+' · '+(item.subject||item.review?.title||'Manual message'),kind:'manual_'+item.kind,subject:item.subject,originRef:item.originRef||null,sourceDate:item.sourceDate,receivedAt:item.receivedAt,sender:item.sender||null,body:item.body,reviewRevision:item.reviewRevision||0,verification:'Manually provided; not independently verified'}}
 function planRow(item){
  if(item.status!=='reviewed'||!item.review)throw Error('Review the item before accepting it for the plan.');
  const r=item.review,stage=r.depositStage;
  return {key:item.id,type:'planning',subject:r.title,action:r.category==='Deposit report'?'Report only — '+stageLabels[stage]+'. '+r.action:r.action,section:r.category==='Deposit report'?'Deposits and payments':r.category==='Staff instruction'?'Staff assignments':r.category==='Property request'?'Property operations':r.urgency==='urgent'?'Immediate priorities':'Additional work',source:citation(item),taskId:item.taskId||null};
 }
 function taskSection(task,day=T.today()){
  if(['waiting','blocked'].includes(task.status))return 'Pending and blocked';
  if(['overdue','today','urgent'].includes(F.lane(task,day)))return 'Immediate priorities';
  return ['properties','maintenance','notices','renewal','listings'].includes(task.workflow_key)?'Property operations':'Additional work';
 }
 function taskSource(task){return {id:'task:'+task.id,label:task.task_code||task.task_title,kind:'saved_task',taskId:task.id,version:task.updated_at||null,verification:'Saved task record; review its business facts'}}
 function planningOnly(plan){return (plan.rows||[]).filter(r=>r.type==='planning').length+(typeof plan.extras==='string'?plan.extras.split(/\r?\n/).filter(x=>x.trim()).length:0)+(Array.isArray(plan.constants)?plan.constants.length:0)}
 function taskMatches(proposal,tasks){const title=norm(proposal.title);return tasks.filter(t=>!t.archived_at&&(norm(t.task_title)===title||title.length>18&&norm(t.task_title).includes(title)||norm(t.task_title).length>18&&title.includes(norm(t.task_title))))}
 function deposits(items){return stages.map(stage=>({stage,label:stageLabels[stage],connected:stage!=='verified_credited',items:stage==='verified_credited'?[]:items.filter(i=>i.status!=='dismissed'&&(i.review?.category||i.classification.category)==='Deposit report'&&(i.review?.depositStage||i.classification.depositStage)===stage)}))}
 function taskExport(item,ref,day=T.today()){
  if(item.status!=='reviewed'||!item.review||item.taskId)throw Error('Only a reviewed, unlinked proposal can be prepared as a new task.');
  const r=item.review,sourceRef='S-'+ref,changes={task_title:r.title,status:'pending',priority:r.urgency,next_action:r.action};
  if(r.owner)changes.assigned_label=r.owner;
  if(r.due)changes.due={date:r.due,time:null,timezone:'America/New_York',original_text:'Staff-reviewed requested deadline '+r.due+' from '+item.code};
  return {schema_version:'oaktown.task-intake.v1',batch_ref:ref,work_date:day,timezone:'America/New_York',snapshot_ref:null,sources:[{source_ref:sourceRef,kind:'text',label:item.code+' · manual '+item.kind,occurred_at:item.receivedAt,evidence_excerpt:item.body}],proposals:[{proposal_ref:ref,operation:'create',match_reason:'Human-reviewed Morning Command Center proposal '+item.code,context:{workflow_key:item.propertyId?'properties':'general',property_id:item.propertyId,unit_id:null,context_label:item.propertyId?'Staff-selected saved property':'General operations'},changes,suggestions:{},source_refs:[sourceRef],needs_clarification:false}],activities:[],questions:[]};
 }
 function approval(plan,id,planId,reviewer){
  if(!plan?.text||!T.validDate(plan.workDate)||!reviewer||plan.stale?.length)throw Error('Generate and review a current SOD before approval.');
  const snapshot=JSON.parse(JSON.stringify(plan));delete snapshot.dirty;
  const metadata={schema_version:'oaktown.morning-plan.v1',plan_id:planId,revision:plan.revision,work_date:plan.workDate,plan:snapshot};
  const row={id,entity_type:'morning_plan',entity_id:planId,event_type:'morning_plan_approved_v1',summary:'Staff-approved morning plan for '+plan.workDate,event_metadata:metadata};
  if(JSON.stringify(row).length>90000)throw Error('This plan is too large for an approval record. Reduce the selected sources or wording.');
  return row;
 }
 function verified(expected,rows,reviewer){
  return Array.isArray(rows)&&rows.length===1&&rows[0]?.id===expected.id&&rows[0].actor_id===reviewer&&Number.isFinite(Date.parse(rows[0].occurred_at))&&['entity_type','entity_id','event_type','summary','event_metadata'].every(k=>canonical(rows[0][k])===canonical(expected[k]));
 }
 function attested(row){const p=row?.review_proof,m=row?.event_metadata;return !!p&&p.schema_version==='oaktown.sod-review.v1'&&p.channel==='native_staff_review'&&p.event_id===row.id&&p.request_id===m?.review_request_id&&m.approval_contract==='oaktown.sod-review.v1'&&p.reviewer_id===row.actor_id&&typeof p.request_id==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(p.request_id)&&/^[\da-f]{64}$/.test(p.content_hash)&&Number.isFinite(Date.parse(p.reviewed_at))}
 function conflicts(plan,tasks,day=T.today()){
  const out=[];if(plan.workDate!==day)out.push('The approved work date is not the current Eastern business date.');
  for(const row of plan.rows||[])if(row.type==='task'){
   const task=tasks.find(t=>t.id===row.id);
   if(!task||task.archived_at||!W.sameVersion(task.updated_at,row.updatedAt)||!windowlessActive(task))out.push((row.code||row.subject)+' changed or is no longer active.');
  }
  return out;
 }
 function windowlessActive(t){return !['completed','cancelled','canceled','closed','done','declined'].includes(String(t.status).toLowerCase())}
 return Object.freeze({categories,stages,stageLabels,sections,intake,classify,fingerprint,duplicate,review,citation,planRow,taskSection,taskSource,planningOnly,taskMatches,deposits,taskExport,approval,verified,attested,conflicts,canonical});
});
