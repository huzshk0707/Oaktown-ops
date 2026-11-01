'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../today-model.js');
test('date only and timestamp deadlines are interpreted in Kentucky local time',()=>{
 const explicit={due_at:'2026-11-02T01:30:00Z'};
 assert.equal(M.scheduled(explicit).date,'2026-11-01');
 assert.equal(M.scheduled(explicit).type,'Due');
 const dateOnly={intake_details:{due:{date:'2026-11-03'}}};
 assert.equal(M.scheduled(dateOnly).date,'2026-11-03');
 assert.equal(M.scheduled({intake_details:{follow_up:{date:'2026-11-05'}}}).type,'Follow-up');
 assert.equal(M.scheduled({task_title:'Due tomorrow'}),null,'Never infer dates from titles');
});
test('Today counts only dated open unarchived tasks as due or overdue',()=>{
 const tasks=[
  {id:'1',status:'pending',task_title:'Past',priority:'normal',intake_details:{follow_up:{date:'2026-10-31'}}},
  {id:'2',status:'waiting',task_title:'Today',priority:'high',intake_details:{due:{date:'2026-11-01'}}},
  {id:'3',status:'pending',task_title:'Next week',intake_details:{due:{date:'2026-11-04'}}},
  {id:'4',status:'pending',task_title:'Undated'},
  {id:'5',status:'pending',task_title:'Archived',archived_at:'2026-10-31T12:00:00Z',intake_details:{due:{date:'2026-10-30'}}},
  {id:'6',status:'completed',task_title:'Done',intake_details:{due:{date:'2026-10-30'}}}
 ];
 const res=M.classify(tasks,'2026-11-01');
 assert.equal(res.overdue.length,1);assert.equal(res.today.length,1);assert.equal(res.upcoming.length,1);
 assert.equal(res.undated.length,1);assert.equal(res.waiting.length,1);assert.equal(res.completed.length,1);
 assert.equal(res.all.length,4);
});
test('unambiguous date fields win chronologically; invalid calendar dates ignored',()=>{
 assert.equal(M.validDate('2026-02-30'),false);
 assert.equal(M.validDate('2026-02-28'),true);
 assert.equal(M.scheduled({due_at:'2026-11-13T00:00:00Z',intake_details:{follow_up:{date:'2026-11-01'}}}).date,'2026-11-01');
 assert.equal(M.scheduled({intake_details:{due:{date:'tomorrow'}}}),null);
});
test('renewal import end dates are treated as review-only and filtered by window',()=>{
 const rows=[
  {id:'1',recorded_end:'2026-11-01',is_applicable:true},
  {id:'2',recorded_end:'2026-12-16',is_applicable:true},
  {id:'3',recorded_end:'2026-12-17',is_applicable:true},
  {id:'4',recorded_end:'2026-10-31',is_applicable:true},
  {id:'5',recorded_end:'2026-11-12',is_applicable:false}
 ];
 assert.deepEqual(M.expiring(rows,'2026-11-01',45).map(x=>x.id),['1','2']);
});
