/* SOD email composition from reviewed, in-memory daily plan. No database or email writes. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsSodModel=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const CONSTANTS=Object.freeze([
  Object.freeze({id:'tenant',text:'Tenant Communications: Review outstanding messages and respond to tenant requests and payment-related inquiries.'}),
  Object.freeze({id:'rei',text:'REI Hub – Import Feed: Review pending transactions and process those ready to be categorized or booked.'}),
  Object.freeze({id:'leasing',text:'Leasing & Maintenance: Follow up on outstanding maintenance requests and active rental inquiries.'})
 ]);
 const CLOSED=new Set(['completed','cancelled','canceled','closed','done','declined']);
 const PRIORITY={urgent:0,high:1,normal:2,low:3};
 const bound=(text,label,max=1000)=>{
  if(typeof text!=='string'||!text.trim()||text.trim().length>max||/[\r\n]/.test(text))
   throw Error(label+' must be a single nonempty line of at most '+max+' characters');
  return text.trim();
 };
 function splitLine(value){
  const line=bound(value,'Priority',1100),at=line.indexOf(':');
  if(at<1||at===line.length-1)throw Error('Use the format Title: next action for every priority');
  return {subject:bound(line.slice(0,at),'Priority title',220),
   action:bound(line.slice(at+1),'Priority action',820)};
 }
 function parseExtras(value){
  if(typeof value!=='string'||value.length>14000)throw Error('Manual priorities are too long');
  const entries=value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(entries.length>20)throw Error('Limit the SOD to 20 manual priorities');
  return entries.map(splitLine);
 }
 function eligible(task){
  return !!task&&typeof task.id==='string'&&task.id.length>0&&!task.archived_at&&!CLOSED.has(String(task.status||'').toLowerCase());
 }
 function candidates(tasks){
  return (Array.isArray(tasks)?tasks:[]).filter(eligible).slice().sort((a,b)=>{
    const pa=PRIORITY[String(a.priority||'normal').toLowerCase()]??2,pb=PRIORITY[String(b.priority||'normal').toLowerCase()]??2;
    return pa-pb||String(a.task_title||'').localeCompare(String(b.task_title||''))||a.id.localeCompare(b.id);
  });
 }
 function fromTask(task){
  if(!eligible(task))throw Error('This task is no longer available for the morning plan');
  const title=bound(task.task_title||'','Saved task title',220);
  const action=typeof task.intake_details?.next_action==='string'?task.intake_details.next_action.trim():'';
  return {id:task.id,code:task.task_code||'',subject:title,action};
 }
 function compose(options){
  const input=options&&typeof options==='object'?options:{};
  const greeting=input.greeting==='weekend'?'Hope you had a good weekend!':input.greeting==='normal'?"Hope you're doing well!":null;
  if(!greeting)throw Error('Choose one greeting before generating the SOD');
  const tasks=Array.isArray(input.selected)?input.selected:[];
  if(tasks.length>30)throw Error('Too many selected tasks');
  const used=new Set(),specific=[];
  function add(subject,action){
    subject=bound(subject,'Priority title',220);
    action=bound(action,'Priority action',820);
    const key=subject.toLocaleLowerCase('en-US');
    if(used.has(key))throw Error('Repeated priority: '+subject);
    used.add(key);
    specific.push(subject+': '+action);
  }
  for(const row of tasks){
    if(!row||!row.id)throw Error('Selected task must have a saved task ID');
    add(row.subject,row.action);
  }
  for(const row of parseExtras(input.extras||''))add(row.subject,row.action);
  const constants=Array.isArray(input.constants)?input.constants:[];
  if(constants.length>CONSTANTS.length)throw Error('Too many recurring sections');
  const valid=new Set(CONSTANTS.map(x=>x.id)),seen=new Set();
  const recurring=[];
  for(const row of constants){
    if(!row||!valid.has(row.id)||seen.has(row.id))throw Error('Invalid recurring section');
    seen.add(row.id);
    const p=splitLine(row.text);
    if(used.has(p.subject.toLocaleLowerCase('en-US')))throw Error('A priority repeats the recurring section '+p.subject);
    recurring.push(p.subject+': '+p.action);
  }
  if(!specific.length&&!recurring.length)throw Error('Add at least one priority or recurring responsibility');
  return {
    text:'Good Morning Leslie,\n\n'+greeting+'\n\nHere are my priorities for today:\n\n'+
       [...specific,...recurring].join('\n')+'\n\nThank you!',
    specificCount:specific.length,recurringCount:recurring.length
  };
 }
 return Object.freeze({CONSTANTS,eligible,candidates,fromTask,parseExtras,compose});
});
