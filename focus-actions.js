/* Confirmed Focus Board actions. OpsToday remains the only task snapshot owner. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,store=window.OpsToday,M=window.OpsFocusActionsModel,W=window.OpsReviewedWrite;
 const dialog=$('focus-action-dialog'),form=$('focus-action-form');if(!dialog||!M||!store||!W)return;
 const flow=W.create(),request=(action,session=null,payload={})=>W.withTimeout(signal=>cloud.api('/rest/v1/rpc/ops_task_intake',{method:'POST',signal,body:JSON.stringify({p_action:action,p_session:session,p_payload:payload})}));
 const refresh=()=>W.withTimeout(()=>store.refresh());
 let recentText='',epoch=0,preparing=false,inFlight=false,base=null,kind=null,planned=null,pending=null,recent=null,returnTo=null,stale=false,gesture=null,suppressClick=false;
 const account=()=>cloud.user?.id,selected=()=>window.OpsFocusBoard?.getSelected(),task=id=>store.getData()?.tasks.find(t=>t.id===id),allowed=()=>!!account()&&store.getState()==='ready'&&!!store.getData()?.canEdit;
 const live=ticket=>ticket===epoch&&!!account(),busy=()=>preparing||flow.busy||inFlight;
 const labels={status:'Status',completion_summary:'Completion summary',waiting_on:'Waiting on',blocked_reason:'Blocked reason',follow_up:'Follow-up'};
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
 const display=v=>v?.absent?'Not recorded':v&&typeof v==='object'?(v.date+(v.time?' at '+v.time:'')+' · Eastern'):String(v??'Not recorded');
 const message=(text,tone='neutral')=>{for(const id of ['focus-action-feedback','focus-detail-action-feedback']){$(id).textContent=text;$(id).dataset.tone=tone}};
 function controls(){
  const disabled=busy()||!!pending||!allowed()||!selected()||!!M.available(task(selected()));
  for(const id of ['focus-board-complete','focus-board-defer','focus-action-handle','focus-detail-complete','focus-detail-defer'])$(id).disabled=disabled;
  form.setAttribute('aria-busy',String(busy()));dialog.dataset.workflowState=flow.phase;
  for(const input of form.querySelectorAll('input,textarea'))input.disabled=busy()||stale;
  $('focus-action-confirm').disabled=busy()||stale||!planned||!flow.can('submit')||!allowed();
  $('focus-action-cancel').disabled=flow.busy||inFlight;
  $('focus-action-retry').hidden=!pending||flow.phase!=='needs_review';$('focus-action-retry').disabled=busy()||!account();
  $('focus-action-reload').hidden=!!pending||!stale;$('focus-action-reload').disabled=busy()||!account();
  for(const id of ['focus-resolve-action','focus-detail-resolve-action']){$(id).hidden=!pending;$(id).disabled=busy()||!account()}
  $('focus-action-zone').hidden=!account()||store.getState()!=='ready'||!selected();
  const permission=!store.getData()?.canEdit&&store.getState()==='ready';$('focus-action-permission').hidden=!permission;
  renderRecent();
 }
 function renderRecent(){
  const hidden=!recent||!account()||store.getState()==='error'||store.getState()==='ready'&&!store.getData()?.canEdit;
  for(const id of ['focus-recent','focus-detail-recent'])$(id).hidden=hidden;
  if(hidden){for(const id of ['focus-recent-message','focus-detail-recent-message','focus-undo-note','focus-detail-undo-note'])$(id).textContent='';return}
  const row=task(recent.id),changed=store.getState()==='ready'&&(!row||row.archived_at||!W.sameVersion(row.updated_at,recent.version));
  const expired=Date.now()>=recent.expiresAt;if(expired)recent.reverse=null;
  const disabled=busy()||!!pending||!allowed()||!recent.reverse||changed;
  for(const id of ['focus-undo','focus-detail-undo'])$(id).disabled=disabled;
  $('focus-recent-message').textContent=recentText;$('focus-detail-recent-message').textContent=recentText+' '+recent.code;
  const note=changed?'Undo unavailable: this task changed or became inaccessible. Use Review Task for recovery.':expired?'Undo unavailable: the two-minute window ended. Use Review Task for recovery.':!recent.reverse?'Undo unavailable: the previous values cannot be restored exactly by the existing API. Use Review Task.':'Undo is available for two minutes and checks the saved version again.';
  for(const id of ['focus-undo-note','focus-detail-undo-note'])$(id).textContent=note;
 }
 function diff(plan){
  const list=$('focus-action-changes');list.replaceChildren();if(!plan)return;
  for(const key of [...new Set([...Object.keys(plan.changes),...plan.clears])])list.append(node('dt',labels[key]||key),node('dd',display(plan.before[key])+' → '+(plan.clears.includes(key)?'Clear field':display(plan.changes[key]))));
 }
 function preview(){
  if(!base||busy()||stale||kind==='choose')return;
  try{planned=kind==='undo'?M.undo(base,recent):M.plan(base,kind,{summary:$('focus-completion-summary').value,date:$('focus-followup-date').value});diff(planned);$('focus-action-error').textContent='';}
  catch(error){planned=null;diff(null);$('focus-action-error').textContent=error.message;}
  $('focus-action-undo-warning').hidden=!planned||kind==='undo'||!!planned.reverse;
  controls();
 }
 function clearPrivate(){base=null;planned=null;form.reset();$('focus-action-task-title').textContent='Task action';$('focus-action-task-code').textContent='';$('focus-action-changes').replaceChildren();$('focus-action-dates').textContent='';$('focus-action-error').textContent='';$('focus-action-undo-warning').hidden=true;}
 function close(force=false){
  if(!force&&(flow.busy||inFlight))return;
  epoch++;preparing=false;flow.reset();if(dialog.open)dialog.close();
  // An uncertain request is retained unchanged for idempotent recovery, not resubmitted as a new action.
  if(!pending){clearPrivate();kind=null}
  controls();if(!force){if(returnTo?.isConnected&&returnTo.getClientRects().length)returnTo.focus({preventScroll:true});else window.OpsFocusBoard?.restoreFocus()}
 }
 function setContent(){
  $('focus-action-task-title').textContent=base?.task_title||'Task action';$('focus-action-task-code').textContent=base?(base.task_code||base.id)+' · '+base.id:'';
  $('focus-action-heading').textContent=kind==='choose'?'Choose a task action':kind==='complete'?'Confirm task completion':kind==='defer'?'Move the follow-up': 'Confirm Undo';
  $('focus-action-choices').hidden=kind!=='choose';$('focus-completion-field').hidden=kind!=='complete';$('focus-followup-field').hidden=kind!=='defer';
  $('focus-action-confirm').hidden=kind==='choose';$('focus-action-confirm').textContent=kind==='complete'?'Confirm completion':kind==='defer'?'Confirm follow-up':'Confirm Undo';
  $('focus-action-dates').textContent=base?'Current due date: '+(window.OpsFocusBoardModel.due(base)||'Not recorded')+' · Current follow-up: '+display(base.intake_details?.follow_up):'';
  $('focus-action-consequences').textContent=kind==='complete'?'Confirm only work that is actually finished. This sets status to completed and records a completion timestamp and your summary. Any fields cleared are shown below. Linked tasks, notices, messages and payments are not completed or sent.':kind==='defer'?'Deferring is not completing or canceling. Only follow-up changes; the real due date and business status stay unchanged. An overdue task can remain overdue. The follow-up is a date in Eastern time; any previous follow-up time is replaced.':kind==='undo'?'This reverses only the fields shown below, if the task still has the exact saved version. Audit history is retained. It cannot reverse notices, messages, payments or other external actions.':'Use the buttons to prepare an action. Nothing changes until you review and confirm.';
 }
 async function open(action,id=selected(),trigger=document.activeElement){
  if(busy()||pending||!account()||!id||window.OpsWorkspace.getRoute().workflow!=='focus')return;
  epoch++;const ticket=epoch;returnTo=trigger;kind=action;stale=false;preparing=true;flow.reset();flow.open();clearPrivate();setContent();
  if(!dialog.open)dialog.showModal();$('focus-action-error').textContent='Checking current task and editor access…';controls();$('focus-action-task-title').focus();
  try{
   await refresh();if(!live(ticket)||!dialog.open)return;preparing=false;
   if(!allowed())throw Error('Editor access or the shared task snapshot is unavailable. Refresh tasks or sign in again.');
   base=task(id);if(action!=='undo'){const problem=M.available(base);if(problem)throw Error(problem)}
   if(action==='undo')planned=M.undo(base,recent);
   setContent();$('focus-followup-date').min=window.OpsTodayModel.today();$('focus-followup-date').value=M.suggest(base);$('focus-completion-summary').value='';
   $('focus-action-error').textContent='';preview();controls();
   (action==='complete'?$('focus-completion-summary'):action==='defer'?$('focus-followup-date'):action==='choose'?$('focus-choose-complete'):$('focus-action-cancel')).focus({preventScroll:true});
  }catch(error){if(!live(ticket)||!dialog.open)return;preparing=false;stale=true;clearPrivate();setContent();$('focus-action-error').textContent=error.message;controls();$('focus-action-cancel').focus()}
 }
 async function execute(retry=false){
  if(inFlight||preparing||!account()||(retry&&!pending)||(!retry&&(!planned||!flow.can('submit'))))return;
  if(retry){const reload=flow.start('reload');if(!reload)return;flow.advance(reload,'loaded')}
  const ticket=flow.start('submit');if(!ticket)return;
  const started=++epoch,user=account(),plan=retry?pending.plan:planned;inFlight=true;stale=false;controls();
  $('focus-action-error').textContent=retry?'Checking the identical reviewed request…':'Rechecking permission and saved task version…';
  try{
   await refresh();if(!live(started)||account()!==user)return;
   if(!allowed())throw Error('Editor access is unavailable. No new action was submitted.');
   if(!retry&&(!task(plan.id)||task(plan.id).archived_at||!W.sameVersion(task(plan.id).updated_at,plan.version)))throw Error('Task changed since review. Refresh and review again; newer work was kept.');
   if(!retry&&plan.kind==='undo')M.undo(task(plan.id),recent);
   flow.advance(ticket,'approved');controls();$('focus-action-error').textContent='Saving the confirmed action…';
   if(!pending){
    const session=await request('new');if(!live(started)||account()!==user)return;
    if(!session?.session_id)throw Error('The task API did not return a session. No task action was submitted.');
    const reference='focus-'+crypto.randomUUID();pending={session:session.session_id,reference,plan,nextId:window.OpsFocusBoard?.getNext(plan.id),payload:M.payload(plan,session.session_id,reference)};
   }
   const receipt=await request('save',pending.session,pending.payload);if(!live(started)||account()!==user)return;
   flow.advance(ticket,'received');controls();$('focus-action-error').textContent='Verifying the saved task and refreshing shared views…';
   await refresh();if(!live(started)||account()!==user)return;
   const saved=task(plan.id);
   if(store.getState()==='ready'&&M.receipted(plan,receipt,pending.session,pending.reference)&&(!saved||saved.archived_at||!W.sameVersion(saved.updated_at,receipt.tasks[0].updated_at))){
    // The receipt proves the original save, but never authorizes overwriting a newer version.
    pending=null;recent=null;inFlight=false;flow.advance(ticket,'verified');close();message('The server recorded the action, but the task changed before readback. Undo is unavailable. Review the current saved task.','error');window.dispatchEvent(new Event('ops-today-refresh'));return;
   }
   if(store.getState()!=='ready'||!M.verified(plan,receipt,saved,pending.session,pending.reference))throw Error('The saved result could not be verified. Check the identical request before another action.');
   const reference=pending.reference,nextId=pending.nextId;pending=null;flow.advance(ticket,'verified');inFlight=false;
   recent=plan.kind==='undo'?null:M.recent(plan,saved,reference);
   const text=plan.kind==='complete'?'Task completed.':plan.kind==='defer'?'Follow-up moved to '+plan.changes.follow_up.date+'.':'Undo saved. The previous task fields were restored.';
   recentText=text;
   close();message(text,'success');
   window.dispatchEvent(new CustomEvent('ops-focus-action-saved',{detail:{id:plan.id,kind:plan.kind,nextId}}));
   // Connected search/profile owns its own existing cache; invalidate it through its established refresh event.
   window.dispatchEvent(new Event('ops-today-refresh'));controls();
  }catch(error){
   if(!live(started)||account()!==user)return;
   flow.advance(ticket,flow.phase==='checking'?'rejected':'failed');stale=true;
   const definite=[400,403,404,409,422].includes(error.status)&&!!error.code;
   if(definite)pending=null;
   if(!allowed()){clearPrivate();setContent();}
   $('focus-action-error').textContent=pending?'Outcome not verified. The server may have saved it. Retry the identical action to check safely; a new action is blocked.':(error.status===403?'Permission denied. Refresh access before reviewing another action.':error.message||'The action could not be saved. Refresh and review again.');
   message(pending?'A recent action needs verification. Use Check recent action before continuing.':'Action not saved or not verified. Review the saved version before retrying.','error');
  }finally{inFlight=false;if(live(started)&&account()===user){controls();if(flow.phase==='needs_review')($('focus-action-retry').hidden?$('focus-action-cancel'):$('focus-action-retry')).focus()}}
 }
 form.addEventListener('submit',event=>{event.preventDefault();execute()});
 $('focus-completion-summary').addEventListener('input',preview);$('focus-followup-date').addEventListener('input',preview);
 $('focus-action-cancel').onclick=()=>close();$('focus-action-retry').onclick=()=>execute(true);
 $('focus-action-reload').onclick=()=>{const id=base?.id||selected(),action=kind;close();open(action,id)};
 $('focus-resolve-action').onclick=async()=>{
  if(!pending||busy())return;
  const ticket=++epoch;returnTo=document.activeElement;kind=pending.plan.kind;stale=true;preparing=true;flow.reset();flow.open();flow.stale();clearPrivate();setContent();dialog.showModal();controls();
  $('focus-action-error').textContent='Checking access before showing the recent action…';
  try{
   await refresh();if(!live(ticket)||!pending||!dialog.open)return;
   if(!allowed()||!task(pending.plan.id))throw Error('The original task or access is unavailable. Use the full workspace to review recovery; the task action remains unverified.');
   base=pending.plan.after;planned=pending.plan;setContent();diff(planned);$('focus-action-error').textContent='Outcome not verified. Retry this identical reviewed request to check safely.';
  }catch(error){if(live(ticket))$('focus-action-error').textContent=error.message}
  finally{if(live(ticket)){preparing=false;controls();$('focus-action-retry').focus()}}
 };
 for(const id of ['focus-undo','focus-detail-undo'])$(id).onclick=()=>{if(recent)open('undo',recent.id)};
 $('focus-detail-resolve-action').onclick=()=>$('focus-resolve-action').onclick();
 for(const prefix of ['board','detail'])for(const action of ['complete','defer'])$('focus-'+prefix+'-'+action).onclick=()=>open(action);
 for(const action of ['complete','defer'])$('focus-choose-'+action).onclick=()=>{kind=action;setContent();preview();(action==='complete'?$('focus-completion-summary'):$('focus-followup-date')).focus()};
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;const list=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(n=>n.getClientRects().length),first=list[0],last=list.at(-1);
  if(!list.length){event.preventDefault();return}
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('focus-action-task-title'))){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 const handle=$('focus-action-handle');
 handle.onclick=event=>{if(suppressClick&&event.detail){suppressClick=false;return}suppressClick=false;open('choose')};
 handle.addEventListener('pointerdown',event=>{if(handle.disabled||!event.isPrimary||event.button!==0)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};suppressClick=false;handle.setPointerCapture(event.pointerId)});
 handle.addEventListener('pointermove',event=>{if(gesture?.id!==event.pointerId)return;const dx=event.clientX-gesture.x;handle.dataset.direction=Math.abs(dx)>15?(dx>0?'complete':'defer'):''});
 handle.addEventListener('pointerup',event=>{
  if(gesture?.id!==event.pointerId)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;delete handle.dataset.direction;
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  if(Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.4){
   suppressClick=true;const action=dx>0?'complete':'defer',id=selected(),ticket=epoch;
   // Let native touch dispatch settle before modal inertness disables its target.
   // Otherwise Chromium can consume the first tap inside the new modal. This is not an action threshold.
   setTimeout(()=>{if(ticket===epoch)open(action,id,handle)},event.pointerType==='touch'?100:0);
  }
 });
 handle.addEventListener('pointercancel',()=>{gesture=null;delete handle.dataset.direction});
 window.addEventListener('ops-auth-change',()=>{epoch++;preparing=false;flow.reset();base=null;planned=null;pending=null;recent=null;recentText='';kind=null;stale=false;gesture=null;clearPrivate();if(dialog.open)dialog.close();message('');$('focus-recent-message').textContent='';controls()});
 window.addEventListener('ops-today-state',()=>{
  if(dialog.open&&!busy()&&base&&!pending&&(store.getState()==='error'||store.getState()==='ready'&&(!allowed()||!task(base.id)||!W.sameVersion(task(base.id).updated_at,base.updated_at)))){
   stale=true;planned=null;flow.stale();clearPrivate();setContent();$('focus-action-error').textContent='The task or access changed. Close and review the saved version before confirming.';
  }
  controls();
 });
 window.addEventListener('ops-focus-selection',controls);
 window.addEventListener('ops-workspace-change',()=>{if(window.OpsWorkspace.getRoute().workflow!=='focus')close(true)});
 setInterval(renderRecent,1000);
 window.OpsFocusActions=Object.freeze({get busy(){return busy()}});controls();
})();
