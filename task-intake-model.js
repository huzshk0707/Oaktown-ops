/* AI output is untrusted input. Shared deterministic preview rules; no network/storage. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OpsTaskIntake=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='oaktown.task-intake.v1',ZONE='America/New_York';
const FIELDS=['task_title','status','priority','assigned_label','next_action','waiting_on','blocked_reason','due','follow_up','completion_summary'];
const CLEAR=['waiting_on','blocked_reason','due','follow_up','completion_summary'];
const WORKFLOWS=['notices','renewal','properties','maintenance','listings','general'];
const STATUSES=['pending','in_progress','waiting','blocked','completed','cancelled'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,REF=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const clone=x=>JSON.parse(JSON.stringify(x));
function fail(m){throw Error(m)}
function obj(x,label){if(!x||typeof x!=='object'||Array.isArray(x))fail(label+' must be an object');return x}
function text(x,label,max=2000){if(typeof x!=='string'||!x.trim()||x.length>max)fail(label+' must be non-empty text (max '+max+')');return x}
function keys(x,allowed,label){obj(x,label);for(const k of Object.keys(x))if(!allowed.includes(k))fail('Unsupported '+label+' field: '+k)}
function list(x,label,max=100){if(!Array.isArray(x)||x.length>max)fail(label+' must be an array (max '+max+')');return x}
function ref(x,label){if(typeof x!=='string'||!REF.test(x))fail('Invalid '+label);return x}
function uuid(x,label){if(x!==null&&x!==undefined&&(!UUID.test(x)||typeof x!=='string'))fail('Invalid '+label)}
function date(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||!Number.isFinite(Date.parse(x+'T00:00:00Z'))||new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Invalid calendar date');return x}
function schedule(x){keys(x,['date','time','timezone','original_text'],'schedule');date(x.date);if(x.time!==null&&x.time!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time))fail('Invalid schedule time');if(x.timezone!==ZONE)fail('Use America/New_York for intake schedules');text(x.original_text,'Original date wording');}
function changes(x){keys(x,FIELDS,'task change');for(const [k,v]of Object.entries(x)){
 if(v===null)fail('Use proposed_clear_fields instead of null changes');
 if(k==='due'||k==='follow_up')schedule(v);else text(v,k,k==='task_title'?300:2000);
 if(k==='status'&&!STATUSES.includes(v))fail('Unsupported task status');
 if(k==='priority'&&!['low','normal','high','urgent'].includes(v))fail('Unsupported priority');
}}
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x)}
function parse(raw){
 if(typeof raw!=='string')raw=JSON.stringify(raw);
 if(raw.length>200000)fail('Export is too large (200 KB maximum)');
 let d;try{d=JSON.parse(raw)}catch{fail('Paste only the JSON object, without Markdown fences or surrounding prose')}
 const walk=x=>{if(x&&typeof x==='object')for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))fail('Unsafe object key');walk(x[k])}};walk(d);
 keys(d,['schema_version','session_id','batch_ref','work_date','timezone','snapshot_ref','sources','proposals','activities','questions'],'export');
 if(d.schema_version!==VERSION)fail('Unsupported intake format');ref(d.batch_ref,'batch reference');date(d.work_date);
 if(d.timezone!==ZONE)fail('Work timezone must be America/New_York');uuid(d.session_id,'session ID');
 const seen=new Set(),sourceIDs=new Set();
 function unique(kind,id){ref(id,kind+' reference');const key=kind+':'+id;if(seen.has(key))fail('Duplicate '+key);seen.add(key)}
 for(const s of list(d.sources,'sources')){keys(s,['source_ref','kind','label','occurred_at','evidence_excerpt'],'source');unique('source',s.source_ref);sourceIDs.add(s.source_ref);if(!['voice','image','email','text'].includes(s.kind))fail('Invalid source kind');text(s.label,'source label');text(s.evidence_excerpt,'source excerpt',8000);if(s.occurred_at!==null&&s.occurred_at!==undefined&&(!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(s.occurred_at)||!Number.isFinite(Date.parse(s.occurred_at))))fail('Source timestamp needs an explicit offset');}
 function evidence(xs){if(!list(xs,'source references').length)fail('Evidence is required');for(const s of xs)if(!sourceIDs.has(s))fail('Missing source '+s)}
 for(const p of list(d.proposals,'proposals',50)){
  keys(p,['proposal_ref','operation','task_id','related_proposal_ref','expected_updated_at','match_reason','context','changes','suggestions','source_refs','needs_clarification','proposed_clear_fields'],'proposal');
  unique('proposal',p.proposal_ref);if(!['create','update','activity','duplicate','clarify'].includes(p.operation))fail('Unsupported operation');
  uuid(p.task_id,'task ID');if(p.related_proposal_ref)ref(p.related_proposal_ref,'related proposal');
  if(p.task_id&&p.related_proposal_ref)fail('Use either task_id or related_proposal_ref');
  if(p.operation==='create'&&(p.task_id||p.related_proposal_ref))fail('A create cannot target another task');
  if(p.operation!=='create'&&!p.task_id&&!p.related_proposal_ref)fail('An update/observation must identify a task or prior proposal');
  text(p.match_reason,'match reason');keys(p.context,['workflow_key','property_id','unit_id','tenancy_id','renewal_case_id','context_label'],'context');
  if(!WORKFLOWS.includes(p.context.workflow_key))fail('Unsupported workflow');text(p.context.context_label,'context label');
  for(const k of ['property_id','unit_id','tenancy_id','renewal_case_id'])uuid(p.context[k],k);
  changes(p.changes);changes(p.suggestions);
  if(p.operation==='create'&&!p.changes.task_title)fail('New tasks require a title');
  if(!['create','update'].includes(p.operation)&&(Object.keys(p.changes).length||Object.keys(p.suggestions).length||(p.proposed_clear_fields||[]).length))fail('Observations and duplicates cannot change task fields');
  for(const k of list(p.proposed_clear_fields||[],'clearing fields')){if(!CLEAR.includes(k)||k in p.changes||k in p.suggestions)fail('Invalid or contradictory field clearing');}
  evidence(p.source_refs);
 }
 for(const a of list(d.activities,'activities')){keys(a,['activity_ref','task_id','proposal_ref','work_date','summary','minutes','duration_basis','source_refs'],'activity');unique('activity',a.activity_ref);uuid(a.task_id,'activity task ID');if(Boolean(a.task_id)===Boolean(a.proposal_ref))fail('Activity needs exactly one task reference');if(a.proposal_ref)ref(a.proposal_ref,'activity proposal');date(a.work_date);text(a.summary,'activity summary');if(!['reported','user_estimate','not_provided'].includes(a.duration_basis))fail('Invalid duration basis');if(a.duration_basis==='not_provided'){if(a.minutes!==null)fail('Unknown duration must be null')}else if(typeof a.minutes!=='number'||!Number.isFinite(a.minutes)||a.minutes<0||a.minutes>1440)fail('Duration must be 0–1440 minutes');evidence(a.source_refs);}
 list(d.questions,'questions').forEach(q=>text(q,'question'));return d;
}
function taskState(t){return {task_title:t.task_title,status:t.status,priority:t.priority,assigned_label:t.assigned_label||'',...(t.intake_details||{})}}
function preview(d,state={tasks:[],items:[]},decisions={}){
 d=parse(d);const tasks=new Map(state.tasks.map(t=>[t.id,t])),items=new Map(state.items.map(x=>[x.kind+':'+x.ref,x]));
 const targets=new Map(),groups=new Map(),warnings=[],skipped=[],pending=[];
 const record=(kind,ref,payload)=>{const previous=items.get(kind+':'+ref);if(previous){if(canonical(previous.payload)!==canonical(payload))fail(ref+' was already imported with different content. Use a new update reference.');return previous}return null};
 for(const s of d.sources)record('source',s.source_ref,s);
 for(const i of state.items)if(i.kind==='proposal')targets.set(i.ref,'task:'+i.task_id);
 function group(key,p){
  if(groups.has(key))return groups.get(key);
  const id=key.startsWith('task:')?key.slice(5):null,existing=id?tasks.get(id):null;
  if(id&&!existing)fail('Task unavailable; refresh the snapshot');
  const g={key,task_id:id,before:existing?taskState(existing):null,after:existing?taskState(existing):{status:'pending',priority:'normal'},context:existing?{workflow_key:existing.workflow_key,property_id:existing.property_id,unit_id:existing.unit_id,tenancy_id:existing.tenancy_id,renewal_case_id:existing.renewal_case_id,context_label:'Existing task'}:clone(p.context),proposal_refs:[],clears:[],suggestions:[],observations:[],activities:[]};
  if(!id){const resolved=decisions.resolutions?.[p.proposal_ref];if(resolved)g.context={...g.context,...clone(resolved)};}
  groups.set(key,g);return g;
 }
 for(const p of d.proposals){
  const prior=record('proposal',p.proposal_ref,p);
  if(prior){targets.set(p.proposal_ref,'task:'+prior.task_id);skipped.push(p.proposal_ref);continue}
  const key=p.operation==='create'?'new:'+p.proposal_ref:p.task_id?'task:'+p.task_id:targets.get(p.related_proposal_ref);
  if(!key)fail('Unknown or forward task reference: '+p.related_proposal_ref);
  targets.set(p.proposal_ref,key);const g=group(key,p);g.proposal_refs.push(p.proposal_ref);pending.push(p.proposal_ref);
  if(g.task_id&&p.expected_updated_at&&p.expected_updated_at!==tasks.get(g.task_id).updated_at)fail('Task changed since the AI snapshot; export a fresh snapshot');
  if(['create','update'].includes(p.operation)){
   Object.assign(g.after,clone(p.changes));
   if(Object.keys(p.suggestions).length){g.suggestions.push(p.proposal_ref);if(decisions.accept_suggestions?.includes(p.proposal_ref))Object.assign(g.after,clone(p.suggestions));}
   if(p.proposed_clear_fields?.length){g.clears.push({ref:p.proposal_ref,fields:p.proposed_clear_fields});if(decisions.accept_clears?.includes(p.proposal_ref))for(const k of p.proposed_clear_fields)delete g.after[k];}
  }
  g.observations.push({ref:p.proposal_ref,operation:p.operation,reason:p.match_reason,sources:p.source_refs});
 }
 for(const a of d.activities){
  const prior=record('activity',a.activity_ref,a);if(prior){skipped.push(a.activity_ref);continue}
  const key=a.task_id?'task:'+a.task_id:targets.get(a.proposal_ref);if(!key)fail('Activity references an unknown task');
  const g=group(key,{});g.activities.push(a);pending.push(a.activity_ref);
 }
 for(const g of groups.values()){
  if(!g.task_id&&!decisions.resolutions?.[g.key.slice(4)])warnings.push('Resolve the property/unit or confirm General operations for '+g.after.task_title);
  if(!g.task_id&&g.context.workflow_key!=='general'&&!g.context.property_id&&!g.context.unit_id)warnings.push('Resolve the property/unit for '+g.after.task_title);
  if(!g.task_id&&g.context.workflow_key==='general'&&(g.context.property_id||g.context.unit_id))warnings.push('General operations must not use a property');
  if(g.after.status==='waiting'&&!g.after.waiting_on)warnings.push('Specify who you are waiting on');
  if(g.after.status!=='waiting'&&g.after.waiting_on)warnings.push('Review clearing the obsolete waiting-on value');
  if(g.after.status==='completed'&&!g.after.completion_summary)warnings.push('Completed tasks need a completion summary');
  if(g.after.status==='blocked'&&!g.after.blocked_reason)warnings.push('Blocked tasks need a reason');
 }
 return {groups:[...groups.values()],warnings,skipped,pending,minutes:[...groups.values()].flatMap(g=>g.activities).reduce((n,a)=>n+(a.minutes||0),0)};
}
function validReceipt(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&r.schema_version==='oaktown.task-receipt.v1'&&typeof r.batch_ref==='string'&&Array.isArray(r.proposals)&&Array.isArray(r.activities)}
function splitTasks(tasks,items,includeArchived=false){
 const linked=new Set((items||[]).filter(x=>x.kind==='proposal'&&x.task_id).map(x=>x.task_id));
 const active=(tasks||[]).filter(t=>!t.archived_at);
 const archived=(tasks||[]).filter(t=>!!t.archived_at);
 return {session:active.filter(t=>linked.has(t.id)),other:active.filter(t=>!linked.has(t.id)),archived:includeArchived?archived:[],archivedCount:archived.length};
}
return {VERSION,ZONE,parse,preview,canonical,taskState,validReceipt,splitTasks};
});
