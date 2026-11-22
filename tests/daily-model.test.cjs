'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../daily-model.js'),F=require('../focus-board-model.js'),T=require('../today-model.js');
const {attest}=require('./plan-fixtures.cjs');
const day='2026-11-16',id=n=>'90000000-0000-4000-8000-'+String(n).padStart(12,'0');
function approval(n=1,revision=1,time='2026-11-16T13:00:00Z'){
 const plan={schema_version:'oaktown.sod-draft.v1',planId:id(n+100),revision,workDate:day,text:'Fictional approved daily plan',rows:[],sources:{},constants:[],greeting:'normal',extras:'',stale:[]};
 return attest({id:id(n),actor_id:id(99),entity_type:'morning_plan',entity_id:plan.planId,event_type:'morning_plan_approved_v1',occurred_at:time,event_metadata:{schema_version:'oaktown.morning-plan.v1',plan_id:plan.planId,revision,work_date:day,plan}});
}
test('latest valid staff approval uses approval time across plan IDs and preserves metadata',()=>{
 const first=approval(1,20),next=approval(2,1,'2026-11-16T14:00:00Z'),bad=approval(3,100,'2026-11-16T15:00:00Z');bad.event_metadata.plan.workDate='2026-11-17';
 assert.equal(D.latest([bad,next,first],day),next);assert.equal(D.latest([first], '2026-11-15'),null);
 for(const change of [r=>r.actor_id=null,r=>r.event_metadata.plan=null,r=>r.event_metadata.plan.rows=[null],r=>r.event_metadata.plan.sources=[],r=>r.event_metadata.revision=44,r=>r.event_metadata.plan.stale=['changed'],r=>r.event_type='draft']){const row=approval();change(row);assert.equal(D.validApproval(row,day),false)}
 const micro=approval(4,2,'2026-11-16T14:00:00.000001Z');assert.equal(D.latest([next,micro],day),micro);
});
test('task counts, owner identities and follow-ups reuse Focus order without mutations',()=>{
 const tasks=[{id:id(1),task_title:'Blocked',status:'blocked',assigned_label:'Example',assigned_user_id:id(50),intake_details:{blocked_reason:'Approval required'}},{id:id(2),task_title:'Overdue',status:'pending',priority:'low',assigned_label:'Example',assigned_user_id:id(51),intake_details:{due:{date:'2026-11-15'}}},{id:id(3),task_title:'Closed',status:'completed'},{id:id(4),task_title:'Archived',status:'pending',archived_at:'2026-11-16'}];
 const before=JSON.stringify(tasks),p=D.project(tasks,day);assert.deepEqual(p.active,F.order(tasks,day));assert.equal(p.active.length,2);assert.equal(p.attention.length,1);assert.equal(p.owners.length,2);assert.equal(p.waiting.length,1);assert.equal(JSON.stringify(tasks),before);
});
test('a dated callback needs attention while only a recorded dependency is waiting',()=>{
 const callback={id:id(1),task_title:'Call the vendor',status:'pending',intake_details:{follow_up:{date:day}}};
 const waiting={id:id(2),task_title:'Tenant access',status:'waiting',intake_details:{waiting_on:'Example tenant',follow_up:{date:'2026-11-17'}}};
 const started={id:id(3),task_title:'Friday hours',status:'in_progress',intake_details:{next_action:'Start at Thursday'}};
 const tasks=[callback,waiting,started];
 const brief=D.project(tasks,day,waiting.id);
 assert.deepEqual(brief.attention.map(t=>t.id),[callback.id]);
 assert.deepEqual(brief.waiting.map(t=>t.id),[waiting.id]);
 assert.equal(brief.focus.task.id,started.id);
 assert.equal(brief.focus.label,'In progress');
 assert.equal(D.project(tasks,day,callback.id).focus.task.id,callback.id);
 assert.equal(D.project([waiting],day).focus,null);
 assert.equal(D.project([callback],day).focus.label,'Suggested focus');
});
test('Eastern date stays on prior business day while India and UTC advance',()=>{assert.equal(T.today(new Date('2026-11-17T02:30:00Z')),day)});
module.exports={approval,day};
