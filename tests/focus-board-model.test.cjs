'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../focus-board-model.js');
const day='2026-11-15',row=(id,priority,due,status='pending')=>({id,task_title:'Fictional '+id,priority,status,intake_details:due?{due:{date:due}}:{}});
test('board uses deterministic exclusive overdue, today, urgent, remaining order and preserves source records',()=>{
 const tasks=[row('remaining','high',null),row('urgent','urgent','2026-11-20'),row('today','normal',day),row('overdue','low','2026-11-14'),row('earlier','normal','2026-11-10'),row('closed','urgent',null,'completed'),{...row('archive','urgent',null),archived_at:'2026-11-01'}];
 const before=JSON.stringify(tasks);assert.deepEqual(M.order(tasks,day).map(t=>t.id),['earlier','overdue','today','urgent','remaining']);assert.equal(JSON.stringify(tasks),before);
 assert.deepEqual(M.order([...tasks].reverse(),day).map(t=>t.id),M.order(tasks,day).map(t=>t.id));
});
test('ties use date, priority, lower-case title and exact ID independent of input order',()=>{
 const tasks=[{...row('b','normal',day),task_title:'Same'},{...row('a','normal',day),task_title:'same'},row('high','high',day)];
 assert.deepEqual(M.order(tasks,day).map(t=>t.id),['high','a','b']);
});
test('Eastern timestamps and follow-ups use shared semantics without inventing due dates or terminal status',()=>{
 const follow={id:'f',status:'waiting',intake_details:{follow_up:{date:'2026-11-14'}}};
 assert.equal(M.lane(follow,day),'overdue');assert.equal(M.due(follow),null);
 assert.equal(M.due({due_at:'2026-11-15T02:00:00Z'}),'2026-11-14');
 for(const status of ['completed','cancelled','canceled','closed','done','declined'])assert.equal(M.order([{id:status,status}],day).length,0);
 assert.equal(M.order([{id:'unknown',status:'custom'}],day).length,1);
});
