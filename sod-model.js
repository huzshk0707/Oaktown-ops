/* SOD email composition from reviewed, in-memory daily plan. No database or email writes. */
(function(root,factory){
 'use strict';
 const dates=typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel;
 const api=factory(dates);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsSodModel=api;
})(typeof window!=='undefined'?window:null,function(T){
 'use strict';
 const CONSTANTS=Object.freeze([
  Object.freeze({id:'tenant',text:'Tenant Communications: Review outstanding messages and respond to tenant requests and payment-related inquiries.'}),
  Object.freeze({id:'rei',text:'REI Hub – Import Feed: Review pending transactions and process those ready to be categorized or booked.'}),
  Object.freeze({id:'leasing',text:'Maintenance & Leasing: Follow up on outstanding maintenance requests and active inquiries.'})
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
  if(!T.validDate(input.workDate))throw Error('A valid Louisville work date is required');
  const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(input.workDate+'T12:00:00Z'));
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
    text:'Good Morning Leslie,\n\n'+greeting+"\n\nI'm getting started for the day. My priorities today are:\n\n"+
       [...specific,...recurring].map(line=>'- '+line).join('\n')+
       "\n\nPlease let me know if there's anything else you'd like me to prioritize today.\n\n"+
       'Thank you, and wishing you a wonderful '+weekday+'!',
    specificCount:specific.length,recurringCount:recurring.length
  };
 }
 function composeReviewed(input){
  if(!T.validDate(input.workDate)||!['normal','weekend'].includes(input.greeting))throw Error('Choose a valid work date and greeting.');
  const groups=new Map(),sources=input.sources||{},rows=input.rows||[];
  if(rows.length>50)throw Error('Keep the reviewed plan to 50 selected items.');
  const seen=new Set();
  for(const row of rows){
   if(!row.id||seen.has(row.id)||!['task','planning'].includes(row.type)||!Object.hasOwn(sources,row.sourceId))throw Error('Every reviewed item needs a distinct identity and source.');
   seen.add(row.id);const subject=bound(row.subject,'Priority title',220),action=bound(row.action,'Priority action',820),section=bound(row.section,'Section',80);
   if(!groups.has(section))groups.set(section,[]);
   groups.get(section).push('- '+subject+': '+action+' ['+(row.type==='task'?'Saved task':'Manual source')+' · '+sources[row.sourceId].label+']');
  }
  for(const [i,row] of parseExtras(input.extras||'').entries()){
   if(!groups.has('Additional work'))groups.set('Additional work',[]);
   groups.get('Additional work').push('- '+row.subject+': '+row.action+' [Manual priority '+(i+1)+']');
  }
  const constants=input.constants||[];
  // Reuse the established validation, greeting and closing rather than a second SOD template.
  const scaffold=compose({workDate:input.workDate,greeting:input.greeting,selected:[],extras:'Morning review: Review the approved daily plan.',constants});
  if(constants.length){if(!groups.has('Additional work'))groups.set('Additional work',[]);for(const row of constants)groups.get('Additional work').push('- '+row.text+' [Recurring planning responsibility]')}
  if(!groups.size)throw Error('Add at least one reviewed priority.');
  const order=['Immediate priorities','Deposits and payments','Property operations','Staff assignments','Pending and blocked','Additional work'];
  const body=order.filter(s=>groups.has(s)).map(s=>s+'\n'+groups.get(s).join('\n')).join('\n\n');
  const start=scaffold.text.indexOf('- Morning review:'),end=scaffold.text.indexOf('\n\nPlease let me know');
  return {text:scaffold.text.slice(0,start)+body+scaffold.text.slice(end),specificCount:rows.length+parseExtras(input.extras||'').length,recurringCount:constants.length};
 }
 return Object.freeze({CONSTANTS,eligible,candidates,fromTask,parseExtras,compose,composeReviewed});
});
