'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../today-workstation-model.js');
const date='2026-11-08';
test('work levels use saved metadata and never infer a grouping from the title',()=>{
 const a=M.level({task_title:'KYFB W01 work',workflow_key:'general'});
 assert.equal(a.key,'workflow:general');
 assert.deepEqual(M.level({intake_details:{work_level:{id:'W01',label:'KYFB allocations'}}}),{key:'W01',label:'KYFB allocations'});
});
test('urgency is cross-level, no-date is not overdue, and waiting tasks remain visible',()=>{
 const jobs=[
  {id:'a',task_title:'No due date',status:'pending',priority:'normal',workflow_key:'accounting'},
  {id:'b',task_title:'Urgent',status:'pending',priority:'urgent',workflow_key:'maintenance'},
  {id:'c',task_title:'Waiting today',status:'waiting',intake_details:{due:{date}},workflow_key:'general'},
  {id:'d',task_title:'Completed',status:'completed',workflow_key:'general'},
  {id:'e',task_title:'Archived',status:'pending',archived_at:'2026-11-01',priority:'urgent'}
 ];
 const p=M.project(jobs,date);
 assert.equal(p.active,3);assert.equal(p.completed,1);assert.equal(p.waiting,1);assert.equal(p.urgent,1);
 assert.deepEqual(p.alerts.map(x=>x.id),['b','c']);
 assert.equal(p.levels.flatMap(x=>x.open).some(x=>x.id==='e'),false);
 assert.ok(p.levels.some(x=>x.key==='workflow:general'&&x.done.length===1));
});
test('focus stays in requested work level or chooses best available, without fabricating deadlines',()=>{
 const tasks=[
 {id:'1',task_title:'Normal',status:'pending',workflow_key:'general'},
 {id:'2',task_title:'Waiting',status:'waiting',workflow_key:'accounting'},
 {id:'3',task_title:'Active',status:'pending',workflow_key:'accounting'}
 ];
 const p=M.project(tasks,date);
 assert.equal(M.focus(p,'workflow:accounting').task.id,'3');
 assert.ok(M.focus(p,'no-such-level').task);
});
test('renewal watch uses recorded dates as context and keeps imported pending separate',()=>{
 const w=M.watch([{id:'a',is_applicable:true,action_status:'Pending',recorded_end:'2026-11-15'},{id:'b',is_applicable:false,action_status:'Pending',recorded_end:'2026-11-16'}],date);
 assert.equal(w.pendingCount,1);assert.equal(w.soon.length,1);assert.equal(w.total,1);
});
test('closed levels retain canceled work without counting it as completed',()=>{
 const p=M.project(['completed','cancelled','declined','closed'].map((status,i)=>({id:String(i),status,workflow_key:'general'})),date);
 assert.equal(p.active,0);assert.equal(p.completed,1);assert.equal(p.closed,4);assert.equal(p.levels[0].done.length,4);assert.equal(M.focus(p,'workflow:general').task,null);
});
