/* Today dashboard v1: read-only, RLS-protected portfolio overview. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsTodayModel,$=id=>document.getElementById(id);
if(!cloud||!M||!$('today-workflow'))return;
let generation=0,busy=false;
const el=(tag,value,klass)=>{const x=document.createElement(tag);if(value!=null)x.textContent=String(value);if(klass)x.className=klass;return x};
const text=(id,value)=>{$(id).textContent=value};
const dateLabel=value=>{if(!M.validDate(value))return 'Date not recorded';return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))};
function clear(){generation++;busy=false;$('today-signin').hidden=!!cloud.user;text('today-status','Sign in to view private task and renewal information.');$('today-kpis').replaceChildren();$('today-queue').replaceChildren();$('today-renewals').replaceChildren();$('today-refresh').disabled=!cloud.user;}
function taskRow(t){const card=el('article',null,'today-task');card.append(el('strong',t.task_title||'Untitled task'));
 const fields=el('div',null,'today-task-meta');
 const parts=[String(t.status||'pending'),String(t.priority||'normal')+' priority'];
 if(t.schedule)parts.push(t.schedule.type+' · '+dateLabel(t.schedule.date));
 else parts.push('No date assigned');
 if(t.assigned_label)parts.push('Assigned: '+t.assigned_label);
 fields.textContent=parts.join(' · ');card.append(fields);
 const next=t.intake_details?.next_action;if(typeof next==='string'&&next.trim())card.append(el('p',next,'today-next'));
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
 const tasks=M.classify(data.tasks),leases=M.expiring(data.renewals);
 const byId=(list)=>new Map(list.map(v=>[v.id,v]));
 const properties=byId(data.properties),units=byId(data.units);
 const numbers=[['Overdue',tasks.overdue.length],['Due today',tasks.today.length],['Open · no date',tasks.undated.length],['Waiting / blocked',tasks.waiting.length],['Lease ends ≤45d',leases.length]];
 const kpis=$('today-kpis');kpis.replaceChildren();
 for(const [label,number] of numbers){const panel=el('div',null,'today-kpi');panel.append(el('strong',number),el('span',label));kpis.append(panel)}
 const queue=$('today-queue');queue.replaceChildren();
 const today=M.today(),end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);const week=end.toISOString().slice(0,10);
 const soon=tasks.upcoming.filter(t=>t.schedule.date<=week);
 group(queue,'Overdue',tasks.overdue,'No recorded overdue tasks');
 group(queue,'Due today',tasks.today,'No recorded deadlines today');
 group(queue,'Next 7 days',soon,'No deadlines recorded in the next 7 days');
 group(queue,'Undated active tasks',tasks.undated,'All open tasks have dates recorded',10);
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
 text('today-status','Live staff records · Louisville date: '+dateLabel(today)+' · '+tasks.all.length+' active, unarchived tasks. Refresh to check for updates.');
}
async function refresh(){
 if(!cloud.user){clear();return}
 $('today-signin').hidden=true;
 const ticket=++generation;busy=true;$('today-refresh').disabled=true;
 text('today-status','Loading protected task and renewal records…');
 try{
  const [tasks,renewals,properties,units]=await Promise.all([
   cloud.api('/rest/v1/ops_tasks?select=id,task_title,status,priority,due_at,intake_details,assigned_label,property_id,unit_id,archived_at&limit=1000'),
   cloud.api('/rest/v1/renewal_cases?select=id,property_id,unit_id,oak_record_id,recorded_end,is_applicable&limit=1000'),
   cloud.api('/rest/v1/properties?select=id,street_address&limit=1000'),
   cloud.api('/rest/v1/units?select=id,property_id,unit_label&limit=1000')
  ]);
  if(ticket!==generation||!cloud.user)return;
  if(![tasks,renewals,properties,units].every(Array.isArray))throw Error('Unexpected dashboard data format');
  render({tasks,renewals,properties,units});
 }catch(error){
  if(ticket!==generation)return;
  $('today-kpis').replaceChildren();$('today-queue').replaceChildren();$('today-renewals').replaceChildren();
  text('today-status','Could not load the dashboard: '+error.message+'. No tasks were changed.');
 }finally{if(ticket===generation){busy=false;$('today-refresh').disabled=!cloud.user}}
}
$('today-signin').addEventListener('click',()=>document.getElementById('account-button')?.click());
$('today-refresh').addEventListener('click',()=>{if(!busy)refresh()});
$('today-open-tasks').addEventListener('click',()=>document.querySelector('[data-workspace="tasks"]')?.click());
$('today-open-renewals').addEventListener('click',()=>document.querySelector('[data-workspace="leases"]')?.click());
window.addEventListener('ops-today-show',()=>{if(!busy)refresh()});
window.addEventListener('ops-auth-change',e=>{if(!e.detail?.user)clear();else if(!$('today-workflow').hidden)refresh()});
clear();
})();