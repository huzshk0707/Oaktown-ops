'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),R=require('../task-intake-model.js');
const fixture=require('./fixtures/task-intake.json'),copy=()=>JSON.parse(JSON.stringify(fixture));
const ID='10000000-0000-4000-8000-000000000001',TASK='20000000-0000-4000-8000-000000000001';
const decisions={resolutions:{P001:{property_id:ID,unit_id:null}},accept_clears:['P004'],accept_suggestions:[]};
test('fictional export consolidates to one pending task and ten estimated minutes',()=>{
 const x=R.preview(copy(),undefined,decisions);assert.equal(x.groups.length,1);assert.equal(x.groups[0].after.status,'pending');assert.equal(x.minutes,10);assert.equal(x.groups[0].after.waiting_on,undefined);assert.equal(x.groups[0].after.follow_up,undefined);assert.deepEqual(x.warnings,[]);
});
test('clearing never happens without separate approval',()=>{
 const x=R.preview(copy());assert.equal(x.groups[0].after.waiting_on,'Leslie');assert.ok(x.warnings.some(x=>x.includes('waiting-on')));
});
test('missing property context prevents save readiness',()=>assert.ok(R.preview(copy(),undefined,{accept_clears:['P004']}).warnings.some(x=>x.includes('Resolve'))));
test('duplicate source references are rejected',()=>{const d=copy();d.sources.push(d.sources[0]);assert.throws(()=>R.parse(d),/Duplicate/)});
test('unsafe keys, unknown fields and unsupported versions fail closed',()=>{
 assert.throws(()=>R.parse('{"__proto__":{}}'),/Unsafe/);
 const d=copy();d.execute='sql';assert.throws(()=>R.parse(d),/Unsupported/);delete d.execute;d.schema_version='v2';assert.throws(()=>R.parse(d),/Unsupported/);
});
test('evidence must be present in the export',()=>{const d=copy();d.sources.pop();assert.throws(()=>R.parse(d),/Missing source/)});
test('references must resolve in order',()=>{const d=copy();d.proposals.reverse();assert.throws(()=>R.preview(d),/forward/)});
test('null changes and contradictory clears are rejected',()=>{
 const d=copy();d.proposals[3].changes.waiting_on=null;assert.throws(()=>R.parse(d),/null changes/);
 d.proposals[3].changes.waiting_on='Leslie';assert.throws(()=>R.parse(d),/contradictory/);
});
test('calendar dates and minute ranges are checked',()=>{
 const d=copy();d.work_date='2026-02-30';assert.throws(()=>R.parse(d),/calendar/);d.work_date='2026-11-02';d.activities[0].minutes=-1;assert.throws(()=>R.parse(d),/Duration/);
 d.activities[0].minutes=null;d.activities[0].duration_basis='not_provided';assert.doesNotThrow(()=>R.parse(d));
});
test('date-only follow ups stay date-only without invented midnight',()=>{const d=copy();d.proposals=d.proposals.slice(0,1);const x=R.preview(d);assert.equal(x.groups[0].after.follow_up.time,null);assert.equal(x.groups[0].after.follow_up.date,'2026-11-03')});
test('already imported proposals and activities do not replay task state or time',()=>{
 const d=copy(),items=[...d.sources.map(payload=>({kind:'source',ref:payload.source_ref,payload})),...d.proposals.map(payload=>({kind:'proposal',ref:payload.proposal_ref,payload,task_id:TASK})),...d.activities.map(payload=>({kind:'activity',ref:payload.activity_ref,payload,task_id:TASK}))];
 const x=R.preview(d,{items,tasks:[]});assert.equal(x.pending.length,0);assert.equal(x.minutes,0);assert.equal(x.skipped.length,5);
 const modified=copy();modified.proposals[0].changes.task_title='Changed';assert.throws(()=>R.preview(modified,{items,tasks:[]}),/different content/);
});
test('new follow ups can target imported proposal IDs with a fresh task version',()=>{
 const d=copy(),root=d.proposals[0];d.proposals=[{...d.proposals[3],proposal_ref:'P005',expected_updated_at:'2026-11-02T14:00:00Z'}];d.activities=[];
 const state={items:[{kind:'proposal',ref:'P001',payload:root,task_id:TASK}],tasks:[{id:TASK,task_title:'Original',status:'waiting',priority:'normal',workflow_key:'renewal',property_id:ID,updated_at:'2026-11-02T14:00:00Z',intake_details:{waiting_on:'Leslie'}}]};
 assert.equal(R.preview(d,state,{accept_clears:['P005']}).groups[0].task_id,TASK);
 d.proposals[0].expected_updated_at='2026-11-01T14:00:00Z';assert.throws(()=>R.preview(d,state),/changed/);
});
test('duplicate observations cannot smuggle field changes',()=>{const d=copy();d.proposals[2].changes.status='completed';assert.throws(()=>R.parse(d),/cannot change/)});
test('suggestions apply only on explicit acceptance',()=>{const d=copy();d.proposals[0].suggestions.priority='urgent';assert.equal(R.preview(d).groups[0].after.priority,'normal');assert.equal(R.preview(d,undefined,{accept_suggestions:['P001']}).groups[0].after.priority,'urgent')});

test('valid receipt requires an actual saved import object, not null or a null array entry',()=>{
 const yes={schema_version:'oaktown.task-receipt.v1',batch_ref:'B01',proposals:[],activities:[]};
 assert.equal(R.validReceipt(yes),true);
 for(const bad of [null,undefined,'null',{},[],{schema_version:'oaktown.task-receipt.v1'}])assert.equal(R.validReceipt(bad),false);
});
test('tasks are grouped by session provenance with archived hidden unless requested',()=>{
 const tasks=[{id:'a',task_title:'session'},{id:'b',task_title:'legacy'},{id:'c',task_title:'archived',archived_at:'2026-11-01T00:00:00Z'}];
 const items=[{kind:'proposal',task_id:'a'},{kind:'source',task_id:null},{kind:'proposal',task_id:'c'}];
 let v=R.splitTasks(tasks,items);
 assert.deepEqual(v.session.map(t=>t.id),['a']);assert.deepEqual(v.other.map(t=>t.id),['b']);
 assert.equal(v.archivedCount,1);assert.equal(v.archived.length,0);
 v=R.splitTasks(tasks,items,true);assert.deepEqual(v.archived.map(t=>t.id),['c']);
});
