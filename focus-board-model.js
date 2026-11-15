/* Phase 1 ordering only. Never mutates tasks or their statuses. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./today-model.js'):root.OpsTodayModel);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsFocusBoardModel=api;})(typeof window!=='undefined'?window:null,function(T){
 'use strict';
 const compare=(a,b)=>a<b?-1:a>b?1:0;
 const priority=t=>({urgent:0,high:1,normal:2,low:3})[String(t.priority||'normal').toLowerCase()]??4;
 function lane(task,day=T.today()){
  const schedule=T.scheduled(task);
  return schedule?.date<day?'overdue':schedule?.date===day?'today':String(task.priority||'').toLowerCase()==='urgent'?'urgent':'remaining';
 }
 function order(tasks,day=T.today()){
  const ranks={overdue:0,today:1,urgent:2,remaining:3};
  return T.classify(tasks,day).all.sort((a,b)=>ranks[lane(a,day)]-ranks[lane(b,day)]||
   compare(T.scheduled(a)?.date||'9999-99-99',T.scheduled(b)?.date||'9999-99-99')||priority(a)-priority(b)||
   compare(String(a.task_title||'').toLowerCase(),String(b.task_title||'').toLowerCase())||compare(String(a.id),String(b.id)));
 }
 function due(task){return T.scheduled({...task,intake_details:{due:task.intake_details?.due}})?.date||null}
 return Object.freeze({order,lane,due});
});
