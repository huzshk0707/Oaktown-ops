/* Single SOD editor. Morning controller handles explicit approval; composition never sends or edits tasks. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsSodModel,T=window.OpsTodayModel;
 if(!cloud||!M||!T||!$('sod-form'))return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
 let data=null,account=null,selected=[],draft='',dirty=false,managed=false,revision=0,generatedDate=null,locked=false,approved=null,planId=crypto.randomUUID(),stale=[];
 const morning=()=>window.OpsMorningModel;
 const emit=()=>window.dispatchEvent(new Event('ops-sod-change'));
 const status=value=>{$('sod-status').textContent=value};
 const invalidate=()=>{
  revision++;generatedDate=null;
  draft='';$('sod-output').value='';$('sod-output').hidden=true;$('sod-copy').disabled=true;
  $('sod-plan-note').textContent='No SOD draft generated yet. Selection is temporary and does not edit saved tasks.';
  if(cloud.user&&data&&dirty)status('Review the plan and generate a new draft. No email has been sent.');
  emit();
 };
 function controls(){
  const ready=!!cloud.user&&!!data&&!locked;
  $('sod-saved-task').disabled=!ready;
  $('sod-add').disabled=!ready||!$('sod-saved-task').value;
  $('sod-generate').disabled=!ready;
  $('sod-copy').disabled=!ready||!draft;
  $('sod-output').readOnly=locked;
  if(locked)for(const field of $('sod-form').querySelectorAll('input,textarea,select,button'))field.disabled=true;
 }
 function reset(){
  account=cloud.user?.id||null;data=null;selected=[];draft='';dirty=false;managed=false;revision=0;generatedDate=null;locked=false;approved=null;planId=crypto.randomUUID();stale=[];
  for(const field of $('sod-form').querySelectorAll('input,textarea,select'))field.disabled=false;
  $('sod-extras').value='';
  $('sod-greeting').value='normal';
  for(const section of M.CONSTANTS){
   $('sod-constant-'+section.id).checked=true;
   $('sod-text-'+section.id).value=section.text;
  }
  $('sod-plan-selected').replaceChildren();
  $('sod-saved-task').replaceChildren(new Option('Sign in to select saved tasks',''));
  $('sod-output').value='';$('sod-output').hidden=true;
  $('sod-plan-note').textContent='No SOD draft generated yet.';
  $('sod-workdate').textContent=T.today()+' · Louisville/Eastern';
  status(cloud.user?'Loading saved tasks…':'Sign in to build an SOD from your saved tasks.');emit();
  controls();
 }
 function renderCandidates(){
  const select=$('sod-saved-task'),old=select.value;
  select.replaceChildren(new Option('Choose a saved task',''));
  if(!data||!cloud.user){controls();return}
  const selectedIds=new Set(selected.map(r=>r.id));
  const available=M.candidates(data.tasks).filter(t=>!selectedIds.has(t.id));
  for(const task of available){
   const subtitle=task.status==='waiting'||task.status==='blocked'?' · '+task.status:'';
   select.add(new Option((task.task_code?task.task_code+' · ':'')+(task.task_title||'Untitled task')+subtitle,task.id));
  }
  if(available.some(t=>t.id===old))select.value=old;
  controls();
 }
 function renderSelected(){
  const host=$('sod-plan-selected');host.replaceChildren();
  if(!selected.length)host.append(el('p','No saved tasks selected yet. You can still add new priorities below.','today-muted'));
  selected.forEach((r,i)=>{
   const group=el('fieldset',null,'sod-chosen');
   const title=el('legend',r.type==='planning'?'Planning only · '+r.source.label:(r.code?r.code+' · ':'')+'Saved task '+(i+1));group.append(title);
   if(managed){
    const label=el('label','Operational section'),select=el('select');
    for(const name of morning().sections)select.add(new Option(name,name));select.value=r.section||'Additional work';
    select.onchange=()=>{r.section=select.value;dirty=true;invalidate()};label.append(select);group.append(label);
    group.append(el('p',r.source?.verification||'Saved task record','today-muted'));
    if(stale.includes(r.id)){const warning=el('p','Saved task changed. Your wording is kept until you replace or remove it.','sod-source-warning'),reload=el('button','Reload saved task wording','button');reload.type='button';reload.onclick=()=>{const task=data?.tasks.find(t=>t.id===r.id&&M.eligible(t));if(!task)return;Object.assign(r,M.fromTask(task),{updatedAt:task.updated_at,source:morning().taskSource(task)});stale=stale.filter(id=>id!==r.id);dirty=true;invalidate();renderSelected()};group.append(warning,reload)}
   }
   const sub=el('label','SOD priority title');
   const input=el('input');input.type='text';input.maxLength=220;input.value=r.subject;
   input.addEventListener('input',()=>{r.subject=input.value;dirty=true;invalidate()});sub.append(input);
   const action=el('label','Action for this morning');
   const detail=el('textarea');detail.rows=2;detail.maxLength=820;detail.value=r.action;
   detail.placeholder='Enter the specific action to describe to Leslie';
   detail.addEventListener('input',()=>{r.action=detail.value;dirty=true;invalidate()});action.append(detail);
   const actions=el('div',null,'sod-line-actions');
   const move=(text,by)=>{
    const b=el('button',text,'button');b.type='button';b.disabled=i+by<0||i+by>=selected.length;
    b.addEventListener('click',()=>{const dest=i+by;[selected[i],selected[dest]]=[selected[dest],selected[i]];dirty=true;invalidate();renderSelected()});
    return b;
   };
   const remove=el('button','Remove','button');remove.type='button';
   remove.addEventListener('click',()=>{stale=stale.filter(id=>id!==r.id);selected.splice(i,1);dirty=true;invalidate();renderSelected();renderCandidates()});
   actions.append(move('Move up',-1),move('Move down',1),remove);
   group.append(sub,action,actions);host.append(group);
  });
  controls();
 }
 function receive(next){
  if(!cloud.user||!next){if(managed&&cloud.user&&account===cloud.user.id){data=null;controls();status('Shared records unavailable. Your draft is kept; restore access before approval.');emit();return}reset();return}
  if(account!==cloud.user.id)reset();
  data=next;account=cloud.user.id;
  const available=new Map(M.candidates(next.tasks).map(t=>[t.id,t]));
  let changed=false;
  stale=[];
  selected=selected.filter(row=>{
   if(managed&&row.type==='planning')return true;
   const current=available.get(row.id);
   const good=!!current&&(!row.updatedAt||!current.updated_at||row.updatedAt===current.updated_at);
   if(!good){changed=true;if(managed)stale.push(row.id)}return managed||good;
  });
  if(changed){dirty=true;if(!managed)invalidate();status(managed?'A selected task changed or closed. Your draft is kept; reload or remove it before approval.':'A selected task changed or closed. Re-select it after reviewing the latest saved record.');}
  $('sod-workdate').textContent=T.today()+' · Louisville/Eastern';
  renderSelected();renderCandidates();
  if(!changed)status('Ready. Select saved work and add new instructions; no task changes are made.');emit();
 }
 $('sod-saved-task').addEventListener('change',controls);
 $('sod-add').addEventListener('click',()=>{
  if(!data||!cloud.user)return;
  const task=data.tasks.find(t=>t.id===$('sod-saved-task').value);
  if(!task||selected.some(x=>x.id===task.id))return;
  try{const line=M.fromTask(task);selected.push({...line,type:'task',updatedAt:task.updated_at||null,...(managed?{section:morning().taskSection(task),source:morning().taskSource(task)}:{})});
   dirty=true;invalidate();renderSelected();renderCandidates();}
  catch(error){status(error.message)}
 });
 for(const id of ['sod-extras','sod-greeting',...M.CONSTANTS.flatMap(x=>['sod-constant-'+x.id,'sod-text-'+x.id])]){
  $(id).addEventListener('input',()=>{dirty=true;invalidate()});
  $(id).addEventListener('change',()=>{dirty=true;invalidate()});
 }
 $('sod-form').addEventListener('submit',event=>{
  event.preventDefault();if(!cloud.user||!data)return;
  try{
   const constants=M.CONSTANTS.filter(s=>$('sod-constant-'+s.id).checked).map(s=>({id:s.id,text:$('sod-text-'+s.id).value}));
   const workDate=T.today();$('sod-workdate').textContent=workDate+' · Louisville/Eastern';
   if(managed&&stale.length)throw Error('Review changed task sources before generating.');
   const result=(managed?M.composeReviewed:M.compose)({
     workDate,greeting:$('sod-greeting').value,
     selected:selected.map(({id,subject,action})=>({id,subject,action})),
     ...(managed?snapshotInputs():{}),
     extras:$('sod-extras').value,constants
   });
   generatedDate=workDate;draft=result.text;$('sod-output').value=draft;$('sod-output').hidden=false;
   $('sod-plan-note').textContent=result.specificCount+' reviewed specific '+(result.specificCount===1?'priority':'priorities')+
    ' · '+result.recurringCount+' recurring '+(result.recurringCount===1?'responsibility':'responsibilities')+
    '. Copying does not send the email or change task status.';
   status('SOD draft ready. Review the wording before copying it to your email.');
   controls();emit();
  }catch(error){invalidate();status('Cannot generate SOD: '+error.message)}
 });
 $('sod-output').addEventListener('input',()=>{
  if(!$('sod-output').hidden&&!locked){dirty=true;revision++;draft=$('sod-output').value;$('sod-copy').disabled=!draft;status('Email text manually edited. Review before copying; nothing has been sent.');emit();}
 });
 $('sod-copy').addEventListener('click',async()=>{
  if(!cloud.user||!data||!draft)return;
  const value=$('sod-output').value,at=account;
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard not supported');
   await navigator.clipboard.writeText(value);
   if(cloud.user?.id===at)status('SOD copied. Paste into your email and send it yourself; no send confirmation has been recorded.');
  }catch{
   if(cloud.user?.id!==at)return;
   $('sod-output').focus();$('sod-output').select();status('Clipboard access unavailable. The email is selected; copy it manually.');
  }
 });
 window.addEventListener('beforeunload',event=>{if(cloud.user&&dirty){event.preventDefault();event.returnValue=''}});
 window.addEventListener('ops-today-data',event=>receive(event.detail));
 window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user||event.detail.user.id!==account)reset()});
 window.addEventListener('ops-today-show',()=>{if(cloud.user&&data){$('sod-workdate').textContent=T.today()+' · Louisville/Eastern'}});
  function snapshotInputs(){
  const rows=selected.map(r=>({id:r.id,type:r.type||'task',code:r.code||'',subject:r.subject,action:r.action,section:r.section||'Additional work',updatedAt:r.updatedAt||null,sourceId:r.source?.id||'task:'+r.id}));
  const sources=Object.fromEntries(selected.map(r=>{const source=r.source||morning().taskSource(data.tasks.find(t=>t.id===r.id)||r);return [source.id,source]}));
  return {rows,sources};
 }
 window.OpsSod={
  beginMorning(){if(!cloud.user||!data||locked)return false;managed=true;for(const r of selected)if(r.type!=='planning'){const task=data.tasks.find(t=>t.id===r.id);r.type='task';r.section=r.section||morning().taskSection(task||r);r.source=r.source||morning().taskSource(task||r)}renderSelected();emit();return true},
  getPlan(){if(!cloud.user||account!==cloud.user.id||!data)return null;return JSON.parse(JSON.stringify({schema_version:'oaktown.sod-draft.v1',planId,revision,workDate:generatedDate||T.today(),text:draft,stale,dirty,...snapshotInputs(),extras:$('sod-extras').value,greeting:$('sod-greeting').value,constants:M.CONSTANTS.filter(s=>$('sod-constant-'+s.id).checked).map(s=>({id:s.id,text:$('sod-text-'+s.id).value}))}))},
  getApproved(){return cloud.user&&account===cloud.user.id?approved:null},
  setApproved(record){if(!cloud.user||!data||record.actor_id!==cloud.user.id)return false;approved=JSON.parse(JSON.stringify(record));if(record.event_metadata?.plan?.revision===revision&&record.event_metadata.plan.text===draft)dirty=false;emit();return true},
  setLocked(value){locked=!!value;if(!locked)for(const field of $('sod-form').querySelectorAll('input,textarea,select'))field.disabled=false;renderSelected();controls()},
  addSavedTask(id,reviewed=null){if(!data||locked||!cloud.user||selected.some(r=>r.id===id))return false;const task=data.tasks.find(t=>t.id===id);if(!M.eligible(task))return false;const line=M.fromTask(task),source=morning().taskSource(task);if(reviewed){line.subject=reviewed.subject;line.action=reviewed.action;source.label+=' + '+reviewed.source.label;source.body=reviewed.source.body;source.manualReference=Object.fromEntries(['id','code','kind','subject','originRef','sourceDate','receivedAt','sender','reviewRevision'].map(key=>[key,reviewed.source[key]]));source.verification='Saved task identity with manually reviewed instructions; source facts are not independently verified'}selected.push({...line,type:'task',updatedAt:task.updated_at,section:reviewed?.section||morning().taskSection(task),source});managed=true;dirty=true;invalidate();renderSelected();renderCandidates();return true},
  addReviewed(row){if(!data||locked||!cloud.user||selected.some(r=>r.id===row.key))return false;managed=true;selected.push({id:row.key,type:'planning',subject:row.subject,action:row.action,section:row.section,source:row.source});dirty=true;invalidate();renderSelected();renderCandidates();return true},
  restore(record){
   if(locked||!data||!cloud.user||record.actor_id!==cloud.user.id)return false;const meta=record.event_metadata,plan=meta?.plan;
   const invalid=()=>{throw Error('Saved SOD is incomplete or inconsistent. The current draft was kept.')};
   if(!plan||!Array.isArray(plan.rows)||plan.rows.length>50||!plan.sources||typeof plan.sources!=='object'||Array.isArray(plan.sources)||!Array.isArray(plan.constants))invalid();
   if(meta.schema_version!=='oaktown.morning-plan.v1'||record.entity_type!=='morning_plan'||record.event_type!=='morning_plan_approved_v1'||record.entity_id!==plan.planId||meta.plan_id!==plan.planId||meta.revision!==plan.revision||meta.work_date!==plan.workDate)invalid();
   if(plan.schema_version!=='oaktown.sod-draft.v1'||!T.validDate(plan.workDate)||!Number.isInteger(plan.revision)||plan.revision<0||typeof plan.text!=='string'||!plan.text||plan.text.length>90000||!['normal','weekend'].includes(plan.greeting)||typeof plan.extras!=='string')invalid();
   if(!plan.rows.every(r=>r&&typeof r.id==='string'&&['task','planning'].includes(r.type)&&typeof r.subject==='string'&&typeof r.action==='string'&&morning().sections.includes(r.section)&&typeof plan.sources[r.sourceId]?.label==='string'))invalid();
   if(!plan.constants.every(c=>c&&M.CONSTANTS.some(x=>x.id===c.id)&&typeof c.text==='string'))invalid();
   if(dirty&&!confirm('Replace the current SOD draft with this saved approved version?'))return false;
   managed=true;selected=plan.rows.map(r=>({...r,source:plan.sources[r.sourceId]}));planId=plan.planId;revision=plan.revision;generatedDate=plan.workDate;draft=plan.text;dirty=false;approved=JSON.parse(JSON.stringify(record));stale=morning().conflicts(plan,data.tasks).length?selected.filter(r=>r.type==='task').map(r=>r.id):[];
   $('sod-extras').value=plan.extras||'';$('sod-greeting').value=plan.greeting;for(const item of M.CONSTANTS){const saved=plan.constants.find(c=>c.id===item.id);$('sod-constant-'+item.id).checked=!!saved;$('sod-text-'+item.id).value=saved?.text||item.text}
   $('sod-output').value=draft;$('sod-output').hidden=false;renderSelected();renderCandidates();controls();status('Saved approved SOD loaded. Task sources must still be current before execution.');emit();return true;
  },
  addPriority(line){
  if(locked||!cloud.user||!data||account!==cloud.user.id||typeof line!=='string'||!line.trim()||line.length>1500||/[\r\n]/.test(line))return false;
  const lines=$('sod-extras').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.includes(line.trim()))lines.push(line.trim());
  try{M.parseExtras(lines.join('\n'))}catch{return false}
  $('sod-extras').value=lines.join('\n');dirty=true;invalidate();$('sod-morning').open=true;$('sod-extras').focus();
  status('Reminder added to the plan. Review the priorities and generate the SOD. Nothing has been sent.');return true;
 }};
 reset();
 if(cloud.user&&window.OpsToday?.getData())receive(window.OpsToday.getData());
})();
