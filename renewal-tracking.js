/* Oaktown Ops renewal tracking: append-only, staff-authenticated updates and notes.
   No PDF bytes, lease contract data, or tenant contacts are stored in this journal. */
(()=>{'use strict';
const cloud=window.OpsCloud,R=window.OpsRenewalTrackingRules,portfolio=window.OpsPortfolio,$=id=>document.getElementById(id);
if(!cloud||!R||!portfolio||!$('ops-renewals-detail'))return;
const host=document.createElement('section');host.id='ops-renewal-tracker';host.className='ops-tracker';
host.setAttribute('aria-label','Update selected renewal');
$('ops-renewals-detail').after(host);
let events=[],caseId=null,loading=null,loadingEpoch=0,epoch=0,failed=false,posting=false;
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
function show(){
 host.replaceChildren();
 if(!cloud.user){host.append(el('p','Sign in to update renewal tracking.','ops-muted'));return}
 if(failed){host.append(el('p','Could not load renewal history. Check your connection and refresh.','tracker-error'))}
 const data=selected();
 if(!data){host.append(el('p','Select a renewal case above to update its status, enter a one-line update or add notes.','ops-muted'));return}
 const prior=snapshot(data.id);
 host.append(el('h3','Update renewal · '+(data.oak_record_id||'Selected case')));
 const hint=el('p','A confirmed update changes the active tracker status for this case. Imported Master records and signed leases are preserved.','ops-muted');host.append(hint);
 const form=node('form',{id:'tracker-form'});
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
 const button=node('button',{id:'tracker-save',type:'submit',className:'button primary'},'Save confirmed update');actions.append(button);
 const feedback=el('span','','status');feedback.id='tracker-feedback';feedback.setAttribute('role','status');actions.append(feedback);form.append(actions);
 message.addEventListener('input',()=>{
  const result=R.infer(message.value);
  if(result){
   statusSelect.value=result.status;
   nextAction.value=result.nextAction;
   suggestion.textContent='Suggested: '+R.label(result.status)+' — editable before saving.';
  }else{suggestion.textContent=message.value.trim()?'No confident status detected. Choose a status or save as a note.':'Type an update to see a suggested status.'}
 });
 form.addEventListener('submit',event=>{event.preventDefault();save({message:message.value,status:statusSelect.value,nextAction:nextAction.value,note:notes.value},button)});
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
 host.append(history);
}
async function reload(){
 if(loading&&loadingEpoch===epoch)return loading;
 const ticket=++epoch;
 loadingEpoch=ticket;
 if(!cloud.user){events=[];caseId=null;failed=false;show();fire();return}
 loading=cloud.api('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,occurred_at,summary,event_metadata&entity_type=eq.renewal_case&event_type=eq.renewal_progress_updated&order=occurred_at.desc&limit=1000')
  .then(rows=>{if(ticket!==epoch||!cloud.user)return;events=Array.isArray(rows)?rows:[];failed=false;show();fire()})
  .catch(e=>{if(ticket!==epoch)return;failed=true;show();fire()})
  .finally(()=>{if(loadingEpoch===ticket)loading=null});
 return loading;
}
async function save(values,button){
 const item=selected();if(!item||!cloud.user||posting||failed){say('Cannot save while renewal history is unavailable.',true);return}
 let payload;
 const prior=latest(item.id);
 try{payload=R.eventPayload(item.id,cloud.user.id,values,prior?.id)}
 catch(e){say(e.message,true);return}
 posting=true;button.disabled=true;say('Checking latest updates…');
 try{
  const check=await cloud.api('/rest/v1/ops_events?select=id,entity_type,entity_id,event_type,occurred_at,event_metadata&entity_type=eq.renewal_case&entity_id=eq.'+encodeURIComponent(item.id)+'&event_type=eq.renewal_progress_updated&order=occurred_at.desc&limit=1');
  if((check?.[0]?.id||null)!==(prior?.id||null)){
   say('Another update was saved to this case. Copy any unsaved text, refresh renewals and review before saving.',true);
   return;
  }
  if(!cloud.user||selected()?.id!==item.id){say('Selected case or account changed. No update saved.',true);return}
  const saved=await cloud.api('/rest/v1/ops_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!Array.isArray(saved)||saved.length!==1||!saved[0].id)throw Error('Server did not confirm a saved activity event. Refresh before retrying.');
  events=[saved[0],...events.filter(e=>e.id!==saved[0].id)];
  failed=false;show();fire();say('Saved to renewal history. PDF and original lease records were not changed.');
 }catch(e){say('Save could not be confirmed: '+e.message,true)}
 finally{posting=false;button.disabled=false}
}
window.addEventListener('ops-renewal-case-selected',e=>{caseId=e.detail?.id||null;show()});
window.addEventListener('ops-portfolio-loaded',()=>reload());
window.addEventListener('ops-auth-change',e=>{if(!e.detail.user){epoch++;events=[];caseId=null;failed=false;show();fire()}});
show();
})();