/* Oaktown Ops Today: pure, read-only dashboard classification.
   Never create a deadline or automatically change a record. Dates are
   interpreted in the Kentucky office timezone (America/New_York). */
(function(root,factory){
 'use strict';
 const model=factory();
 if(typeof module==='object'&&module.exports)module.exports=model;
 if(root)root.OpsTodayModel=model;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ZONE='America/New_York',iso=/^\d{4}-\d{2}-\d{2}$/;
 const terminal=new Set(['completed','cancelled','canceled','closed','done','declined']);
 const today=(at=new Date())=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return [v.year,v.month,v.day].join('-');
 };
 const validDate=value=>typeof value==='string'&&iso.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 const dateFromInstant=value=>{
  if(typeof value!=='string'||!value.trim())return null;
  const d=new Date(value);return Number.isNaN(d.getTime())?null:today(d);
 };
 function scheduled(task){
  const details=task?.intake_details||{};
  const options=[];
  const dueInstant=dateFromInstant(task?.due_at);
  if(dueInstant)options.push({date:dueInstant,type:'Due'});
  if(validDate(details?.due?.date))options.push({date:details.due.date,type:'Due (date only)'});
  if(validDate(details?.follow_up?.date))options.push({date:details.follow_up.date,type:'Follow-up'});
  options.sort((a,b)=>a.date.localeCompare(b.date));
  return options[0]||null;
 }
 function classify(tasks,reference=today()){
  const date=validDate(reference)?reference:today();
  const result={overdue:[],today:[],upcoming:[],undated:[],waiting:[],completed:[],all:[]};
  for(const task of Array.isArray(tasks)?tasks:[]){
   if(!task||task.archived_at)continue;
   if(terminal.has(String(task.status||'').toLowerCase())){result.completed.push(task);continue;}
   const schedule=scheduled(task);
   const row={...task,schedule};
   result.all.push(row);
   if(['waiting','blocked'].includes(task.status))result.waiting.push(row);
   if(!schedule){result.undated.push(row);continue;}
   if(schedule.date<date)result.overdue.push(row);
   else if(schedule.date===date)result.today.push(row);
   else result.upcoming.push(row);
  }
  const order=(a,b)=>{
   const importance={urgent:0,high:1,normal:2,low:3};
   const pa=importance[String(a.priority||'normal').toLowerCase()]??2;
   const pb=importance[String(b.priority||'normal').toLowerCase()]??2;
   return pa-pb||String(a.task_title||'').localeCompare(String(b.task_title||''));
  };
  for(const k of ['overdue','today','undated','waiting'])result[k].sort(order);
  result.upcoming.sort((a,b)=>a.schedule.date.localeCompare(b.schedule.date)||order(a,b));
  return result;
 }
 function expiring(renewals,reference=today(),days=45){
  const start=validDate(reference)?reference:today();
  const endDate=new Date(start+'T12:00:00Z');endDate.setUTCDate(endDate.getUTCDate()+days);
  const end=endDate.toISOString().slice(0,10);
  return (Array.isArray(renewals)?renewals:[])
   .filter(r=>r&&r.is_applicable!==false&&validDate(r.recorded_end)&&r.recorded_end>=start&&r.recorded_end<=end)
   .sort((a,b)=>a.recorded_end.localeCompare(b.recorded_end)||String(a.oak_record_id||'').localeCompare(String(b.oak_record_id||'')));
 }
 return Object.freeze({ZONE,today,validDate,scheduled,classify,expiring});
});