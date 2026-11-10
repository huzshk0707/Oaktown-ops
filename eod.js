/* Read-only EOD export. Reports stay in memory until copied or downloaded. */
(()=>{'use strict';
 const cloud=window.OpsCloud,M=window.OpsEodModel,$=id=>document.getElementById(id);
 let epoch=0,busy=false,report='';
 const status=text=>{$('eod-status').textContent=text};
 function controls(){const locked=!cloud.user;$('eod-date').disabled=locked;$('eod-include-time').disabled=locked;$('eod-generate').disabled=locked||busy;$('eod-copy').disabled=locked||!report;$('eod-download').disabled=locked||!report;}
 function clear(){epoch++;busy=false;report='';$('eod-report').textContent='';$('eod-report').hidden=true;controls();}
 function dateDefault(){if(!$('eod-date').value)$('eod-date').value=window.OpsTodayModel.today();}
 $('eod-date').addEventListener('change',()=>{clear();status('Generate a report for the selected Eastern work date.');});
 $('eod-include-time').addEventListener('change',()=>{clear();status('Generate the report to apply your time preference.');});
 $('eod-generate').addEventListener('click',async()=>{
  if(busy||!cloud.user)return;
  clear();const date=$('eod-date').value,ticket=epoch;
  if(!M.validDate(date)){status('Choose a valid work date.');return;}
  busy=true;controls();status('Loading work attributed to Huzy…');
  try{
   const eventsQuery=new URLSearchParams({select:'id,entity_id,event_type,event_metadata,occurred_at',event_type:'eq.task_work_recorded','event_metadata->activity->>work_date':'eq.'+date,order:'occurred_at.asc,id.asc',limit:'1001'});
   // Work date is the explicitly recorded Eastern work day, not the day an
   // imported completion was entered. Filter verified performer in the model.
   const tasksQuery=new URLSearchParams({select:'id,task_title,status,intake_details,completed_at,archived_at',status:'eq.completed',order:'completed_at.desc,id.desc',limit:'1001'});
   const [events,tasks]=await Promise.all([cloud.api('/rest/v1/ops_events?'+eventsQuery),cloud.api('/rest/v1/ops_tasks?'+tasksQuery)]);
   if(ticket!==epoch||!cloud.user)return;
   const result=M.build(events,tasks,date,{includeTime:$('eod-include-time').checked});report=result.text;$('eod-report').textContent=report;$('eod-report').hidden=false;
   status(result.actionCount+' personal completed '+(result.actionCount===1?'action':'actions')+' · '+result.completedCount+' attributed completed tasks. Review before sending.');
  }catch(error){if(ticket===epoch)status('Could not generate the report: '+error.message);}
  finally{if(ticket===epoch){busy=false;controls();}}
 });
 $('eod-copy').addEventListener('click',async()=>{
  if(!report||!cloud.user)return;const ticket=epoch;
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(report);if(ticket===epoch)status('Report copied.');}
  catch{if(ticket!==epoch)return;const range=document.createRange();range.selectNodeContents($('eod-report'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('eod-report').focus();status('Report selected. Use your browser’s Copy command.');}
 });
 $('eod-download').addEventListener('click',()=>{
  if(!report||!cloud.user)return;const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download='oaktown-eod-'+$('eod-date').value+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 window.addEventListener('ops-auth-change',()=>{clear();dateDefault();status(cloud.user?'Choose an Eastern work date and generate your report.':'Sign in to generate your work report.');});
 window.addEventListener('ops-today-show',()=>{clear();dateDefault();status(cloud.user?'Choose an Eastern work date and generate your report.':'Sign in to generate your work report.');});
 dateDefault();clear();
})();
