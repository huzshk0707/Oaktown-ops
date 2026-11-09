/* Generic recurring reminders; private schedules arrive only through staff RPCs. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsBillRemindersModel=api;})(typeof window!=='undefined'?window:null,function(T){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,pad=n=>String(n).padStart(2,'0');
 const month=s=>T.validDate(s)&&s.endsWith('-01'),text=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\r\n\x00-\x1f]/.test(s);
 const timestamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 const nullableTime=s=>s===null||timestamp(s);
 function validate(data){
  if(!data||!Array.isArray(data.rules)||!Array.isArray(data.occurrences)||typeof data.can_edit!=='boolean'||data.rules.length>100||data.occurrences.length>5000)throw Error('Unexpected reminder records');
  const ids=new Set(),keys=new Set();
  for(const r of data.rules){
   if(!UUID.test(r.id)||ids.has(r.id)||!text(r.label,100)||!text(r.recipient,80)||!text(r.instructions,1000)||!month(r.start_month)||typeof r.active!=='boolean'||!Number.isInteger(r.day_from)||r.day_from<1||!Number.isInteger(r.day_through)||r.day_through<r.day_from||r.day_through>31||!Number.isInteger(r.lead_days)||r.lead_days<0||r.lead_days>14||!['payment','autopay_check'].includes(r.kind))throw Error('Invalid reminder rule');
   ids.add(r.id);
  }
  for(const o of data.occurrences){const key=o.rule_id+'/'+o.period;
   if(!ids.has(o.rule_id)||!month(o.period)||keys.has(key)||!Number.isInteger(o.revision)||o.revision<1||!UUID.test(o.last_event_id)||!['reminded','verified','reopened'].includes(o.last_action)||!nullableTime(o.reminded_at)||!nullableTime(o.verified_at)||!timestamp(o.updated_at)||(o.note!==null&&(typeof o.note!=='string'||o.note.length>500))||(o.last_action==='verified'&&!o.verified_at))throw Error('Invalid reminder confirmation');keys.add(key);
  }
  return data;
 }
 const shift=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10)};
 const day=(period,n)=>{const d=new Date(period+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return period.slice(0,8)+pad(Math.min(n,d.getUTCDate()))};
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 function project(raw,today=T.today()){
  const data=validate(raw);if(!T.validDate(today))throw Error('Invalid work date');
  const current=today.slice(0,7)+'-01',states=new Map(data.occurrences.map(o=>[o.rule_id+'/'+o.period,o])),attention=[],schedule=[];
  for(const rule of data.rules.filter(r=>r.active)){
   let period=rule.start_month,guard=0;
   while(period<=shift(current,1)){
    if(++guard>600)throw Error('Reminder history requires review');
    const from=day(period,rule.day_from),through=day(period,rule.day_through),state=states.get(rule.id+'/'+period)||null;
    const item={rule,period,from,through,state,revision:state?.revision||0,verified:!!state?.verified_at};
    item.phase=item.verified?'verified':today>through?'check':today>=from?'window':'upcoming';
    if(period===current)schedule.push(item);
    if(!item.verified&&today>=addDays(from,-rule.lead_days))attention.push(item);
    period=shift(period,1);
   }
  }
  const sort=(a,b)=>a.from.localeCompare(b.from)||a.rule.label.localeCompare(b.rule.label);attention.sort(sort);schedule.sort(sort);
  return {attention,schedule,current,today,canEdit:data.can_edit};
 }
 const dateLabel=s=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
 const periodLabel=s=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
 const range=item=>dateLabel(item.from)+(item.from===item.through?'':'–'+dateLabel(item.through));
 const priority=item=>item.rule.label+' – '+(item.rule.kind==='autopay_check'?'Autopay check':'Payment reminder')+': Remind '+item.rule.recipient+' for '+range(item)+'. '+item.rule.instructions;
 const message=item=>'Hi '+item.rule.recipient+',\n\n'+(item.rule.kind==='autopay_check'?'Please verify the autopay payment for ':'A reminder about ')+item.rule.label+' ('+range(item)+', '+item.period.slice(0,4)+'). '+item.rule.instructions+'\n\nPlease confirm once checked. Thank you!';
 function matches(receipt,data,request){
  validate(data);const o=data.occurrences.find(x=>x.rule_id===request.p_rule&&x.period===request.p_period);
  return !!o&&!!receipt&&receipt.rule_id===request.p_rule&&receipt.period===request.p_period&&UUID.test(receipt.last_event_id)&&o.last_event_id===receipt.last_event_id&&o.revision===request.p_expected_revision+1&&o.revision===receipt.revision&&o.last_action===request.p_action&&o.last_action===receipt.last_action&&o.updated_at===receipt.updated_at&&o.reminded_at===receipt.reminded_at&&o.verified_at===receipt.verified_at&&o.note===(request.p_note?.trim()||null)&&o.note===receipt.note&&(request.p_action!=='reminded'||!!o.reminded_at)&&(request.p_action!=='reopened'||!o.verified_at);
 }
 function calendar(raw,now=new Date()){
  const data=validate(raw),escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oaktown Ops//Monthly reminders//EN','CALSCALE:GREGORIAN','BEGIN:VTIMEZONE','TZID:America/New_York','BEGIN:DAYLIGHT','DTSTART:20070311T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','TZOFFSETFROM:-0500','TZOFFSETTO:-0400','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:20071104T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','TZOFFSETFROM:-0400','TZOFFSETTO:-0500','END:STANDARD','END:VTIMEZONE'];
  for(const r of data.rules.filter(x=>x.active)){
   const start=day(r.start_month,r.day_from).replace(/-/g,''),days=r.day_from<=28?String(r.day_from):Array.from({length:r.day_from-27},(_,i)=>28+i).join(',');
   lines.push('BEGIN:VEVENT','UID:'+r.id+'@oaktown-ops','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'DTSTART;TZID=America/New_York:'+start+'T090000','DTEND;TZID=America/New_York:'+start+'T091500','RRULE:FREQ=MONTHLY;BYMONTHDAY='+days+(r.day_from>28?';BYSETPOS=-1':''),'SUMMARY:'+escape(r.label+' – '+(r.kind==='autopay_check'?'Verify autopay':'Remind '+r.recipient)),'DESCRIPTION:'+escape('Monthly reminder window: '+r.day_from+(r.day_from===r.day_through?'':'–'+r.day_through)+'. '+r.instructions+' Confirm this month in Oaktown Ops. Imported calendar events do not sync payment confirmations.'));
   for(const trigger of [...new Set([r.lead_days?'-P'+r.lead_days+'D':'PT0S','PT0S'])])lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escape(r.label+' reminder'),'TRIGGER:'+trigger,'END:VALARM');
   lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // Fold by UTF-8 octets, retaining Unicode labels without breaking code points.
  const fold=line=>{const out=[];let part='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>73){out.push(part);part=' ';bytes=1}part+=ch;bytes+=size}out.push(part);return out.join('\r\n')};
  return lines.map(fold).join('\r\n')+'\r\n';
 }
 return Object.freeze({validate,project,priority,message,matches,calendar,range,periodLabel});
});
