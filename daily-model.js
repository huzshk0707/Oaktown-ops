/* Read-only projections of authorized staff journal and shared task snapshots. */
(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports,api=factory(node?require('./today-model.js'):root.OpsTodayModel,node?require('./focus-board-model.js'):root.OpsFocusBoardModel,node?require('./morning-model.js'):root.OpsMorningModel);if(node)module.exports=api;if(root)root.OpsDailyModel=api;})(typeof window!=='undefined'?window:null,function(T,F,M){
 'use strict';
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const uuid=v=>typeof v==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
 function validApproval(row,day){
  try{
   const m=row?.event_metadata,p=m?.plan;
   return M.attested(row)&&uuid(row.id)&&uuid(row.actor_id)&&Number.isFinite(Date.parse(row.occurred_at))&&row.entity_type==='morning_plan'&&row.event_type==='morning_plan_approved_v1'&&
    m.schema_version==='oaktown.morning-plan.v1'&&p?.schema_version==='oaktown.sod-draft.v1'&&uuid(p.planId)&&row.entity_id===p.planId&&m.plan_id===p.planId&&
    T.validDate(day)&&m.work_date===day&&p.workDate===day&&Number.isInteger(p.revision)&&p.revision>=0&&m.revision===p.revision&&
    typeof p.text==='string'&&!!p.text.trim()&&p.text.length<=90000&&Array.isArray(p.rows)&&p.rows.length<=50&&object(p.sources)&&
    Array.isArray(p.stale)&&p.stale.length===0&&['normal','weekend'].includes(p.greeting)&&typeof p.extras==='string'&&Array.isArray(p.constants)&&
    p.constants.every(c=>object(c)&&typeof c.id==='string'&&typeof c.text==='string')&&new Set(p.rows.map(r=>r.id)).size===p.rows.length&&
    p.rows.every(r=>object(r)&&typeof r.id==='string'&&['task','planning'].includes(r.type)&&typeof r.subject==='string'&&typeof r.action==='string'&&M.sections.includes(r.section)&&object(p.sources[r.sourceId])&&typeof p.sources[r.sourceId].label==='string'&&(r.type!=='task'||uuid(r.id)));
  }catch{return false}
 }
 // Server approval time orders different plans; a draft revision is local to its plan ID.
 const fraction=value=>(value.match(/\.(\d+)/)?.[1]||'').padEnd(9,'0');
 function latest(rows,day){return rows.filter(r=>validApproval(r,day)).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)||fraction(b.occurred_at).localeCompare(fraction(a.occurred_at))||b.id.localeCompare(a.id))[0]||null}
 function chooseFocus(tasks,selectedId){
  const selected=tasks.find(task=>task.id===selectedId);
  if(selected)return {task:selected,label:'Last shown in Focus'};
  const inProgress=tasks.find(task=>task.status==='in_progress');
  if(inProgress)return {task:inProgress,label:'In progress'};
  return tasks.length?{task:tasks[0],label:'Suggested focus'}:null;
 }
 function project(tasks,day,selectedId=null){
  const active=F.order(tasks,day),owners=new Map();
  for(const t of active){const key=t.assigned_user_id?'user:'+t.assigned_user_id:t.assigned_label?'label:'+t.assigned_label:'unassigned';if(!owners.has(key))owners.set(key,{key,label:t.assigned_label||t.assigned_user_id||'Unassigned',tasks:[]});owners.get(key).tasks.push(t)}
  return {
   active,
   owners:[...owners.values()],
   waiting:active.filter(T.hasDependency),
   attention:active.filter(task=>F.lane(task,day)!=='remaining'||(String(task.priority||'').toLowerCase()==='high'&&T.actionable(task)&&!T.hasDependency(task))),
   focus:chooseFocus(active.filter(task=>!T.hasDependency(task)),selectedId)
  };
 }
 return Object.freeze({validApproval,latest,project});
});
