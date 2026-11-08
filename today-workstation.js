/* Focus-first, read-only Today projections. Staff review changes in the existing editor. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsWorkstationModel,T=window.OpsTodayModel;
if(!M||!cloud||!$('today-focus-level'))return;
let data=null,projected=null,userId=null,levelKey='',taskId='';
const el=(tag,value,klass)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);if(klass)n.className=klass;return n};
const pref=()=> 'oaktown-today-focus-v1:'+cloud.user.id;
function readPreference(){try{return localStorage.getItem(pref())||''}catch{return ''}}
function savePreference(){try{localStorage.setItem(pref(),levelKey)}catch{}}
function edit(t,status){
 if(!data?.canEdit||!cloud.user)return;
 window.dispatchEvent(new CustomEvent('ops-today-edit',{detail:{task:t,suggestedStatus:status||null}}));
}
function button(label,act,cls='button'){
 const b=el('button',label,cls);b.type='button';b.addEventListener('click',act);return b;
}
function clear(){
 data=null;projected=null;userId=null;levelKey='';taskId='';
 $('today-urgent').replaceChildren(el('p','Sign in to view work that needs attention.','today-muted'));
 $('today-focus-body').replaceChildren(el('p','Sign in to select a focus level.','today-muted'));
 $('today-work-levels').replaceChildren(el('p','Sign in to view your saved work levels.','today-muted'));
 $('today-focus-level').replaceChildren(new Option('Sign in to choose a level',''));
 $('today-focus-level').disabled=true;$('today-focus-note').textContent='';
}
function meta(t){
 const pieces=[String(t.priority||'normal')+' priority',String(t.status||'pending')];
 if(t.schedule)pieces.push(t.schedule.type+': '+t.schedule.date+' (Eastern)');
 else pieces.push('No date recorded');
 if(t.assigned_label)pieces.push('Owner: '+t.assigned_label);
 if(typeof t.intake_details?.waiting_on==='string'&&t.intake_details.waiting_on.trim())pieces.push('Waiting on: '+t.intake_details.waiting_on.trim());
 return pieces.join(' · ');
}
function choose(key,id){
 levelKey=key;taskId=id||'';
 if(cloud.user)savePreference();
 render();
 $('today-focus-heading').scrollIntoView({block:'nearest',behavior:document.documentElement.dataset.opsMotion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function renderAlerts(){
 const host=$('today-urgent');host.replaceChildren();
 const alerts=projected.alerts;
 if(!alerts.length){host.append(el('p','No urgent, overdue or due-today tasks are recorded.','today-muted'));return}
 for(const t of alerts){
  const row=el('article',null,'today-alert'),content=el('div');
  content.append(el('strong',t.task_title||'Untitled task'),el('p',meta(t),'today-alert-meta'));
  const l=M.level(t);content.append(el('span',l.label,'today-alert-level'));row.append(content);
  if(data.canEdit)row.append(button('Review',()=>edit(t),'button'));
  host.append(row);
 }
}
function renderFocus(){
 const host=$('today-focus-body'),pick=$('today-focus-level');host.replaceChildren();
 const open=projected.levels.filter(l=>l.open.length);
 const previous=levelKey;
 const selected=M.focus(projected,levelKey),current=selected.level;
 levelKey=current?.key||'';
 if(previous!==levelKey&&cloud.user)savePreference();
 pick.replaceChildren(new Option(open.length?'Choose a saved work level':'No active work levels',''));
 for(const l of open)pick.add(new Option(l.label+' · '+l.open.length+' open',l.key));
 pick.value=levelKey;pick.disabled=!open.length;
 if(!current){host.append(el('p','No open tasks are recorded. Import and reconcile your reviewed backlog in Stage A2.','today-muted'));$('today-focus-note').textContent='';return}
 const chosen=current.open.find(t=>t.id===taskId)||selected.task;
 taskId=chosen?.id||'';
 const head=el('div',null,'today-focus-top');
 head.append(el('span',current.label+' · '+current.open.length+' open','today-focus-level-label'));
 if(current.waiting.length)head.append(el('span',current.waiting.length+' waiting','today-focus-waiting'));
 host.append(head);
 if(current.open.length>1){
  const lab=el('label','Focus task','today-task-picker'),sel=document.createElement('select');sel.id='today-focus-task';
  for(const t of current.open)sel.add(new Option(t.task_title||'Untitled task',t.id));
  sel.value=taskId;sel.addEventListener('change',()=>{taskId=sel.value;renderFocus()});lab.append(sel);host.append(lab);
 }
 host.append(el('h4',chosen.task_title||'Untitled task'),el('p',meta(chosen),'today-muted'));
 const next=chosen.intake_details?.next_action;
 if(typeof next==='string'&&next.trim())host.append(el('p','Next action: '+next,'today-focus-next'));
 const blocker=chosen.intake_details?.blocked_reason;
 if(typeof blocker==='string'&&blocker.trim())host.append(el('p','Blocker: '+blocker,'today-focus-next'));
 const actions=el('div',null,'today-focus-actions');
 if(data.canEdit){
  actions.append(button('Review task',()=>edit(chosen),'button primary'));
  if(String(chosen.status||'').toLowerCase()!=='completed')actions.append(button('Complete',()=>edit(chosen,'completed')));
  if(!M.isWaiting(chosen))actions.append(button('Move to waiting',()=>edit(chosen,'waiting')));
 }else actions.append(el('p','Read-only access. Ask an authorized editor to update the task.','today-muted'));
 host.append(actions);
 $('today-focus-note').textContent='Complete and Waiting open the reviewed editor; no status changes until you save.';
}
function renderLevels(){
 const host=$('today-work-levels');host.replaceChildren();
 if(!projected.levels.length){host.append(el('p','No saved task levels yet. The Master Backlog is not imported.','today-muted'));return}
 for(const l of projected.levels){
  const d=document.createElement('details');d.className='today-level';
  const summary=el('summary');summary.append(el('strong',l.label),el('span',l.open.length+' open · '+l.waiting.length+' waiting · '+l.done.length+' closed','today-level-count'));
  d.append(summary);
  if(!l.open.length){d.append(el('p','No open tasks remain in this level. See task history and the saved statuses.','today-muted'));host.append(d);continue}
  const list=el('div',null,'today-level-items');
  for(const t of l.open){
   const row=el('div',null,'today-level-row'),body=el('div');
   body.append(el('strong',t.task_title||'Untitled task'),el('span',meta(t),'today-muted'));
   row.append(body,button('Focus',()=>choose(l.key,t.id),'button'));list.append(row);
  }
  d.append(list);host.append(d);
 }
}
function render(){
 if(!data||!cloud.user||!projected)return;
 renderAlerts();renderFocus();renderLevels();
}
$('today-focus-level').addEventListener('change',()=>{if(!projected)return;choose($('today-focus-level').value,'')});
function receive(next){
 if(!next||!cloud.user){clear();return}
 if(userId!==cloud.user.id){userId=cloud.user.id;levelKey=readPreference();taskId=''}
 data=next;projected=M.project(data.tasks);render();
}
window.addEventListener('ops-today-data',event=>receive(event.detail));
window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user)clear()});
clear();
if(window.OpsToday?.getData())receive(window.OpsToday.getData());
})();
