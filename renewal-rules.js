/* Renewal Generator field rules. No tenant data is stored by this module. */
(function(root,factory){
  'use strict';
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  if(root)root.OpsRenewalRules=rules;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const utilities=['Water','Electric','Gas','Trash','Internet'];
 const appliances=['Range','Refrigerator','Dishwasher','Blinds','Microwave','Garage Door Opener','Washer & Dryer'];
 function parseISO(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value?date:null;
 }
 function iso(date){return date.toISOString().slice(0,10)}
 function addDays(date,days){const n=new Date(date);n.setUTCDate(n.getUTCDate()+days);return n}
 function addMonths(date,months){
  const d=new Date(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
  const month=d.getUTCMonth();d.setUTCDate(day);
  if(d.getUTCMonth()!==month)d.setUTCDate(0);
  return d;
 }
 function suggestTerm(start,end){
  const s=parseISO(start),e=parseISO(end);
  if(!s||!e||e<s)return null;
  const next=addDays(e,1);
  const months=(e.getUTCFullYear()-s.getUTCFullYear())*12+e.getUTCMonth()-s.getUTCMonth()+1;
  const exactlyMonths=months>0&&months<=120&&iso(addDays(addMonths(s,months),-1))===iso(e);
  const newEnd=exactlyMonths?addDays(addMonths(next,months),-1):addDays(next,Math.round((e-s)/86400000));
  return {start:iso(next),end:iso(newEnd),method:exactlyMonths?'calendar-months':'same-number-of-days'};
 }
 function moneyCents(value){
  const raw=String(value==null?'':value).trim().replace(/,/g,'');
  if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw))return null;
  const parts=raw.split('.');
  const cents=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
  return Number.isSafeInteger(cents)?cents:null;
 }
 function formatCents(cents){
  if(!Number.isSafeInteger(cents)||cents<0)throw Error('Invalid currency value.');
  return '$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 }
 function fees(cents){
  if(!Number.isSafeInteger(cents)||cents<=0)throw Error('Enter a positive monthly rent.');
  return {five:Math.round(cents*0.05),ten:Math.round(cents*0.10)};
 }
 function leaseDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const read=k=>parts.find(p=>p.type===k).value;
  return read('year')+'-'+read('month')+'-'+read('day');
 }
 function displayDate(value){
  const d=parseISO(value);if(!d)throw Error('Invalid lease date.');
  return String(d.getUTCMonth()+1).padStart(2,'0')+'/'+String(d.getUTCDate()).padStart(2,'0')+'/'+d.getUTCFullYear();
 }
 function validate(state){
  const errors=[];
  if(!state.unitId)errors.push('Select a property and unit.');
  if(!state.leaseId)errors.push('Select and verify an existing lease.');
  if(!state.verified)errors.push('Confirm the existing lease and tenant information was verified.');
  const s=parseISO(state.start),e=parseISO(state.end);
  if(!s||!e||e<s)errors.push('Enter a valid renewal start and end date.');
  if(moneyCents(state.rent)==null||moneyCents(state.rent)<=0)errors.push('Enter a positive monthly rent with at most two decimals.');
  if(!String(state.tenantName||'').trim())errors.push('Confirm the tenant name.');
  if(!String(state.address||'').trim())errors.push('Confirm the property address.');
  if(!Array.isArray(state.occupants)||state.occupants.length>5)errors.push('A maximum of five occupants fit the template.');
  for(const name of utilities)if(!['Landlord','Tenant'].includes(state.utilities?.[name]))errors.push('Select who pays '+name+'.');
  for(const name of appliances)if(!['Yes','No'].includes(state.appliances?.[name]))errors.push('Select Yes or No for '+name+'.');
  return errors;
 }
 return Object.freeze({utilities,appliances,parseISO,suggestTerm,moneyCents,formatCents,fees,leaseDate,displayDate,validate});
});
