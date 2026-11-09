/* Morning Plan & SOD: reviewed staff-only composition, no persistence or sending. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsSodModel,T=window.OpsTodayModel;
 if(!cloud||!M||!T||!$('sod-form'))return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
 let data=null,account=null,selected=[],draft='',dirty=false;
 const status=value=>{$('sod-status').textContent=value};
 const invalidate=()=>{
  draft='';$('sod-output').value='';$('sod-output').hidden=true;$('sod-copy').disabled=true;
  $('sod-plan-note').textContent='No SOD draft generated yet. Selection is temporary and does not edit saved tasks.';
  if(cloud.user&&data&&dirty)status('Review the plan and generate a new draft. No email has been sent.');
 };
 function controls(){
  const ready=!!cloud.user&&!!data;
  $('sod-add').disabled=!ready||!$('sod-saved-task').value;
  $('sod-generate').disabled=!ready;
  $('sod-copy').disabled=!ready||!draft;
 }
 function reset(){
  account=cloud.user?.id||null;data=null;selected=[];draft='';dirty=false;
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
  status(cloud.user?'Loading saved tasks…':'Sign in to build an SOD from your saved tasks.');
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
   const title=el('legend',(r.code?r.code+' · ':'')+'Saved task '+(i+1));group.append(title);
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
   remove.addEventListener('click',()=>{selected.splice(i,1);dirty=true;invalidate();renderSelected();renderCandidates()});
   actions.append(move('Move up',-1),move('Move down',1),remove);
   group.append(sub,action,actions);host.append(group);
  });
  controls();
 }
 function receive(next){
  if(!cloud.user||!next){reset();return}
  if(account!==cloud.user.id)reset();
  data=next;account=cloud.user.id;
  const available=new Map(M.candidates(next.tasks).map(t=>[t.id,t]));
  let changed=false;
  selected=selected.filter(row=>{
   const current=available.get(row.id);
   const good=!!current&&(!row.updatedAt||!current.updated_at||row.updatedAt===current.updated_at);
   if(!good)changed=true;return good;
  });
  if(changed){dirty=true;invalidate();status('A selected task changed or closed. Re-select it after reviewing the latest saved record.');}
  $('sod-workdate').textContent=T.today()+' · Louisville/Eastern';
  renderSelected();renderCandidates();
  if(!changed)status('Ready. Select saved work and add new instructions; no task changes are made.');
 }
 $('sod-add').addEventListener('click',()=>{
  if(!data||!cloud.user)return;
  const task=data.tasks.find(t=>t.id===$('sod-saved-task').value);
  if(!task||selected.some(x=>x.id===task.id))return;
  try{const line=M.fromTask(task);selected.push({...line,updatedAt:task.updated_at||null});
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
   const result=M.compose({
     greeting:$('sod-greeting').value,
     selected:selected.map(({id,subject,action})=>({id,subject,action})),
     extras:$('sod-extras').value,constants
   });
   draft=result.text;$('sod-output').value=draft;$('sod-output').hidden=false;
   $('sod-plan-note').textContent=result.specificCount+' reviewed specific '+(result.specificCount===1?'priority':'priorities')+
    ' · '+result.recurringCount+' recurring '+(result.recurringCount===1?'responsibility':'responsibilities')+
    '. Copying does not send the email or change task status.';
   status('SOD draft ready. Review the wording before copying it to your email.');
   controls();
  }catch(error){invalidate();status('Cannot generate SOD: '+error.message)}
 });
 $('sod-output').addEventListener('input',()=>{
  if(!$('sod-output').hidden){draft=$('sod-output').value;$('sod-copy').disabled=!draft;status('Email text manually edited. Review before copying; nothing has been sent.');}
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
 window.addEventListener('ops-today-data',event=>receive(event.detail));
 window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user||event.detail.user.id!==account)reset()});
 window.addEventListener('ops-today-show',()=>{if(cloud.user&&data){$('sod-workdate').textContent=T.today()+' · Louisville/Eastern'}});
 reset();
 if(cloud.user&&window.OpsToday?.getData())receive(window.OpsToday.getData());
})();