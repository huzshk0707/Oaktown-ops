/* Personal Today dashboard. All records remain protected by authentication. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsTodayModel,$=id=>document.getElementById(id);
if(!cloud||!M||!$('today-workflow'))return;
let generation=0,busy=false,viewData=null;
const el=(tag,value,klass)=>{const x=document.createElement(tag);if(value!=null)x.textContent=String(value);if(klass)x.className=klass;return x};
const text=(id,value)=>{$(id).textContent=value};
const dateLabel=value=>{if(!M.validDate(value))return 'Date not recorded';return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))};
function resetSchedule(chartMessage){
 $('today-schedule').replaceChildren(el('p',chartMessage,'today-muted'));
}
function renderSchedule(tasks){
 const groups=[['Overdue',tasks.overdue.length,'overdue'],['Due today',tasks.today.length,'today'],['Upcoming',tasks.upcoming.length,'upcoming'],['No date',tasks.undated.length,'undated']];
 const host=$('today-schedule'),layout=el('div',null,'schedule-layout'),ring=el('div',null,'schedule-ring');
 ring.setAttribute('aria-hidden','true');
 let edge=0;const colors={overdue:'#ff9f9a',today:'#65acff',upcoming:'#39d8c0',undated:'#b39aff'};
 const segments=groups.map(([,count,key])=>{const start=edge;edge+=tasks.all.length?count/tasks.all.length*100:0;return colors[key]+' '+start+'% '+edge+'%'});
 ring.style.background=tasks.all.length?'conic-gradient('+segments.join(',')+')':'#24375b';
 const center=el('div',null,'schedule-center');center.append(el('strong',tasks.all.length),el('span','active tasks'));ring.append(center);
 const legend=el('ul',null,'schedule-legend');
 for(const [label,count,key] of groups){const row=el('li'),dot=el('span',null,'schedule-dot');dot.style.background=colors[key];dot.setAttribute('aria-hidden','true');row.append(dot,el('span',label),el('strong',count));legend.append(row)}
 layout.append(ring,legend);host.replaceChildren(layout);
 if(!tasks.all.length)host.append(el('p','No active tasks recorded.','today-muted'));
}
function clear(){generation++;busy=false;viewData=null;window.dispatchEvent(new CustomEvent('ops-today-data',{detail:null}));$('today-signin').hidden=!!cloud.user;text('today-status','Sign in to view private task and renewal information.');$('today-kpis').replaceChildren();$('today-queue').replaceChildren();$('today-renewals').replaceChildren();$('today-refresh').disabled=!cloud.user;resetSchedule('Sign in to view the task breakdown.');}
function taskRow(t){const card=el('article',null,'today-task');card.append(el('strong',t.task_title||'Untitled task'));
 if(viewData){
  const units=new Map(viewData.units.map(x=>[x.id,x])),properties=new Map(viewData.properties.map(x=>[x.id,x]));
  const unit=units.get(t.unit_id),property=properties.get(t.property_id||unit?.property_id);
  const link=[property?.street_address,unit?.unit_label&&unit.unit_label!=='MAIN'?unit.unit_label:null].filter(Boolean).join(' · ');
  if(link)card.append(el('span',link,'today-task-link'));
  if(t.lease_id||t.renewal_case_id)card.append(el('span',[t.lease_id?'Lease linked':null,t.renewal_case_id?'Renewal linked':null].filter(Boolean).join(' · '),'today-task-meta'));
 }
 const fields=el('div',null,'today-task-meta');
 const parts=[String(t.status||'pending'),String(t.priority||'normal')+' priority'];
 if(t.schedule)parts.push(t.schedule.type+' · '+dateLabel(t.schedule.date));
 else parts.push('No date assigned');
 if(t.assigned_label)parts.push('Assigned: '+t.assigned_label);
 fields.textContent=parts.join(' · ');card.append(fields);
 const next=t.intake_details?.next_action;if(typeof next==='string'&&next.trim())card.append(el('p',next,'today-next'));
 if(viewData?.canEdit){
   const edit=el('button','Edit task','button today-edit-trigger');edit.type='button';
   edit.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('ops-today-edit',{detail:{task:t}})));
   card.append(edit);
 }
 return card;
}
function group(host,label,rows,empty,max=8){
 const section=el('section',null,'today-group');section.append(el('h4',label+' ('+rows.length+')'));
 if(!rows.length)section.append(el('p',empty,'today-muted'));
 else{
  for(const row of rows.slice(0,max))section.append(taskRow(row));
  if(rows.length>max)section.append(el('p',(rows.length-max)+' more. Open Tasks to review the full list.','today-muted'));
 }
 host.append(section);
}
function render(data){
 viewData=data;window.dispatchEvent(new CustomEvent('ops-today-data',{detail:data}));
 const tasks=M.classify(data.tasks),leases=M.expiring(data.renewals);
 const byId=(list)=>new Map(list.map(v=>[v.id,v]));
 const properties=byId(data.properties),units=byId(data.units);
 const numbers=[['Overdue',tasks.overdue.length],['Due today',tasks.today.length],['Open · no date',tasks.undated.length],['Waiting / blocked',tasks.waiting.length],['Lease ends ≤45d',leases.length]];
 const kpis=$('today-kpis');kpis.replaceChildren();
 const metrics=['overdue','today','undated','waiting','leases'];
 const symbols=['<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>','<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16m-11 5h6"/>','<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>','<circle cx="12" cy="12" r="9"/><path d="M9 8v8m6-8v8"/>','<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>'];
 numbers.forEach(([label,number],i)=>{const panel=el('div',null,'today-kpi'),icon=el('span',null,'metric-symbol');panel.dataset.metric=metrics[i];icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+symbols[i]+'</svg>';panel.append(el('strong',number),el('span',label),icon);kpis.append(panel)});
 renderSchedule(tasks);
 const queue=$('today-queue');queue.replaceChildren();
 const today=M.today(),end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const week=end.toISOString().slice(0,10);
 const soon=tasks.upcoming.filter(t=>t.schedule.date<=week);
 group(queue,'Overdue',tasks.overdue,'No recorded overdue tasks');
 group(queue,'Due today',tasks.today,'No recorded deadlines today');
 group(queue,'Next 7 days',soon,'No deadlines recorded in the next 7 days');
 group(queue,'Undated active tasks',tasks.undated,'All open tasks have dates recorded',1000);
 const renew=$('today-renewals');renew.replaceChildren();
 if(!leases.length)renew.append(el('p','No applicable recorded lease-end dates within the next 45 days.','today-muted'));
 for(const r of leases.slice(0,10)){
  const unit=units.get(r.unit_id),prop=properties.get(r.property_id||unit?.property_id);
  const location=[prop?.street_address,unit?.unit_label&&unit.unit_label!=='MAIN'?unit.unit_label:null].filter(Boolean).join(' · ');
  const row=el('article',null,'today-lease');
  row.append(el('strong',location||r.oak_record_id||'Renewal case'));
  row.append(el('span','Recorded end: '+dateLabel(r.recorded_end),'today-task-meta'));
  if(r.oak_record_id)row.append(el('span','Record: '+r.oak_record_id,'today-task-meta'));
  renew.append(row);
 }
 if(leases.length>10)renew.append(el('p',(leases.length-10)+' more cases. Open Track renewals for the full list.','today-muted'));
 text('today-status','Updated · '+tasks.all.length+' active task'+(tasks.all.length===1?'':'s'));
}
async function refresh(){
 if(!cloud.user){clear();return}
 $('today-signin').hidden=true;
 const ticket=++generation;busy=true;$('today-refresh').disabled=true;
 text('today-status','Loading tasks…');
 resetSchedule('Loading the task breakdown…');
 try{
  const [tasks,renewals,properties,units,leases,memberships]=await Promise.all([
   cloud.api('/rest/v1/ops_tasks?select=id,task_title,status,priority,due_at,intake_details,assigned_label,assigned_user_id,property_id,unit_id,lease_id,renewal_case_id,notes,workflow_key,updated_at,archived_at&limit=1000'),
   cloud.api('/rest/v1/renewal_cases?select=id,property_id,unit_id,lease_id,oak_record_id,recorded_end,is_applicable&limit=1000'),
   cloud.api('/rest/v1/properties?select=id,street_address&limit=1000'),
   cloud.api('/rest/v1/units?select=id,property_id,unit_label&limit=1000'),
   cloud.api('/rest/v1/leases?select=id,unit_id,lease_label,term_start,term_end,lease_status&limit=1000'),
   cloud.api('/rest/v1/staff_memberships?select=user_id,role,is_active&limit=10')
  ]);
  if(ticket!==generation||!cloud.user)return;
  if(![tasks,renewals,properties,units,leases,memberships].every(Array.isArray))throw Error('Unexpected dashboard data format');
  const canEdit=memberships.some(m=>m.is_active&&['admin','editor'].includes(m.role)&&m.user_id===cloud.user.id);
  render({tasks,renewals,properties,units,leases,canEdit});
 }catch(error){
  if(ticket!==generation)return;
  viewData=null;window.dispatchEvent(new CustomEvent('ops-today-data',{detail:null}));$('today-kpis').replaceChildren();$('today-queue').replaceChildren();$('today-renewals').replaceChildren();
  text('today-status','Could not load the dashboard: '+error.message+'. No tasks were changed.');
  resetSchedule('Task breakdown unavailable.');
 }finally{if(ticket===generation){busy=false;$('today-refresh').disabled=!cloud.user}}
}
document.querySelectorAll('[data-today-go]').forEach(button=>button.addEventListener('click',()=>{const target=button.dataset.todayGo;document.querySelector('[data-workspace="'+target+'"]')?.click();if(target==='leases')document.getElementById('lease-tab-prepare')?.click()}));
$('today-signin').addEventListener('click',()=>document.getElementById('account-button')?.click());
$('today-refresh').addEventListener('click',()=>{if(!busy)refresh()});
$('today-open-tasks').addEventListener('click',()=>document.querySelector('[data-workspace="tasks"]')?.click());
$('today-open-renewals').addEventListener('click',()=>document.querySelector('[data-workspace="leases"]')?.click());
window.addEventListener('ops-today-show',()=>{if(!busy)refresh()});
window.addEventListener('ops-today-refresh',()=>{if(!busy)refresh()});
window.addEventListener('ops-auth-change',e=>{if(!e.detail?.user)clear();else if(!$('today-workflow').hidden)refresh()});
clear();
})();