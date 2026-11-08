/* Pure work-level and attention projections. Never create dates, tasks or relationships. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsWorkstationModel=api;
})(typeof window!=='undefined'?window:null,function(T){
 'use strict';
 const labels=Object.freeze({general:'General operations',renewal:'Renewal tasks',maintenance:'Maintenance',accounting:'Accounting',notices:'Notices',documents:'Documents',leasing:'Leasing'});
 const normalize=x=>String(x||'').trim().slice(0,90);
 const isWaiting=t=>['waiting','blocked'].includes(String(t.status||'').toLowerCase());
 const priority=t=>({urgent:0,high:1,normal:2,low:3})[String(t.priority||'normal').toLowerCase()]??2;
 function level(task){
  const raw=task?.intake_details?.work_level;
  const key=normalize(typeof raw==='string'?raw:raw&&typeof raw==='object'?raw.id:null);
  const explicit=normalize(task?.intake_details?.work_level_label||raw&&typeof raw==='object'&&raw.label);
  if(key)return {key,label:explicit||key};
  const workflow=normalize(task?.workflow_key)||'general';
  return {key:'workflow:'+workflow,label:labels[workflow]||workflow.replaceAll('_',' ')};
 }
 function risk(task,ref){
  if(task.schedule?.date&&task.schedule.date<ref)return 0;
  if(String(task.priority).toLowerCase()==='urgent')return 1;
  if(task.schedule?.date===ref)return 2;
  if(String(task.priority).toLowerCase()==='high')return 3;
  if(isWaiting(task))return 5;
  if(task.schedule?.date)return 4;
  return 6;
 }
 function compare(a,b,ref){
  return risk(a,ref)-risk(b,ref)||priority(a)-priority(b)||
   String(a.schedule?.date||'9999').localeCompare(String(b.schedule?.date||'9999'))||
   String(a.task_title||'').localeCompare(String(b.task_title||''))||String(a.id).localeCompare(String(b.id));
 }
 function project(tasks,reference=T.today()){
  const ref=T.validDate(reference)?reference:T.today(),classed=T.classify(tasks,ref),groups=new Map();
  for(const row of [...classed.all,...classed.completed]){
   const l=level(row);
   if(!groups.has(l.key))groups.set(l.key,{key:l.key,label:l.label,open:[],done:[],waiting:[],urgent:[]});
   const g=groups.get(l.key);
   if(['completed','done','closed','cancelled','canceled','declined'].includes(String(row.status).toLowerCase())){g.done.push(row);continue}
   g.open.push(row);
   if(isWaiting(row))g.waiting.push(row);
   if(row.schedule?.date<ref||String(row.priority||'').toLowerCase()==='urgent')g.urgent.push(row);
  }
  const result=[...groups.values()].map(g=>({...g,open:g.open.sort((a,b)=>compare(a,b,ref))})).
   sort((a,b)=>Number(!a.open.length)-Number(!b.open.length)||
    compare(a.open[0]||{task_title:a.label},b.open[0]||{task_title:b.label},ref)||a.label.localeCompare(b.label));
  const alerts=classed.all.filter(t=>t.schedule?.date<ref||t.schedule?.date===ref||String(t.priority||'').toLowerCase()==='urgent')
   .sort((a,b)=>compare(a,b,ref));
  return {levels:result,alerts,urgent:classed.all.filter(t=>t.schedule?.date<ref||String(t.priority||'').toLowerCase()==='urgent').length,
   inProgress:classed.all.filter(t=>String(t.status)==='in_progress').length,
   waiting:classed.waiting.length,active:classed.all.length,completed:classed.completed.length};
 }
 function focus(projected,key){
  const chosen=projected.levels.find(l=>l.key===key&&l.open.length);
  const preferred=chosen||projected.levels.find(l=>l.open.length);
  return {level:preferred||null,task:preferred?.open.find(t=>!isWaiting(t))||preferred?.open[0]||null};
 }
 function watch(renewals,reference=T.today()){
  const rows=Array.isArray(renewals)?renewals.filter(x=>x&&x.is_applicable!==false):[];
  const soon=T.expiring(rows,reference);
  const pending=rows.filter(r=>String(r.action_status||'').toLowerCase()==='pending');
  return {soon,pendingCount:pending.length,total:rows.length};
 }
 return Object.freeze({level,project,focus,watch,isWaiting});
});