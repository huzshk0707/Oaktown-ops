/* Pure, strict preview of a staff-reviewed Master Backlog manifest. No persistence. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsBacklogImportModel=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION='oaktown.master-backlog.v1';
 const CODE=/^[MWA][0-9]{2}$/,SOURCE=/^Active Tasks!A[0-9]{1,4}:L[0-9]{1,4}$/;
 const STATUSES=['pending','in_progress','waiting','blocked','completed','cancelled'];
 const PRIORITIES=['low','normal','high','urgent'];
 const COLUMNS=['task_code','task_title','status','priority','work_level','parent_code',
  'next_action','waiting_on','blocked_reason','completion_summary','completed_on',
  'needs_verification','source_ref','original_status','original_priority'];
 function error(message){throw Error(message)}
 function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))error(label+' must be an object');
  return value;
 }
 function exact(value,keys,label){
  object(value,label);for(const k of Object.keys(value))
   if(!keys.includes(k)||['__proto__','prototype','constructor'].includes(k))error('Unsupported '+label+' key: '+k);
 }
 function date(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
 function parse(raw){
  if(typeof raw==='string'&&raw.length>180000)error('Manifest exceeds the import size limit');
  let d;try{d=typeof raw==='string'?JSON.parse(raw):raw}catch{error('Paste one JSON manifest without Markdown fences')}
  exact(d,['schema_version','batch_ref','entries'],'manifest');
  if(d.schema_version!==VERSION||typeof d.batch_ref!=='string'||!/^master-backlog-\d{8}$/.test(d.batch_ref))error('Invalid manifest version or batch reference');
  if(!Array.isArray(d.entries)||d.entries.length<1||d.entries.length>50)error('Import requires 1–50 reviewed rows');
  const codes=new Set(),roots=new Set();
  d.entries.forEach((r,index)=>{
   exact(r,COLUMNS,'entry '+(index+1));
   const c=r.task_code;
   if(typeof c!=='string'||!CODE.test(c)||codes.has(c))error('Duplicate or invalid task code: '+String(c));
   codes.add(c);
   if(typeof r.task_title!=='string'||!r.task_title.trim()||r.task_title.length>300)error(c+': title required');
   if(!STATUSES.includes(r.status)||!PRIORITIES.includes(r.priority))error(c+': unsupported status or priority');
   if(typeof r.work_level!=='string'||!r.work_level.trim()||r.work_level.length>90)error(c+': work level required');
   if(typeof r.source_ref!=='string'||!SOURCE.test(r.source_ref))error(c+': source worksheet row required');
   if(r.parent_code!==undefined&&r.parent_code!==null&&r.parent_code!==''){
    if(typeof r.parent_code!=='string'||!CODE.test(r.parent_code)||r.parent_code===c)error(c+': invalid parent');
   }else roots.add(c);
   for(const k of ['next_action','waiting_on','blocked_reason','completion_summary','original_status','original_priority'])
    if(r[k]!=null&&(typeof r[k]!=='string'||r[k].length>(k==='waiting_on'?120:k==='blocked_reason'?1200:2000)))error(c+': invalid '+k);
   if(r.needs_verification!==undefined&&typeof r.needs_verification!=='boolean')error(c+': needs_verification must be boolean');
   if(r.status==='waiting'&&!String(r.waiting_on||'').trim())error(c+': waiting_on required');
   if(r.status==='blocked'&&!String(r.blocked_reason||'').trim())error(c+': blocked_reason required');
   if(r.status==='completed'&&!String(r.completion_summary||'').trim())error(c+': historical completion summary required');
   if(r.status!=='waiting'&&String(r.waiting_on||'').trim())error(c+': waiting_on conflicts with status');
   if(r.completed_on!==undefined&&(r.status!=='completed'||!date(r.completed_on)))error(c+': invalid historical completion date');
  });
  for(const r of d.entries){
   if(r.parent_code&&!roots.has(r.parent_code))error(r.task_code+': parent must be a root in the reviewed manifest');
  }
  return d;
 }
 function summarize(d){
  d=parse(d);
  return {rows:d.entries.length,completed:d.entries.filter(r=>r.status==='completed').length,
   verification:d.entries.filter(r=>r.needs_verification).length,
   parentLinks:d.entries.filter(r=>r.parent_code).length,
   codes:d.entries.map(r=>r.task_code)};
 }
 return Object.freeze({VERSION,parse,summarize,STATUSES,PRIORITIES});
});