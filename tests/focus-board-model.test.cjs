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

test('HUD tones preserve urgency labels and stored priority/status values',()=>{
 assert.deepEqual(M.appearance(row('late','urgent','2026-11-14'),day),{lane:'overdue',tone:'overdue',label:'Overdue'});
 assert.equal(M.appearance(row('today','low',day),day).tone,'today');
 assert.equal(M.appearance(row('urgent','urgent',null),day).tone,'urgent');
 assert.equal(M.appearance(row('low','low',null),day).tone,'low');
 assert.equal(M.appearance(row('normal','normal',null),day).tone,'normal');
});
test('Focus details project only stored text and exact related records without interpreting markup',()=>{
 const task={id:'task-1',property_id:'p-1',unit_id:'u-1',lease_id:'l-missing',workflow_key:'maintenance',notes:'<img onerror="bad()">\nReviewed note',intake_details:{description:'Recorded description',next_action:'Verify the document',waiting_on:'Example staff',secret_unknown_key:'Must not display'}};
 const before=JSON.stringify(task),result=M.detail(task,{properties:[{id:'p-1',street_address:'100 Fictional Lane'}],units:[{id:'u-1',unit_label:'Unit A'}]});
 assert.deepEqual(result.references,[['Property','100 Fictional Lane · p-1'],['Unit','Unit A · u-1'],['Lease','l-missing']]);
 assert.ok(result.sections.some(([key,value])=>key==='Notes'&&value.includes('<img')));assert.ok(!JSON.stringify(result).includes('Must not display'));
 assert.equal(JSON.stringify(task),before);assert.deepEqual(M.detail({id:'empty'}).sections,[]);
});
