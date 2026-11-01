/* Reports use saved evidence only; no inferred time or task changes. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;if(root)root.OpsEodModel=model;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ZONE='America/New_York';
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 function localDate(value){const at=new Date(value);if(!value||!Number.isFinite(at.getTime()))return null;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at).map(p=>[p.type,p.value]));return [parts.year,parts.month,parts.day].join('-');}
 const number=n=>String(Number(n.toFixed(2)));
 function build(events,tasks,date,{includeTime=false}={}){
  if(!validDate(date))throw Error('Choose a valid work date.');
  if(!Array.isArray(events)||!Array.isArray(tasks))throw Error('Unexpected report data.');
  if(events.length>=1000||tasks.length>=1000)throw Error('The report reached its 1,000-record limit. No partial report was generated.');
  const seen=new Set(),work=[];let reported=0,estimated=0,unknown=0;
  for(const event of events){
   if(event.event_type!=='task_work_recorded')continue;
   const a=event.event_metadata?.activity;
   if(!a||!validDate(a.work_date))throw Error('A saved work entry has an invalid work date.');
   if(a.work_date!==date)continue;
   if(!event.id||seen.has(event.id))throw Error('Duplicate or missing work entry identity.');seen.add(event.id);
   if(typeof a.summary!=='string'||!a.summary.trim())throw Error('A saved work entry has no summary.');
   if(a.duration_basis==='not_provided'&&a.minutes===null){unknown++;work.push({...a,task_id:event.entity_id});continue;}
   if(!['reported','user_estimate'].includes(a.duration_basis)||typeof a.minutes!=='number'||!Number.isFinite(a.minutes)||a.minutes<0||a.minutes>1440)throw Error('A saved work entry has an invalid duration.');
   if(a.duration_basis==='user_estimate')estimated+=a.minutes;else reported+=a.minutes;
   work.push({...a,task_id:event.entity_id});
  }
  const completed=tasks.filter(t=>t.status==='completed'&&localDate(t.completed_at)===date);
  const lines=['Oaktown Ops — EOD work report',date+' · '+ZONE];
  if(completed.length)lines.push('','Completed work');
  for(const t of completed){lines.push('- '+(t.task_title||'Untitled task'));if(t.intake_details?.completion_summary)lines.push('  '+t.intake_details.completion_summary);}
  const displayed=includeTime?work:work.filter(a=>!completed.some(t=>t.id&&t.id===a.task_id));
  if(includeTime||displayed.length||!completed.length)lines.push('',includeTime?'Saved work entries':'Other work recorded');
  if(!work.length&&(!completed.length||includeTime))lines.push('No saved work entries for this date.');
  for(const a of displayed)lines.push('- '+a.summary+(includeTime?' — '+(a.duration_basis==='not_provided'?'duration not provided':number(a.minutes)+' minutes ('+(a.duration_basis==='user_estimate'?'estimated by you':'reported')+')'):''));
  if(includeTime)lines.push('','Known recorded time: '+number(reported+estimated)+' minutes','Reported: '+number(reported)+' minutes · Estimated: '+number(estimated)+' minutes · Duration not provided: '+unknown+' entries');
  if(includeTime)lines.push('','Time comes only from saved work entries; completed tasks do not add time.');
  return {text:lines.join('\n'),reported,estimated,unknown,workCount:work.length,completedCount:completed.length};
 }
 return {build,validDate,ZONE};
});
