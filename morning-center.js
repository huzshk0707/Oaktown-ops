/* Desktop planning surface. OpsToday owns tasks; OpsSod owns the single daily plan. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,store=window.OpsToday,S=window.OpsSod,M=window.OpsMorningModel,T=window.OpsTodayModel,W=window.OpsReviewedWrite;
 const host=$('morning-workflow');if(!host||!M||!S)return;
 const sod=$('sod-morning'),sodHome=document.createComment('Existing SOD editor home');sod.before(sodHome);
 const draftBoundary=$('sod-draft-boundary'),draftBoundaryHome=draftBoundary.textContent;
 const search=$('operations-search-open'),searchHome=document.createComment('Existing search home');search.before(searchHome);
 const topbar=document.querySelector('.topbar'),flow=W.create(),review=$('morning-review-dialog'),approve=$('morning-approve-dialog'),start=$('morning-start-dialog');
 let knownSources=[],intakeDirty=false,executionId=null,active=false,items=[],epoch=0,reviewId=null,lastFocus=null,duplicateCandidate=null,pending=null,preview=null,historyTicket=0,transition=0,starting=false;
 const request=(path,options={})=>W.withTimeout(signal=>cloud.api(path,{...options,signal}));
 const data=()=>store.getData(),ready=()=>!!cloud.user&&store.getState()==='ready'&&!!data()?.canEdit;
 const current=(ticket,user)=>epoch===ticket&&cloud.user?.id===user;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
 const button=(label,fn,cls='button')=>{const n=node('button',label,cls);n.type='button';n.onclick=fn;return n};
 const byId=id=>items.find(item=>item.id===id);
 const feedback=text=>{$('morning-approval-feedback').textContent=text};
 const taskRows=()=>window.OpsFocusBoardModel.order(data()?.tasks||[],T.today());
 const approved=()=>S.getApproved(),plan=()=>S.getPlan();
 function approvedCurrent(){
  const saved=approved(),draft=plan(),p=saved?.event_metadata?.plan;
  return ready()&&!!p&&!!draft&&draft.planId===p.planId&&draft.revision===p.revision&&draft.text===p.text&&!draft.stale.length&&!M.conflicts(p,data().tasks).length;
 }
 for(const [id,label] of [['morning-command-exit','Full workspace'],['morning-command-refresh','Refresh information']]){const n=button(label,()=>id.endsWith('exit')?window.OpsWorkspace.navigate('today'):refresh());n.id=id;n.hidden=true;topbar.prepend(n)}
 const businessDate=node('time');businessDate.id='morning-command-date';businessDate.hidden=true;topbar.prepend(businessDate);
 $('morning-signin').onclick=()=>$('account-button').click();
 function facts(host,entries){host.replaceChildren();for(const [label,value]of entries)host.append(node('dt',label),node('dd',value||'Not recorded'))}
 function closeReview(){const id=reviewId,target=lastFocus;if(review.open)review.close();reviewId=null;$('morning-review-original').textContent='';$('morning-review-source').replaceChildren();$('morning-review-form').reset();$('morning-review-feedback').textContent='';requestAnimationFrame(()=>{if(!active||!ready())return;const next=id&&$('morning-incoming').querySelector('[data-source-id="'+CSS.escape(id)+'"] button');(next||target)?.isConnected&&(next||target).focus({preventScroll:true})})}
 function openReview(id){
  if(!ready()||flow.busy||document.querySelector('dialog[open]'))return;
  const item=byId(id);if(!item)return;reviewId=id;lastFocus=document.activeElement;
  const r=item.review||{},c=item.classification,p=c.proposal;
  $('morning-review-title').textContent=item.code+' · '+(item.subject||'Review incoming item');
  facts($('morning-review-source'),[['Source','Manual '+item.kind],['Sender',item.sender],['Source date',item.sourceDate],['Received timestamp',item.receivedAt],['Source reference',item.originRef],['Added to this session',item.addedAt],['Suggestion basis',c.basis],['Confidence',c.confidence]]);
  $('morning-review-original').textContent=item.body;
  const options=(id,values,blank)=>{const select=$(id);select.replaceChildren(new Option(blank,''));for(const [value,label]of values)select.add(new Option(label,value))};
  options('morning-review-category',M.categories.map(x=>[x,x]),'Choose a category');$('morning-review-category').value=r.category||c.category;
  options('morning-review-deposit',M.stages.filter(x=>x!=='verified_credited').map(x=>[x,M.stageLabels[x]]),'Not a deposit report');$('morning-review-deposit').value=r.depositStage||c.depositStage||'manual_reconciliation';
  $('morning-review-urgency').value=r.urgency||c.urgency;$('morning-review-subject').value=r.title||p?.title||item.subject||'Review '+item.code;
  $('morning-review-action').value=r.action||p?.action||(c.category==='Deposit report'?'Confirm the reported deposit with an approved financial source.':'Review the source and confirm the next action.');
  $('morning-review-owner').value=r.owner||p?.owner||'';$('morning-review-due').value=r.due||p?.due||'';
  const cents=r.amountCents??c.amountCents;$('morning-review-amount').value=cents==null?'':String(cents/100);
  options('morning-review-property',data().properties.map(p=>[p.id,p.street_address||p.id]),'No confirmed property match');$('morning-review-property').value=item.propertyId||'';
  options('morning-review-task',data().tasks.filter(t=>!t.archived_at).map(t=>[t.id,(t.task_code?t.task_code+' · ':'')+t.task_title]),'No linked saved task');$('morning-review-task').value=item.taskId||'';
  $('morning-review-confirm').checked=false;$('morning-review-feedback').textContent=c.multipleAmounts?'Multiple amounts were found. Confirm the reported amount; no ledger value is inferred.':'';
  review.showModal();$('morning-review-title').focus();
 }
 $('morning-review-close').onclick=closeReview;review.addEventListener('cancel',event=>{event.preventDefault();closeReview()});
 $('morning-review-dismiss').onclick=()=>{const item=byId(reviewId);if(item)item.status='dismissed';closeReview();render()};
 $('morning-review-form').onsubmit=event=>{
  event.preventDefault();if(!ready()||!$('morning-review-confirm').checked)return;
  const at=items.findIndex(i=>i.id===reviewId);if(at<0)return;
  try{
   const raw=$('morning-review-amount').value.trim(),amount=raw?window.OpsRenewalRules.moneyCents(raw):null;
   if(raw&&(amount==null||amount<0))throw Error('Enter a valid reported amount or leave it unknown.');
   items[at]=M.review(items[at],{category:$('morning-review-category').value,urgency:$('morning-review-urgency').value,depositStage:$('morning-review-deposit').value,title:$('morning-review-subject').value,action:$('morning-review-action').value,owner:$('morning-review-owner').value,due:$('morning-review-due').value,propertyId:$('morning-review-property').value,taskId:$('morning-review-task').value,amountCents:amount},data());
   closeReview();render();
  }catch(error){$('morning-review-feedback').textContent=error.message}
 };
 $('morning-intake-form').addEventListener('input',()=>{intakeDirty=true});
 function appendIntake(item){intakeDirty=false;items.push(item);duplicateCandidate=null;$('morning-duplicate').hidden=true;$('morning-intake-form').reset();$('morning-source-date').value=T.today();$('morning-intake-feedback').textContent=item.code+' added as an unverified manual source. Review before including it in the plan.';$('morning-intake').open=false;render()}
 $('morning-intake-form').onsubmit=event=>{
  event.preventDefault();if(!ready()||flow.busy)return;
  try{
   if(items.length>=60)throw Error('This session already contains 60 sources. Finish review before adding more.');
   const item=M.intake({kind:$('morning-source-kind').value,sourceDate:$('morning-source-date').value,receivedAt:$('morning-source-time').value,sender:$('morning-source-sender').value,subject:$('morning-source-subject').value,originRef:$('morning-source-ref').value,body:$('morning-source-body').value},crypto.randomUUID(),'IN-'+String(items.length+1).padStart(3,'0'));
   const found=M.duplicate(item,items)||M.duplicate(item,knownSources);
   if(found){duplicateCandidate={item,found};$('morning-duplicate').hidden=false;$('morning-duplicate-text').textContent='Possible duplicate of '+found.code+'. Review the existing source before adding another report.';$('morning-keep-duplicate').hidden=!!item.originRef&&item.originRef===found.originRef;return}
   appendIntake(item);
  }catch(error){$('morning-intake-feedback').textContent=error.message}
 };
 $('morning-review-duplicate').onclick=()=>{
  if(!duplicateCandidate)return;
  if(!duplicateCandidate.found.saved){openReview(duplicateCandidate.found.id);return}
  $('morning-intake-feedback').textContent='This source is already referenced by a saved approved plan. Load that plan from Saved plans to review its source evidence. No duplicate was added.';
  const panel=$('morning-history').closest('details');panel.open=true;panel.scrollIntoView({block:'nearest'});
 };
 $('morning-keep-duplicate').onclick=()=>{if(duplicateCandidate&&ready()&&!$('morning-keep-duplicate').hidden)appendIntake({...duplicateCandidate.item,duplicateOf:duplicateCandidate.found.id})};
 function accept(item){
  try{
   if(item.taskId){if(!S.addSavedTask(item.taskId,M.planRow(item)))throw Error('This saved task is already selected or unavailable.');}
   else if(!S.addReviewed(M.planRow(item)))throw Error('This item is already in the SOD. Edit or remove it in the existing SOD editor.');
   $('morning-intake-feedback').textContent=item.code+' added to the SOD draft. No task was created.';
  }catch(error){$('morning-intake-feedback').textContent=error.message}
 }
 async function prepareTask(item){
  if(!ready()||flow.busy||item.createdTaskId)return;
  const user=cloud.user.id,ticket=epoch;
  await store.refresh();if(!current(ticket,user)||!ready())return;
  if(M.taskMatches(item.review,data().tasks).length){$('morning-intake-feedback').textContent='A matching saved task exists. Review and link it instead of creating another task.';return}
  try{
   const ref=item.handoffRef||('morning-'+crypto.randomUUID());item.handoffRef=ref;
   const payload=M.taskExport(item,ref);
   if(!window.OpsTaskIntakeUI?.prepare(payload))throw Error('Task Intake could not accept the proposal. Finish its current draft and retry.');
  }catch(error){$('morning-intake-feedback').textContent=error.message}
 }
 function renderSources(){
  $('morning-incoming-count').textContent=items.length+' items';const list=$('morning-incoming');list.replaceChildren();
  if(!items.length)list.append(node('p','No incoming information in this session. Add an authorized email or message to begin.','morning-muted'));
  for(const item of items){
   const c=item.review||item.classification,row=node('article',null,'morning-source-card');row.dataset.status=item.status;row.dataset.sourceId=item.id;
   row.append(node('span',item.code+' · '+item.status,'morning-badge'),node('h3',item.subject||item.review?.title||'Manual '+item.kind),node('p',(item.sender||'Sender not recorded')+' · '+item.sourceDate,'morning-source-meta'),node('p',c.category+' · '+(c.urgency||'normal')+' suggestion','morning-source-meta'));
   if(item.taskId)row.append(node('p','Staff-linked saved task · '+item.taskId,'morning-source-meta'));
   row.append(button('Review '+item.code,()=>openReview(item.id)));list.append(row);
  }
  const deposits=$('morning-deposits');deposits.replaceChildren();
  for(const bucket of M.deposits(items)){const row=node('div',null,'morning-deposit-row');row.dataset.stage=bucket.stage;row.append(node('span',bucket.label),node('strong',bucket.connected?String(bucket.items.length):'Not connected'));deposits.append(row);for(const item of bucket.items){const c=item.review||item.classification,prop=data().properties.find(p=>p.id===item.propertyId),entry=node('p',item.code+' · '+(c.amountCents==null?'Amount unknown':window.OpsRenewalRules.formatCents(c.amountCents)+' reported')+' · '+item.sourceDate+' · '+(prop?.street_address||'Property not confirmed')+' · Unverified report','morning-source-meta');deposits.append(entry)}}
  const proposals=$('morning-proposals');proposals.replaceChildren();const reviewed=items.filter(i=>i.status==='reviewed');
  if(!reviewed.length)proposals.append(node('p','Reviewed instructions and reports will appear here.','morning-muted'));
  const selected=new Set(plan()?.rows.map(r=>r.id)||[]);
  for(const item of reviewed){
   const r=item.review,row=node('article',null,'morning-source-card'),matches=M.taskMatches(r,data().tasks);
   row.append(node('span',item.code+' · '+(item.createdTaskId?'Saved task created':item.taskId?'Linked saved task':'Planning proposal'),'morning-badge'),node('h3',r.title),node('p',(r.owner?'Suggested owner: '+r.owner:'Owner unknown')+' · '+(r.due?'Requested deadline: '+r.due:'Deadline unknown'),'morning-source-meta'));
   const add=button(selected.has(item.id)?'Already in SOD':'Accept for SOD draft',()=>accept(item));add.disabled=selected.has(item.id);row.append(add);
   if(matches.length&&!item.taskId){row.append(node('p','Possible saved-task match: '+matches.slice(0,3).map(t=>t.task_code||t.task_title).join(', ')+'. Review and link the correct task.','morning-muted'))}
   else if(!item.taskId&&!item.createdTaskId)row.append(button('Open Task Intake review',()=>prepareTask(item)));
   if(item.createdTaskId)row.append(button('Review saved task',()=>window.OpsOperations.openSource('task',item.createdTaskId)));
   proposals.append(row);
  }
 }
 function renderTasks(){
  const all=taskRows(),list=$('morning-priority-work');list.replaceChildren();
  if(!all.length)list.append(node('p','No active tasks. You can review incoming information and plan manual work.','morning-muted'));
  const selected=new Set(plan()?.rows.filter(r=>r.type==='task').map(r=>r.id)||[]);
  for(const task of all.slice(0,6)){
   const row=node('div',null,'morning-priority-row'),text=node('div');text.append(node('strong',(task.task_code?task.task_code+' · ':'')+task.task_title),node('span',window.OpsFocusBoardModel.appearance(task).label+' · '+task.status+' · '+(task.assigned_label||'Owner unknown')));
   const add=button(selected.has(task.id)?'Selected':'Add to SOD',()=>{try{S.addSavedTask(task.id)}catch(error){feedback(error.message)}});add.disabled=selected.has(task.id);row.append(text,add);list.append(row);
  }
  if(all.length>6)list.append(node('p','Showing the first 6 of '+all.length+' active tasks. The SOD selector and Focus Board include all active work.','morning-muted'));
  const assignments=$('morning-assignments'),owners=new Map();assignments.replaceChildren();for(const task of all){const label=task.assigned_label||task.assigned_user_id||'Unassigned';owners.set(label,(owners.get(label)||0)+1)}
  for(const [name,count]of owners){const row=node('div',null,'morning-readiness-row');row.append(node('span',name),node('strong',count));assignments.append(row)}
 }
 function renderReadiness(){
  const p=plan(),record=approved(),saved=record?.event_metadata?.plan,all=taskRows(),list=$('morning-readiness');list.replaceChildren();
  const counts=[['Incoming items awaiting review',items.filter(i=>i.status==='unreviewed').length],['Deposit reports needing verification',items.filter(i=>i.status!=='dismissed'&&(i.review?.category||i.classification.category)==='Deposit report').length],['Active tasks with missing owner or date',all.filter(t=>!t.assigned_label&&!t.assigned_user_id||!T.scheduled(t)).length],['Waiting / blocked saved tasks',all.filter(t=>['waiting','blocked'].includes(t.status)).length],['Plan source conflicts',p?.stale.length||0]];
  for(const [label,value]of counts){const row=node('div',null,'morning-readiness-row');row.append(node('span',label),node('strong',value));list.append(row)}
  const ok=approvedCurrent();$('morning-plan-version').textContent=ok?'Approved · revision '+p.revision:'Draft · revision '+(p?.revision||0);
  list.append(node('p',ok?'Approved SOD is current and ready for the execution confirmation.':record?'An approved version is preserved. Review the changed draft or saved task sources before execution.':'No approved daily plan yet. Generate the SOD, review its sources, then approve explicitly.','morning-muted'));
  $('morning-approve-open').disabled=flow.busy||!!pending||!ready()||!p?.text||!!p.stale.length||ok;
  $('morning-start-open').disabled=flow.busy||!!pending||!ok||starting;
  $('morning-check-approval').hidden=!pending;$('morning-check-approval').disabled=flow.busy||!ready();
  $('morning-export-approved').disabled=!record;
  $('morning-approved-meta').textContent=record?'Saved revision '+saved.revision+' · reviewer '+record.actor_id+' · '+record.occurred_at:'No saved approval selected.';
  $('morning-approved-text').textContent=saved?.text||'';
  const sourceList=$('morning-approved-sources');sourceList.replaceChildren();
  for(const source of Object.values(saved?.sources||{})){
   const detail=node('details');detail.append(node('summary',source.label),node('p',source.kind==='saved_task'?'Saved task reference · '+source.taskId+' · version '+source.version:'Manually provided source · '+(source.originRef||'No external message ID')+' · '+source.sourceDate,'morning-source-meta'));
   if(source.manualReference)detail.append(node('p','Manual instruction reference · '+(source.manualReference.originRef||source.manualReference.code||source.manualReference.id)+' · '+source.manualReference.sourceDate,'morning-source-meta'));
   if(source.body)detail.append(node('pre',source.body,'morning-original'));
   sourceList.append(detail);
  }
 }
 function render(){
  if(!active){renderFocusPlan();return}
  const phase=store.getState(),access=ready();businessDate.textContent='EASTERN · '+T.today();businessDate.dateTime=T.today();
  $('morning-grid').hidden=!access;$('morning-signin').hidden=!!cloud.user;
  $('morning-command-refresh').disabled=!cloud.user||phase==='loading'||flow.busy;
  $('morning-source-status').textContent=access?'Shared task snapshot ready':!cloud.user?'Staff sign-in required':phase==='loading'?'Refreshing shared records':'Access / data unavailable';
  $('morning-state').textContent=access?'':!cloud.user?'Sign in with your Oaktown staff account. No private planning information is shown.':phase==='loading'?'Refreshing shared tasks. Existing planning input is kept.':phase==='error'?'Planning data could not be loaded. Your draft has not been replaced. Refresh information to retry.':'Editor access is required. Restore staff permissions before planning or approving.';
  if(!access){if(phase==='error'){$('morning-approve-preview').textContent='';if(review.open)closeReview()}return}
  renderSources();renderTasks();renderReadiness();
 }
 function renderFocusPlan(){
  const on=window.OpsWorkspace.getRoute().workflow==='focus',record=approved(),p=record?.event_metadata?.plan,ok=on&&ready()&&p&&p.workDate===T.today()&&(executionId===record.id||!M.conflicts(p,data().tasks).length);
  $('focus-morning-plan').hidden=!ok;if(!ok)return;
  const real=p.rows.filter(r=>r.type==='task').length,manual=M.planningOnly(p);
  $('focus-morning-summary').textContent='Approved morning SOD · '+real+' saved tasks · '+manual+' planning-only items. Task order is unchanged.';
 }
 async function refresh(){if(!cloud.user||flow.busy)return;await store.refresh();if(active&&ready()){S.beginMorning();render();await historyRefresh()}}
 async function historyRefresh(){
  if(!ready())return;const user=cloud.user.id,ticket=++historyTicket,at=epoch;
  $('morning-history-status').textContent='Reading saved approvals…';
  try{
   const rows=await request('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,actor_id,occurred_at,summary,event_metadata&event_type=eq.morning_plan_approved_v1&actor_id=eq.'+encodeURIComponent(user)+'&event_metadata->>work_date=eq.'+T.today()+'&order=occurred_at.desc&limit=10');
   if(!current(at,user)||ticket!==historyTicket)return;
   if(!Array.isArray(rows))throw Error('Unexpected journal response');
   const list=$('morning-history');list.replaceChildren();let count=0;knownSources=[];
   for(const row of rows)if(row.actor_id===user&&row.event_metadata?.schema_version==='oaktown.morning-plan.v1'&&row.event_metadata.work_date===T.today()){
    for(const source of Object.values(row.event_metadata.plan?.sources||{})){const manual=source.manualReference?{...source,...source.manualReference}:source;if(manual.kind?.startsWith('manual_'))knownSources.push({...manual,kind:manual.kind.slice(7),saved:true})}
    count++;list.append(button('Load revision '+row.event_metadata.revision+' · '+row.occurred_at,()=>{try{if(S.restore(row))feedback('Saved approved plan loaded without changing tasks.')}catch{feedback('This saved plan format needs review before it can be restored.')}}));
   }
   $('morning-history-status').textContent=count?count+' recent approvals for your account and this Eastern date.':'No saved approvals for your account and this Eastern date.';
  }catch{if(current(at,user)&&ticket===historyTicket)$('morning-history-status').textContent='Saved plan history is unavailable. The current draft and approved version are kept.'}
 }
 $('morning-history-refresh').onclick=historyRefresh;
 const readApproval=id=>request('/rest/v1/ops_events?id=eq.'+encodeURIComponent(id)+'&select=id,entity_type,entity_id,event_type,actor_id,occurred_at,summary,event_metadata&limit=1');
 function showApprove(){
  if(!ready()||flow.busy||pending||document.querySelector('dialog[open]'))return;
  const p=plan();if(!p?.text||p.stale.length)return;
  const conflicts=M.conflicts(p,data().tasks);if(conflicts.length){feedback(conflicts.join(' '));return}
  preview=p;flow.reset();flow.open();lastFocus=document.activeElement;$('morning-approve-preview').textContent=p.text;$('morning-approve-confirm').checked=false;
  $('morning-approve-scope').textContent='Revision '+p.revision+' · '+p.workDate+' Eastern · '+p.rows.filter(r=>r.type==='task').length+' saved tasks · '+M.planningOnly(p)+' planning-only items. '+items.filter(i=>i.status==='unreviewed').length+' unreviewed incoming items remain outside this approved plan.';
  $('morning-approve-status').textContent='Review the exact text and source citations. Nothing is saved until confirmation.';approvalControls();approve.showModal();$('morning-approve-title').focus();
 }
 function approvalControls(){
  const busy=flow.busy;$('morning-approve-save').disabled=busy||!ready()||!$('morning-approve-confirm').checked;
  $('morning-approve-cancel').disabled=busy;$('morning-approve-confirm').disabled=busy;approve.setAttribute('aria-busy',String(busy));
 }
 function closeApprove(){if(flow.busy)return;if(approve.open)approve.close();preview=null;flow.reset();if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});render()}
 $('morning-approve-open').onclick=showApprove;$('morning-approve-cancel').onclick=closeApprove;$('morning-approve-confirm').onchange=approvalControls;
 approve.addEventListener('cancel',e=>{e.preventDefault();closeApprove()});
 $('morning-approve-form').onsubmit=async event=>{
  event.preventDefault();if(flow.busy||!ready()||!preview||!$('morning-approve-confirm').checked)return;
  if(flow.phase==='needs_review'){const reload=flow.start('reload');flow.advance(reload,'loaded')}
  const ticket=flow.start('submit');if(!ticket)return;
  const user=cloud.user.id,at=++epoch,original=preview;S.setLocked(true);approvalControls();$('morning-approve-status').textContent='Checking the shared task versions and current editor access…';
  try{
   await W.withTimeout(()=>store.refresh());if(!current(at,user))return;
   if(!ready())throw Error('Editor access or shared records are unavailable.');
   const conflicts=M.conflicts(original,data().tasks);if(conflicts.length)throw Error(conflicts.join(' '));
   if(!pending&&(plan()?.revision!==original.revision||plan()?.text!==original.text))throw Error('The SOD changed since review. Generate and review it again.');
   flow.advance(ticket,'approved');pending=pending||{row:M.approval(original,crypto.randomUUID(),original.planId,user),user};approvalControls();
   $('morning-approve-status').textContent='Saving the confirmed plan to the staff journal…';
   try{await request('/rest/v1/ops_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(pending.row)})}catch(error){if(!(error.status===409&&error.code==='23505'))throw error}
   if(!current(at,user))return;flow.advance(ticket,'received');approvalControls();
   const rows=await readApproval(pending.row.id);if(!current(at,user))return;
   if(!M.verified(pending.row,rows,user))throw Error('The saved approval could not be independently verified.');
   flow.advance(ticket,'verified');pending=null;S.setApproved(rows[0]);preview=null;approve.close();S.setLocked(false);
   feedback('Approved SOD saved and verified in the staff journal. No tasks or deposits changed.');render();historyRefresh();
  }catch(error){
   if(!current(at,user))return;flow.advance(ticket,flow.phase==='checking'?'rejected':'failed');
   if([400,403,404].includes(error.status)&&error.code)pending=null;
   $('morning-approve-status').textContent=pending?'Approval outcome is unverified. The journal may have saved it. Check the saved approval before another save.':error.message||'Approval not saved. Review the current records and retry.';
   feedback(pending?'Approval needs verification. Use Check saved approval; a new approval is blocked.':'Approval was not saved or verified. Review current access and source conflicts.');
  }finally{if(current(at,user)){S.setLocked(false);approvalControls();render()}}
 };
 $('morning-check-approval').onclick=async()=>{
  if(!pending||!ready()||flow.busy)return;const user=cloud.user.id,at=epoch,expected=pending.row;
  try{
   const rows=await readApproval(expected.id);if(!current(at,user)||!pending)return;
   if(M.verified(expected,rows,user)){S.setApproved(rows[0]);pending=null;feedback('Saved approval verified. The original request was not duplicated.');render();return}
   if(rows.length)throw Error('The saved event differs from the reviewed plan. Review the journal before proceeding.');
   preview=expected.event_metadata.plan;flow.reset();flow.open();$('morning-approve-preview').textContent=preview.text;$('morning-approve-confirm').checked=false;$('morning-approve-status').textContent='No event is visible yet. Review and confirm to retry the identical approval ID; duplicate inserts cannot overwrite a saved event.';
   approvalControls();approve.showModal();$('morning-approve-title').focus();
  }catch(error){if(current(at,user))feedback('Approval remains unverified: '+error.message)}
 };
 $('morning-start-open').onclick=()=>{
  if(!approvedCurrent()||flow.busy||pending)return;const p=approved().event_metadata.plan;
  $('morning-start-summary').textContent='Use approved SOD revision '+p.revision+' for '+p.workDate+' Eastern. '+M.planningOnly(p)+' items remain planning-only and are not saved tasks.';
  $('morning-start-status').textContent='';lastFocus=document.activeElement;start.showModal();$('morning-start-title').focus();
 };
 function closeStart(){transition++;starting=false;if(start.open)start.close();$('morning-start-confirm').disabled=false;render();lastFocus?.focus({preventScroll:true})}
 $('morning-start-cancel').onclick=closeStart;start.addEventListener('cancel',event=>{event.preventDefault();closeStart()});
 $('morning-start-confirm').onclick=async()=>{
  if(starting||!start.open||!approvedCurrent())return;const user=cloud.user.id,ticket=++transition;starting=true;$('morning-start-confirm').disabled=true;$('morning-start-status').textContent='Checking the approved plan against current saved tasks…';
  await store.refresh();if(ticket!==transition||cloud.user?.id!==user||!start.open)return;
  starting=false;$('morning-start-confirm').disabled=false;
  if(!approvedCurrent()){$('morning-start-status').textContent='The plan or its saved sources changed. Return to morning review before execution.';render();return}
  executionId=approved().id;start.close();window.OpsWorkspace.navigate('focus');renderFocusPlan();
 };
 $('morning-export-approved').onclick=()=>{
  const record=approved();if(!record||!ready())return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),link=node('a');link.href=url;link.download='Oaktown-approved-SOD-'+record.event_metadata.work_date+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 };
 function route(){
  const next=window.OpsWorkspace.getRoute().workflow,on=next==='morning';
  if(!on){if(active){transition++;starting=false;if(start.open)start.close();if(review.open)closeReview();if(approve.open)approve.close();active=false;document.body.classList.remove('morning-mode');draftBoundary.textContent=draftBoundaryHome;sodHome.after(sod);if(next!=='focus')searchHome.after(search);for(const id of ['morning-command-date','morning-command-refresh','morning-command-exit'])$(id).hidden=true}renderFocusPlan();return}
  if(active){render();return}active=true;document.body.classList.add('morning-mode');$('morning-sod-host').append(sod);sod.open=true;topbar.insertBefore(search,$('workspace-appearance-open'));
  draftBoundary.textContent='Draft edits stay in this session. Review & approve SOD saves a reviewed version and its selected source evidence in the staff journal. Planning does not create tasks, change saved priorities, or send email.';
  for(const id of ['morning-command-date','morning-command-refresh','morning-command-exit'])$(id).hidden=false;
  if(!$('morning-source-date').value)$('morning-source-date').value=T.today();
  if(ready())S.beginMorning();render();if(cloud.user)refresh();$('morning-heading').focus({preventScroll:true});
 }
 for(const dialog of [review,approve,start])dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;const list=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(n=>n.getClientRects().length),first=list[0],last=list.at(-1);
  if(!list.length){event.preventDefault();return}if(event.shiftKey&&(document.activeElement===first||document.activeElement.tabIndex===-1)){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 window.addEventListener('ops-sod-change',render);
 window.addEventListener('ops-today-state',()=>{if(active&&ready())S.beginMorning();render()});
 window.addEventListener('ops-workspace-change',route);
 window.addEventListener('ops-auth-change',()=>{
  epoch++;historyTicket++;transition++;intakeDirty=false;executionId=null;knownSources=[];items=[];duplicateCandidate=null;pending=null;preview=null;flow.reset();reviewId=null;starting=false;
  for(const dialog of [review,approve,start])if(dialog.open)dialog.close();
  for(const id of ['morning-review-original','morning-review-source','morning-approve-preview','morning-approved-text','morning-approved-sources','morning-approved-meta','morning-incoming','morning-proposals','morning-history','morning-priority-work','morning-assignments','morning-readiness','morning-deposits','morning-approve-scope','morning-start-summary'])$(id).replaceChildren();
  for(const id of ['morning-review-property','morning-review-task'])$(id).replaceChildren();
  $('morning-intake-form').reset();$('morning-review-form').reset();$('morning-source-date').value=T.today();$('morning-duplicate').hidden=true;$('morning-intake-feedback').textContent='';feedback('');render();if(active&&cloud.user)refresh();
 });
 window.addEventListener('ops-task-intake-saved',event=>{for(const p of event.detail?.proposals||[]){const item=items.find(i=>i.handoffRef===p.proposal_ref);if(item){item.createdTaskId=p.task_id;item.taskId=p.task_id}}render()});
 $('focus-morning-review').onclick=()=>window.OpsWorkspace.navigate('morning');
 window.OpsMorning=Object.freeze({approvedTaskIds(){const p=approved()?.event_metadata?.plan;return ready()&&p&&p.workDate===T.today()&&(executionId===approved().id||!M.conflicts(p,data().tasks).length)?p.rows.filter(r=>r.type==='task'&&data().tasks.some(t=>t.id===r.id&&window.OpsSodModel.eligible(t))).map(r=>r.id):[]}});
 window.addEventListener('beforeunload',event=>{if(cloud.user&&(items.length||pending||intakeDirty)){event.preventDefault();event.returnValue=''}});
 setInterval(()=>{if(active&&!document.hidden)render()},60000);
 route();
})();
