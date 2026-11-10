/* EOD uses explicitly attributed personal work; do not credit another staff member's completion. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;if(root)root.OpsEodModel=model;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ZONE='America/New_York',DEFAULT_PERFORMER='Huzy';
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 function localDate(value){const at=new Date(value);if(!value||!Number.isFinite(at.getTime()))return null;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at).map(p=>[p.type,p.value]));return [parts.year,parts.month,parts.day].join('-');}
 const number=n=>String(Number(n.toFixed(2)));
 const trim=s=>typeof s==='string'?s.trim():'';
 function personalCompletion(task,date,performer=DEFAULT_PERFORMER){
  const entry=task?.intake_details?.eod;
  return !!(task&&task.status==='completed'&&!task.archived_at&&validDate(date)&&entry&&entry.completed_by===performer&&entry.work_date===date);
 }
 const list=value=>Array.isArray(value)?value.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()).slice(0,100):[];
 function build(events,tasks,date,{includeTime=false,performer=DEFAULT_PERFORMER,nextDayPriorities=[],pending=[],updates=[]}={}){
  if(!validDate(date))throw Error('Choose a valid work date.');
  if(!Array.isArray(events)||!Array.isArray(tasks))throw Error('Unexpected report data.');
  if(events.length>=1000||tasks.length>=1000)throw Error('The report reached its 1,000-record limit. No partial report was generated.');
  if(!trim(performer))throw Error('Report performer is required.');
  const completed=tasks.filter(t=>personalCompletion(t,date,performer));
  const taskIds=new Set(completed.map(t=>t.id).filter(Boolean));
  const seen=new Set(),work=[];let reported=0,estimated=0,unknown=0;
  for(const event of events){
   if(event?.event_type!=='task_work_recorded')continue;
   const a=event.event_metadata?.activity;
   // Existing generic journals have no verified performer: never attribute them silently.
   if(!a||a.completed_by!==performer)continue;
   if(!validDate(a.work_date))throw Error('A personal work entry has an invalid work date.');
   if(a.work_date!==date)continue;
   if(!event.id||seen.has(event.id))throw Error('Duplicate or missing work entry identity.');seen.add(event.id);
   if(!trim(a.summary))throw Error('A saved personal work entry has no summary.');
   if((a.duration_basis==='not_provided'||a.duration_basis==null)&&a.minutes==null){unknown++;work.push({...a,task_id:event.entity_id||null});continue;}
   if(!['reported','user_estimate'].includes(a.duration_basis)||typeof a.minutes!=='number'||!Number.isFinite(a.minutes)||a.minutes<0||a.minutes>1440)throw Error('A saved personal work entry has an invalid duration.');
   if(a.duration_basis==='user_estimate')estimated+=a.minutes;else reported+=a.minutes;
   work.push({...a,task_id:event.entity_id||null});
  }
  const dateLabel=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  const subject='Daily Task Status / Update – '+dateLabel;
  const lines=['Subject: '+subject,'','Hey Leslie,','','Please find my end-of-day update based on today’s tasks completed, and follow-ups.','','Today’s Focus & Completed Work',''];
  const rows=completed.map(t=>{
   const e=t.intake_details.eod;
   return {label:trim(e.label)||trim(t.task_title)||'Completed action',summary:trim(e.summary)||trim(t.intake_details.completion_summary)};
  });
  for(const a of work)if(!a.task_id||!taskIds.has(a.task_id))rows.push({label:trim(a.label),summary:trim(a.summary),work:a});
  if(!rows.length)lines.push('- No personal completed work recorded for this date.');
  for(const item of rows){
   const body=(item.label?item.label+': ':'')+(item.summary||'Completion recorded; details not provided.');
   const time=item.work&&includeTime?' — '+(item.work.minutes==null?'duration not provided':number(item.work.minutes)+' minutes ('+(item.work.duration_basis==='user_estimate'?'estimated by you':'reported')+')'):'';
   lines.push('- '+body+time);
  }
  const priorities=list(nextDayPriorities),pendingList=list(pending),updateList=list(updates);
  lines.push('','Next Day Priorities','');
  if(priorities.length)for(const item of priorities)lines.push('- '+item);
  else lines.push('- N/A');
  lines.push('','Pending - '+(pendingList.length?'':'N/A'));
  for(const item of pendingList)lines.push('- '+item);
  lines.push('','Updates - '+(updateList.length?'':'N/A'));
  for(const item of updateList)lines.push('- '+item);
  if(includeTime){
   lines.push('','Recorded Time','Known recorded time: '+number(reported+estimated)+' minutes',
    'Reported: '+number(reported)+' minutes · Estimated: '+number(estimated)+' minutes · Duration not provided: '+unknown+' entries',
    'Time comes only from saved personal work entries; completed tasks do not add time.');
  }
  const weekend=new Date(date+'T12:00:00Z').getUTCDay()===5;
  lines.push('','I would be happy to clarify or share more details if needed.','','Thank you for your support and guidance and have a wonderful '+(weekend?'weekend!':'day ahead!'));
  return {subject,text:lines.join('\n'),reported,estimated,unknown,workCount:work.length,completedCount:completed.length,actionCount:rows.length};
 }
 return {build,validDate,localDate,personalCompletion,DEFAULT_PERFORMER,ZONE};
});