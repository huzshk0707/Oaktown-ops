/* Oaktown Ops renewal tracking: append-only, staff-authenticated updates and notes.
   No PDF bytes, lease contract data, or tenant contacts are stored in this journal. */
(()=>{'use strict';
const cloud=window.OpsCloud,R=window.OpsRenewalTrackingRules,portfolio=window.OpsPortfolio,W=window.OpsReviewedWrite,$=id=>document.getElementById(id);
if(!cloud||!R||!portfolio||!W||!$('ops-renewals-detail'))return;
const host=document.createElement('section');host.id='ops-renewal-tracker';host.className='ops-tracker';
host.setAttribute('aria-label','Update selected renewal');
$('ops-renewals-detail').after(host);
const flow=W.create();
const request=(path,options={})=>W.withTimeout(signal=>cloud.api(path,{...options,signal}));
let events=[],caseId=null,loading=null,loadingEpoch=0,epoch=0,failed=false,reviewedEvent=null,owner=cloud.user?.id||null;
const matchesContext=(ticket,account,id)=>flow.current(ticket)&&cloud.user?.id===account&&caseId===id;
function controls(){
 host.dataset.workflowState=flow.phase;
 const form=$('tracker-form');if(!form)return;
 form.setAttribute('aria-busy',String(flow.busy));
 for(const field of form.querySelectorAll('input,select,textarea'))field.disabled=flow.busy;
 $('tracker-save').disabled=!flow.can('submit')||failed||!cloud.user;
 $('tracker-reload').hidden=!['needs_review','refreshing'].includes(flow.phase);
 $('tracker-reload').disabled=!flow.can('reload')||!cloud.user;
}
const latest=id=>R.latest(events,id);
const snapshot=id=>R.snapshot(latest(id));
const selected=()=>portfolio.getData()?.renewals?.find(r=>r.id===caseId)||null;
const el=(tag,content,klass)=>{const n=document.createElement(tag);if(content!=null)n.textContent=content;if(klass)n.className=klass;return n};
const node=(tag,attrs={},content)=>{
 const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='className')e.className=v;else if(k==='htmlFor')e.htmlFor=v;else if(k==='type'||k==='id'||k==='placeholder'||k==='maxLength'||k==='rows')e[k]=v;else e.setAttribute(k,v)}if(content!=null)e.textContent=content;return e;
};
function lineField(label,control){const wrap=node('label',{className:'tracker-field'},label);wrap.append(control);return wrap}
function say(message,isError=false){const p=$('tracker-feedback');if(p){p.textContent=message;p.classList.toggle('tracker-error',isError)}}
function fire(){window.dispatchEvent(new Event('ops-renewal-tracking-change'))}
function current(id){return snapshot(id)}
window.OpsRenewalTracking={currentFor:current,eventsFor:id=>R.eventsFor(events,id),get count(){return new Set(events.map(e=>e.entity_id)).size}};
function show(force=false){
 if(!force&&$('tracker-form')&&host.dataset.caseId===caseId&&selected()&&cloud.user){
  if(!flow.busy&&(failed||(latest(caseId)?.id||null)!==reviewedEvent)){
   flow.stale();say('Renewal history changed or could not be checked. Copy any unsaved text, then reload the saved history before saving.',true);
  }
  controls();return;
 }
 flow.reset();host.replaceChildren();host.dataset.caseId=caseId||'';controls();
 if(!cloud.user){host.append(el('p','Sign in to update renewal tracking.','ops-muted'));return}
 if(failed){host.append(el('p','Could not load renewal history. Check your connection and refresh.','tracker-error'))}
 const data=selected();
 if(!data){host.append(el('p','Select a renewal case above to update its status, enter a one-line update or add notes.','ops-muted'));return}
 const prior=snapshot(data.id);
 host.append(el('h3','Update renewal · '+(data.oak_record_id||'Selected case')));
 const hint=el('p','A confirmed update changes the active tracker status for this case. Imported Master records and signed leases are preserved.','ops-muted');host.append(hint);
 const form=node('form',{id:'tracker-form'});
 flow.open();if(failed)flow.stale();reviewedEvent=prior?.id||null;
 const latestStatus=prior?.status||'unreviewed';
 const message=node('textarea',{id:'tracker-message',rows:2,maxLength:500,placeholder:'e.g. Just sent the renewal lease to the tenant for signature'});
 form.append(lineField('One-line update (optional if editing status manually)',message));
 const suggestion=el('p','Type an update to see a suggested status. Review it before saving.','tracker-suggestion');suggestion.id='tracker-suggestion';form.append(suggestion);
 const statusSelect=node('select',{id:'tracker-status'});for(const [value,label] of R.statuses)statusSelect.add(new Option(label,value));statusSelect.value=latestStatus;
 form.append(lineField('Tracking status',statusSelect));
 const nextAction=node('input',{id:'tracker-next-action',type:'text',maxLength:500,placeholder:'e.g. Check signatures next week'});nextAction.value=prior?.nextAction||'';
 form.append(lineField('Next action (editable)',nextAction));
 const notes=node('textarea',{id:'tracker-note',rows:2,maxLength:2000,placeholder:'Optional additional notes about this update'});form.append(lineField('Additional notes (optional)',notes));
 const actions=node('div',{className:'tracker-actions'});
 const button=node('button',{id:'tracker-save',type:'submit',className:'button primary'},'Save confirmed update');
 const reloadButton=node('button',{id:'tracker-reload',type:'button',className:'button'},'Reload saved history');reloadButton.addEventListener('click',reloadReview);actions.append(button,reloadButton);
 const feedback=el('span','','status');feedback.id='tracker-feedback';feedback.setAttribute('role','status');actions.append(feedback);form.append(actions);
 message.addEventListener('input',()=>{
  const result=R.infer(message.value);
  if(result){
   statusSelect.value=result.status;
   nextAction.value=result.nextAction;
   suggestion.textContent='Suggested: '+R.label(result.status)+' — editable before saving.';
  }else{suggestion.textContent=message.value.trim()?'No confident status detected. Choose a status or save as a note.':'Type an update to see a suggested status.'}
 });
 form.addEventListener('submit',event=>{event.preventDefault();save({message:message.value,status:statusSelect.value,nextAction:nextAction.value,note:notes.value})});
 host.append(form);
 const history=el('div',null,'tracker-history');history.append(el('h4','Dated update history'));
 const entries=R.eventsFor(events,data.id);
 if(!entries.length)history.append(el('p','No updates recorded in Oaktown Ops yet. Imported Master details above remain unchanged.','ops-muted'));
 for(const event of entries.slice(0,50)){
  const s=R.snapshot(event);if(!s)continue;
  const item=el('div',null,'tracker-event');
  const when=event.occurred_at?new Date(event.occurred_at).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'Time not recorded';
  item.append(el('strong',R.label(s.status)+' · '+when));
  if(s.message)item.append(el('p',s.message));
  if(s.nextAction)item.append(el('p','Next: '+s.nextAction));
  if(s.note)item.append(el('p','Notes: '+s.note));
  history.append(item);
 }
 if(entries.length>50)history.append(el('p','Showing the latest 50 updates for this case.','ops-muted'));
 host.append(history);controls();
}
async function reload(){
 if(flow.busy)return;
 if(loading&&loadingEpoch===epoch)return loading;
 const ticket=++epoch;
 loadingEpoch=ticket;
 if(!cloud.user){events=[];caseId=null;failed=false;show();fire();return}
 loading=request('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,occurred_at,summary,event_metadata&entity_type=eq.renewal_case&event_type=eq.renewal_progress_updated&order=occurred_at.desc&limit=1000')
  .then(rows=>{if(ticket!==epoch||!cloud.user)return;if(!Array.isArray(rows))throw Error('Unexpected renewal history response');events=rows;failed=false;show();fire()})
  .catch(e=>{if(ticket!==epoch)return;failed=true;show();fire()})
  .finally(()=>{if(loadingEpoch===ticket)loading=null});
 return loading;
}
async function reloadReview(){
 if(!cloud.user||!selected())return;
 const id=caseId,account=cloud.user.id,ticket=flow.start('reload');if(!ticket)return;
 controls();say('Loading saved history. Your draft will be replaced after it is checked.');
 try{
  const rows=await request('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,occurred_at,summary,event_metadata&entity_type=eq.renewal_case&entity_id=eq.'+encodeURIComponent(id)+'&event_type=eq.renewal_progress_updated&order=occurred_at.desc&limit=1000');
  if(!matchesContext(ticket,account,id))return;
  if(!Array.isArray(rows))throw Error('History response was incomplete.');
  events=[...rows,...events.filter(event=>event.entity_id!==id)];failed=false;
  flow.advance(ticket,'loaded');show(true);fire();say('Saved history loaded. Review the latest status before saving.');
 }catch{
  if(!matchesContext(ticket,account,id))return;
  flow.advance(ticket,'failed');controls();say('Saved history unavailable. Keep a copy of your draft and reload before trying again.',true);
 }
}
async function save(values){
 const item=selected();if(!item||!cloud.user||!flow.can('submit')||failed)return;
 let payload;
 try{payload=R.eventPayload(item.id,cloud.user.id,values,reviewedEvent)}
 catch(error){say(error.message,true);return}
 const account=cloud.user.id,ticket=flow.start('submit');if(!ticket)return;
 controls();say('Checking latest updates…');
 try{
  const check=await request('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,occurred_at,event_metadata&entity_type=eq.renewal_case&entity_id=eq.'+encodeURIComponent(item.id)+'&event_type=eq.renewal_progress_updated&order=occurred_at.desc&limit=1');
  if(!matchesContext(ticket,account,item.id))return;
  if(!Array.isArray(check)||(check[0]?.id||null)!==reviewedEvent){
   flow.advance(ticket,'rejected');controls();say('Another update was saved to this case. Copy any unsaved text, then reload saved history and review before saving.',true);return;
  }
  flow.advance(ticket,'approved');controls();say('Saving reviewed renewal update…');
  const saved=await request('/rest/v1/ops_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!matchesContext(ticket,account,item.id))return;
  if(!Array.isArray(saved)||saved.length!==1||!saved[0]?.id)throw Error('Server receipt was incomplete.');
  flow.advance(ticket,'received');controls();say('Checking the saved renewal update…');
  const rows=await request('/rest/v1/ops_events?id=eq.'+encodeURIComponent(saved[0].id)+'&select=id,entity_type,entity_id,event_type,actor_id,occurred_at,summary,event_metadata&limit=1');
  if(!matchesContext(ticket,account,item.id))return;
  if(!R.verified(payload,saved[0],rows))throw Error('Saved history did not match the reviewed update.');
  flow.advance(ticket,'verified');events=[rows[0],...events.filter(event=>event.id!==rows[0].id)];
  failed=false;show(true);fire();say('Saved to renewal history and verified. PDF and original lease records were not changed.');
 }catch(error){
  if(!matchesContext(ticket,account,item.id))return;
  const checking=flow.phase==='checking';flow.advance(ticket,checking?'rejected':'failed');controls();
  say(checking?'History could not be checked. No update was sent. Reload saved history before retrying.':'Save not verified: '+error.message+' The update may already have saved. Copy any unsaved text, then reload saved history before trying again.',true);
 }
}
window.addEventListener('ops-renewal-case-selected',event=>{const id=event.detail?.id||null;const changed=id!==caseId;caseId=id;show(changed)});
window.addEventListener('ops-portfolio-loaded',()=>reload());
window.addEventListener('ops-auth-change',event=>{
 const next=event.detail?.user?.id||null;
 if(next!==owner||!next){epoch++;events=[];caseId=null;failed=false;show(true);fire()}
 owner=next;
});
show();
})();
