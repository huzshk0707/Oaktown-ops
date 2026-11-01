/* Tasks intake: explicit review, no AI calls, no sensitive browser persistence. */
(()=>{'use strict';
const R=window.OpsTaskIntake,cloud=window.OpsCloud,$=id=>document.getElementById(id);
let session=null,state={tasks:[],items:[],receipts:[]},draft=null,decisions={},receipt=null,epoch=0,busy=false,active=false,pendingRequest=null,showArchived=false;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const fieldLabel=k=>({waiting_on:'Waiting on',follow_up:'Follow-up',due:'Due date',blocked_reason:'Blocker',completion_summary:'Completion summary'}[k]||k.replaceAll('_',' '));
const msg=text=>{$('task-status').textContent=text};
const rpc=(action,payload={},sid=session)=>cloud.api('/rest/v1/rpc/ops_task_intake',{method:'POST',body:JSON.stringify({p_action:action,p_session:sid,p_payload:payload})});
const archiveRpc=(task,version,archived)=>cloud.api('/rest/v1/rpc/ops_task_set_archived',{method:'POST',body:JSON.stringify({p_task:task,p_expected_updated_at:version,p_archived:archived})});
async function copyText(content){
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable');await navigator.clipboard.writeText(content);return true}
 catch(error){
  const input=document.createElement('textarea');input.value=content;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
  let worked=false;try{worked=document.execCommand('copy')}catch{}
  input.remove();if(worked)return true;
  $('task-receipt').focus();return false;
 }
}
function controls(){for(const id of ['task-session','task-new-session','task-snapshot','task-preview','task-json','task-refresh'])$(id).disabled=busy||!cloud.user;
$('task-copy-receipt').disabled=busy||!cloud.user||!R.validReceipt(receipt);
updateSave();}
function updateSave(){let okay=false;try{okay=!!draft&&!!session&&R.preview(draft,state,decisions).pending.length>0&&!R.preview(draft,state,decisions).warnings.length&&$('task-confirm').checked}catch{}$('task-save').disabled=busy||!cloud.user||!okay}
function reset(){epoch++;busy=false;msg(cloud.user?'Choose an intake session to continue.':'Sign in to review and save task imports.');session=null;state={tasks:[],items:[],receipts:[]};draft=null;decisions={};receipt=null;pendingRequest=null;showArchived=false;$('task-json').value='';$('task-session').replaceChildren(new Option('Choose an intake session',''));$('task-review').replaceChildren();$('task-receipt').textContent='';$('task-history').replaceChildren();$('task-confirm').checked=false;controls()}
function fail(e){msg(e.code==='PGRST202'||e.status===404?'Cloud task saving is not enabled yet. The reviewed database setup must be deployed first. You can still preview an export while signed in.':e.message)}
async function action(fn){if(busy)return;busy=true;const ticket=epoch;controls();try{await fn(ticket)}catch(e){if(ticket===epoch)fail(e)}finally{if(ticket===epoch){busy=false;controls()}}}
async function listSessions(){
 const ticket=epoch;const rows=await rpc('sessions',{},null);if(ticket!==epoch)return;
 $('task-session').replaceChildren(new Option('Choose an intake session',''));
 for(const row of rows)$('task-session').add(new Option(new Date(row.created_at).toLocaleString('en-US',{timeZone:R.ZONE})+' · '+row.id.slice(0,8),row.id));
 if(session)$('task-session').value=session;
}
async function refresh(){if(!session)return;const ticket=epoch;const data=await rpc('state');if(ticket!==epoch)return;state=data;renderHistory();if(draft)renderReview()}
function renderHistory(){
 const host=$('task-history');host.replaceChildren();
 if(!session)return;
 const display=R.splitTasks(state.tasks,state.items,showArchived);
 const title=el('h3','Tasks imported in this session ('+display.session.length+')');
 host.append(title,el('p','Existing portfolio tasks are listed separately so they do not bury your new imports. Archive hides a task from the active list; it does not erase evidence or work history.','task-muted'));
 function appendTask(t,where){
  const row=el('div',undefined,'task-history-row');
  const summary=el('div');
  summary.append(el('strong',t.task_title),el('p',t.status+(t.intake_details?.next_action?' · '+t.intake_details.next_action:''),'task-muted'));
  row.append(summary);
  const archived=!!t.archived_at,button=el('button',archived?'Restore':'Archive','button');
  button.type='button';button.disabled=!cloud.user;
  button.setAttribute('aria-label',(archived?'Restore':'Archive')+' task: '+t.task_title);
  button.addEventListener('click',()=>action(async ticket=>{
   const verb=archived?'restore':'archive';
   if(!confirm('Do you want to '+verb+' "'+t.task_title+'"? '+(archived?'It will return to the active task list.':'It will be hidden from active tasks. The original evidence and activity history will be preserved.')))return;
   await archiveRpc(t.id,t.updated_at,!archived);
   if(ticket!==epoch)return;
   await refresh();
   if(ticket===epoch)msg('Task '+(archived?'restored':'archived')+'. No task evidence was deleted.');
  }));
  row.append(button);where.append(row);
 }
 if(!display.session.length)host.append(el('p','No active tasks imported in this session.','task-muted'));
 for(const t of display.session)appendTask(t,host);
 const other=el('details',undefined,'task-other');
 other.append(el('summary','Other active portfolio tasks ('+display.other.length+')'));
 const container=el('div');for(const t of display.other)appendTask(t,container);
 other.append(container);host.append(other);
 const toggle=el('button',showArchived?'Hide archived tasks':'Show archived tasks ('+display.archivedCount+')','button');
 toggle.type='button';toggle.disabled=!cloud.user;toggle.addEventListener('click',()=>{showArchived=!showArchived;renderHistory()});host.append(toggle);
 if(showArchived){const archivedGroup=el('section',undefined,'task-archived-list');archivedGroup.append(el('h3','Archived tasks ('+display.archivedCount+')'));for(const t of display.archived)appendTask(t,archivedGroup);host.append(archivedGroup)}
 const work=state.items.filter(i=>i.kind==='activity');
 if(work.length){const d=el('details',undefined,'task-other');d.append(el('summary','Work recorded in this session ('+work.length+')'));for(const i of work){const a=i.payload;d.append(el('p',a.work_date+' · '+a.summary+' · '+(a.minutes===null?'Duration not provided':a.minutes+' minutes ('+(a.duration_basis==='user_estimate'?'estimated by you':'reported')+')')))}host.append(d)}
 // A previous PL/pgSQL name collision caused [null] to be returned for receipts.
 // Never overwrite a valid receipt with a null placeholder.
 const newest=(state.receipts||[]).find(R.validReceipt);
 if(newest)receipt=newest;
 $('task-receipt').textContent=R.validReceipt(receipt)?JSON.stringify(receipt,null,2):'No receipt is available yet. Refresh the session after the receipt fix is deployed.';
 controls();
}
function checkbox(label,checked,handler){const lab=el('label',undefined,'task-check'),input=document.createElement('input');input.type='checkbox';input.checked=checked;input.addEventListener('change',()=>{handler(input.checked);const replacement=[...$('task-review').querySelectorAll('label.task-check')].find(l=>l.textContent===label)?.querySelector('input');replacement?.focus({preventScroll:true})});lab.append(input,el('span',label));return lab}
function fields(data){const dl=el('dl',undefined,'task-fields');if(!data){dl.append(el('dd','New task — not saved'));return dl}
 for(const [k,v]of Object.entries(data)){dl.append(el('dt',k.replaceAll('_',' ')),el('dd',v&&typeof v==='object'?(v.date||'')+(v.time?' at '+v.time:'')+' · Eastern time':String(v||'Not set')))}return dl}
function contextPicker(g){
 const box=el('div'),root=g.key.slice(4),data=window.OpsPortfolio?.getData(),lab=el('label','Resolve property / unit');
 const select=document.createElement('select');select.setAttribute('aria-label','Resolve property / unit for '+g.after.task_title);
 select.add(new Option('Choose the correct property or unit',''));
 if(g.context.workflow_key==='general')select.add(new Option('General operations — no property','general'));
 else if(data){
  for(const p of data.properties){select.add(new Option(p.street_address+' · whole property','p:'+p.id));for(const u of data.units.filter(u=>u.property_id===p.id))select.add(new Option(p.street_address+' · '+(u.unit_label||u.unit_code),'u:'+u.id));}
 }
 const prior=decisions.resolutions[root];
 if(prior)select.value=prior.unit_id?'u:'+prior.unit_id:prior.property_id?'p:'+prior.property_id:'general';
 select.addEventListener('change',()=>{
  const v=select.value;delete decisions.resolutions[root];
  if(v==='general')decisions.resolutions[root]={property_id:null,unit_id:null,context_label:'General operations'};
  else if(v.startsWith('u:')){const u=data.units.find(x=>x.id===v.slice(2));decisions.resolutions[root]={property_id:u.property_id,unit_id:u.id,context_label:select.selectedOptions[0].textContent}}
  else if(v.startsWith('p:'))decisions.resolutions[root]={property_id:v.slice(2),unit_id:null,context_label:select.selectedOptions[0].textContent};
  pendingRequest=null;$('task-confirm').checked=false;renderReview();[...$('task-review').querySelectorAll('select')].find(s=>s.getAttribute('aria-label')===select.getAttribute('aria-label'))?.focus({preventScroll:true});
 });lab.append(select);box.append(lab);return box;
}
function renderReview(){
 const host=$('task-review');host.replaceChildren();let preview;try{preview=R.preview(draft,state,decisions)}catch(e){host.append(el('p',e.message,'task-alert'));updateSave();return}
 host.append(el('h2','Review proposed changes'),el('p',preview.groups.length+' task(s) · '+preview.minutes+' newly reported minutes · '+preview.skipped.length+' previously imported item(s)','task-muted'));
 if(!session)host.append(el('p','Preview only. Create or choose a cloud intake session before saving.','task-alert'));
 for(const g of preview.groups){
  const card=el('section',undefined,'task-card');card.append(el('h3',g.after.task_title),el('p',g.context.context_label||'Existing task','task-muted'));
  if(!g.task_id)card.append(contextPicker(g));
  const diff=el('div',undefined,'task-diff'),before=el('div'),after=el('div');before.append(el('strong','Saved state'),fields(g.before));after.append(el('strong','After your review'),fields(g.after));diff.append(before,after);card.append(diff);
  for(const c of g.clears)card.append(checkbox('Approve clearing '+c.fields.map(fieldLabel).join(', ')+' ('+c.ref+')',decisions.accept_clears.includes(c.ref),on=>{decisions.accept_clears=decisions.accept_clears.filter(x=>x!==c.ref);if(on)decisions.accept_clears.push(c.ref);pendingRequest=null;$('task-confirm').checked=false;renderReview()}));
  for(const ref of g.suggestions){const p=draft.proposals.find(p=>p.proposal_ref===ref);card.append(checkbox('Accept suggestion: '+Object.entries(p.suggestions).map(([k,v])=>fieldLabel(k)+': '+(typeof v==='object'?v.date+(v.time?' '+v.time:''):v)).join('; ')+' ('+ref+')',decisions.accept_suggestions.includes(ref),on=>{decisions.accept_suggestions=decisions.accept_suggestions.filter(x=>x!==ref);if(on)decisions.accept_suggestions.push(ref);pendingRequest=null;$('task-confirm').checked=false;renderReview()}));}
  if(g.activities.length){card.append(el('h3','Work to record'));for(const a of g.activities)card.append(el('p',a.summary+' · '+(a.minutes===null?'Duration not provided':a.minutes+' minutes ('+(a.duration_basis==='user_estimate'?'estimated by you':'reported')+')')))}
  const evidence=el('details',undefined,'task-evidence');evidence.append(el('summary','Original evidence and proposal history'));
  for(const o of g.observations){evidence.append(el('p',o.ref+' · '+o.operation+' · '+o.reason));for(const ref of o.sources){const s=draft.sources.find(s=>s.source_ref===ref);evidence.append(el('blockquote',s.label+': '+s.evidence_excerpt))}}
  card.append(evidence);host.append(card);
 }
 if(draft.questions.length){host.append(el('h3','Questions from the export'));for(const q of draft.questions)host.append(el('p',q))}
 for(const w of preview.warnings)host.append(el('p',w,'task-alert'));
 updateSave();
}
$('task-preview').addEventListener('click',()=>{
 try{draft=R.parse($('task-json').value);if(draft.session_id&&draft.session_id!==session)throw Error('Choose the intake session specified by this export');
 decisions={resolutions:{},accept_clears:[],accept_suggestions:[]};pendingRequest=null;$('task-confirm').checked=false;renderReview();msg('Preview only. Review every task, source and clearing proposal before saving.');
 $('task-review').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }catch(e){draft=null;$('task-review').replaceChildren();fail(e);updateSave()}
});
$('task-json').addEventListener('input',()=>{draft=null;pendingRequest=null;$('task-review').replaceChildren();$('task-confirm').checked=false;updateSave()});
$('task-confirm').addEventListener('change',updateSave);
$('task-new-session').addEventListener('click',()=>action(async ticket=>{
 if(session&&$('task-json').value&&!confirm('Start a separate intake session? Unsaved pasted text will be cleared.'))return;
 const data=await rpc('new',{},null);if(ticket!==epoch)return;session=data.session_id;draft=null;decisions={};pendingRequest=null;$('task-json').value='';$('task-review').replaceChildren();$('task-receipt').textContent='';$('task-confirm').checked=false;
 await listSessions();await refresh();msg('New intake session created. Copy the session brief for your AI chat.');
}));
$('task-session').addEventListener('change',()=>action(async()=>{
 session=$('task-session').value||null;draft=null;decisions={};pendingRequest=null;$('task-json').value='';$('task-review').replaceChildren();$('task-receipt').textContent='';$('task-confirm').checked=false;state={tasks:[],items:[],receipts:[]};await refresh();msg(session?'Session loaded. Paste the export from this AI conversation.':'Choose an intake session.');
}));
$('task-refresh').addEventListener('click',()=>action(async()=>{await listSessions();await refresh();msg('Saved records refreshed. Review again before saving.');$('task-confirm').checked=false}));
$('task-snapshot').addEventListener('click',()=>action(async()=>{
 if(!session)throw Error('Create or choose a session first');
 await refresh();
 const brief={schema_version:'oaktown.task-snapshot.v1',snapshot_ref:session+':'+new Date().toISOString(),session_id:session,timezone:R.ZONE,work_date:new Intl.DateTimeFormat('en-CA',{timeZone:R.ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),exported_at:new Date().toISOString(),instructions:'Include this session_id in every oaktown.task-intake.v1 export. Use the supplied task IDs and updated_at values for existing-task updates. Do not recycle imported proposal or activity references. Dates use America/New_York. Never claim data is saved without an Ops receipt.',tasks:state.tasks.filter(t=>!t.archived_at),imported_references:state.items.filter(i=>i.kind!=='source').map(i=>({kind:i.kind,ref:i.ref,task_id:i.task_id}))};
 if(!await copyText(JSON.stringify(brief,null,2)))throw Error('Clipboard permission denied. Please grant clipboard access to copy the session brief.');
 msg('Session brief copied. Share only with your chosen AI service.');
}));
$('task-save').addEventListener('click',()=>action(async ticket=>{
 if(!session||!draft||!$('task-confirm').checked)throw Error('Review and confirm before saving');
 const preview=R.preview(draft,state,decisions);if(preview.warnings.length)throw Error(preview.warnings.join('\n'));
 const sid=session;
 pendingRequest=pendingRequest||{export:draft,...decisions,expected_versions:Object.fromEntries(state.tasks.map(t=>[t.id,t.updated_at])),reviewed:true};
 const saved=await rpc('save',pendingRequest,sid);if(ticket!==epoch)return;
 receipt=R.validReceipt(saved)?saved:null;
 $('task-receipt').textContent=R.validReceipt(receipt)?JSON.stringify(receipt,null,2):'Save response missing a valid receipt. Refresh and verify the saved task before trying again.';pendingRequest=null;draft=null;$('task-json').value='';$('task-review').replaceChildren();$('task-confirm').checked=false;
 await refresh();if(R.validReceipt(receipt))$('task-saved-records').open=true;msg(R.validReceipt(receipt)?'Saved to Ops. Copy the receipt back to your AI chat. No messages or reminders were sent.':'Save returned without a valid receipt. The task may have been saved: refresh the session and verify before retrying.');
}));
$('task-copy-receipt').addEventListener('click',()=>action(async()=>{if(!R.validReceipt(receipt))throw Error('No valid receipt is available. Refresh the saved session first.');if(!await copyText(JSON.stringify(receipt,null,2)))throw Error('Clipboard permission denied. Select and copy the displayed receipt manually.');msg('Import receipt copied to clipboard.')}));
$('task-signin').addEventListener('click',()=>$('account-button').click());
document.querySelector('[data-workspace="tasks"]').addEventListener('click',()=>{
 active=true;controls();if(cloud.user)action(async()=>{await listSessions();if(session)await refresh()});else msg('Sign in to review and save task imports.');
});
window.addEventListener('ops-auth-change',e=>{reset();$('task-locked').hidden=!!e.detail.user;if(e.detail.user&&active)action(listSessions)});
window.addEventListener('ops-portfolio-loaded',()=>{if(draft)renderReview()});
$('task-locked').hidden=!!cloud.user;
controls();
})();
