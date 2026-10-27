/* Deterministic renewal tracker suggestions; no external AI or implicit writes. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsRenewalTrackingRules=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const statuses=[
  ['not_started','Not started'],
  ['preparing','Preparing lease'],
  ['ready_to_send','Ready to send'],
  ['sent_for_signature','Sent for signature'],
  ['awaiting_signatures','Awaiting signatures'],
  ['partially_signed','Partially signed'],
  ['signed','Signed'],
  ['completed','Completed'],
  ['follow_up_needed','Follow-up needed'],
  ['on_hold','On hold'],
  ['month_to_month','Month-to-month'],
  ['declined','Declined']
 ];
 const label=value=>statuses.find(row=>row[0]===value)?.[1]||'Not tracked in Ops';
 const valid=value=>statuses.some(row=>row[0]===value);
 function infer(input){
  const text=String(input||'').trim().replace(/\s+/g,' ').slice(0,500);
  if(!text)return null;
  const t=text.toLowerCase();
  // Never infer a positive action from a negation, planned action or quoted uncertainty.
  if(/\b(?:not|never|didn'?t|haven'?t|hasn'?t|wasn'?t|isn'?t|weren'?t)\b.{0,30}\b(?:sent|signed|finished|completed|renewed)\b/.test(t))return null;
  if(/\b(?:might|maybe|possibly|if)\b.{0,30}\b(?:sent|signed|completed)\b/.test(t))return null;
  if(/\b(?:declined|rejected|refused|not renew(?:ing)?|won'?t renew)\b/.test(t))return {status:'declined',nextAction:'Confirm move-out and follow-up steps.'};
  if(/\b(?:hold|paused?|waiting on decision|postponed|delay(?:ed)?)\b/.test(t))return {status:'on_hold',nextAction:'Review reason for hold and follow up.'};
  if(/\b(?:partially signed|one tenant signed|some tenants signed|one signature received|still needs? (?:to )?sign|remaining signatures?)\b/.test(t))return {status:'partially_signed',nextAction:'Follow up on outstanding signatures.'};
  if(/\b(?:all (?:parties|tenants) signed|fully signed|executed|both signed|lease signed|renewal signed|signed lease)\b/.test(t))return {status:'signed',nextAction:'Verify landlord signature and update lease system before completion.'};
  if(/\b(?:completed|all done|finalized|fully processed|closed out)\b/.test(t))return {status:'completed',nextAction:'None'};
  if(/\b(?:month.to.month|m2m)\b/.test(t))return {status:'month_to_month',nextAction:'Confirm month-to-month terms are recorded.'};
  if(/\b(?:sent|emailed|forwarded|issued|dispatched|submitted)\b/.test(t)&&/\b(?:lease|renewal|contract|agreement|sign(?:ature|ing)?|e.?sign)\b/.test(t)){
   return {status:'sent_for_signature',nextAction:'Follow up on signatures.'};
  }
  if(/\b(?:awaiting|waiting for|pending)\b.{0,35}\b(?:signatures?|signing|tenant)\b/.test(t))return {status:'awaiting_signatures',nextAction:'Check pending signatures.'};
  if(/\b(?:ready to send|need to send|will send|send (?:the )?lease|prepare to send)\b/.test(t))return {status:'ready_to_send',nextAction:'Send renewal for signature.'};
  if(/\b(?:draft|prepar(?:ing|ed)|generat(?:ing|ed)|creat(?:ing|ed))\b/.test(t))return {status:'preparing',nextAction:'Review terms and prepare lease.'};
  if(/\b(?:follow.?up|remind|contact|call|texted|reached out|waiting for (?:reply|response)|no response)\b/.test(t))return {status:'follow_up_needed',nextAction:'Follow up with tenant or responsible party.'};
  return null;
 }
 function eventsFor(rows,caseId){
  return (Array.isArray(rows)?rows:[]).filter(r=>r.entity_type==='renewal_case'&&r.entity_id===caseId&&r.event_type==='renewal_progress_updated').sort((a,b)=>String(b.occurred_at||'').localeCompare(String(a.occurred_at||''))||String(b.id).localeCompare(String(a.id)));
 }
 function latest(rows,caseId){return eventsFor(rows,caseId)[0]||null}
 function snapshot(event){
  const m=event?.event_metadata;
  return m&&typeof m==='object'&&valid(m.status)?{status:m.status,nextAction:String(m.next_action||''),note:String(m.note||''),message:String(m.message||''),occurredAt:event.occurred_at,id:event.id}:null;
 }
 function eventPayload(caseId,actorId,values,priorId){
  if(!/^[0-9a-f-]{36}$/i.test(caseId)||!/^[0-9a-f-]{36}$/i.test(actorId))throw Error('Invalid renewal or staff identity.');
  if(!valid(values.status))throw Error('Select a valid renewal status.');
  const msg=String(values.message||'').trim(),note=String(values.note||'').trim(),next=String(values.nextAction||'').trim();
  if(msg.length>500||note.length>2000||next.length>500)throw Error('Update exceeds the allowed length.');
  if(!msg&&!note&&!next)throw Error('Enter an update, next action, or note.');
  return {entity_type:'renewal_case',entity_id:caseId,event_type:'renewal_progress_updated',actor_id:actorId,
   summary:msg||('Manual update: '+label(values.status)),event_metadata:{version:1,status:values.status,next_action:next,note:note||null,message:msg||null,previous_event_id:priorId||null}};
 }
 return Object.freeze({statuses,label,valid,infer,eventsFor,latest,snapshot,eventPayload});
});
