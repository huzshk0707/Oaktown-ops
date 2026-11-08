'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../operations-model.js');
const base=()=>({properties:[{id:'p',street_address:'100 Example Court'}],units:[{id:'a',property_id:'p',unit_label:'Unit A'},{id:'b',property_id:'p',unit_label:'Unit B'}],leases:[{id:'la',unit_id:'a',tenancy_id:'ta',lease_label:'Alpha lease'},{id:'lb',unit_id:'b',tenancy_id:'tb',lease_label:'Beta lease'}],people:[],parties:[],tasks:[],renewals:[],events:[],rents:[],documents:[]});
test('Action Centre respects real office dates, archived/terminal tasks and recorded lease ends',()=>{
 const d=base();d.tasks=[{id:'1',task_title:'Earlier follow-up',status:'waiting',workflow_key:'maintenance',due_at:'2026-11-05T02:00:00Z',intake_details:{follow_up:{date:'2026-11-03'}}},{id:'2',task_title:'Today',status:'pending',intake_details:{due:{date:'2026-11-04'}}},{id:'3',task_title:'Unscheduled',status:'pending'},{id:'4',task_title:'Hidden',archived_at:'2026-11-01'},{id:'5',status:'completed'}];
 d.renewals=[{id:'r1',unit_id:'a',recorded_end:'2026-10-01',next_action:'Verify terms',action_status:'pending'},{id:'r2',is_applicable:false,next_action:'Ignored',action_status:'pending'},{id:'r3',action_status:'pending'}];
 const rows=M.actions(d,'2026-11-04',{r3:{status:'completed',nextAction:'None'}});
 assert.deepEqual(rows.map(r=>[r.id,r.group]),[['1','overdue'],['2','today'],['3','undated']]);
 assert.equal(M.filterActions(rows,'renewals').length,0);assert.equal(M.filterActions(rows,'overdue').length,1);assert.equal(M.filterActions(rows,'maintenance').length,1);assert.equal(M.filterActions(rows,'waiting').length,1);
});
test('A linked renewal task appears once while raw renewal cases stay searchable, not actionable',()=>{
 const d=base();d.renewals=[{id:'r1',unit_id:'a',oak_record_id:'R1-TEST',action_status:'pending',next_action:'Check terms'}];d.tasks=[{id:'t1',task_title:'Signature follow-up',status:'pending',workflow_key:'renewal',renewal_case_id:'r1'}];
 const rows=M.actions(d,'2026-11-08');assert.deepEqual(rows.map(r=>r.id),['t1']);assert.equal(M.filterActions(rows,'renewals').length,1);
 assert.equal(M.search(M.searchIndex(d),'R1-TEST').length,1);
});
test('Unit scope never absorbs sibling units or property-only work and preserves property totals',()=>{
 const d=base();d.renewals=[{id:'ra',unit_id:'a',property_id:'p'},{id:'rb',unit_id:'b',property_id:'p'},{id:'rp',property_id:'p'}];
 d.tasks=[{id:'t1',unit_id:'a'},{id:'t2',unit_id:'b'},{id:'t3',property_id:'p'},{id:'t4',renewal_case_id:'ra'},{id:'t5',lease_id:'lb'},{id:'t6',unit_id:'a',archived_at:'2026-11-01'}];
 d.events=[{id:'e1',entity_type:'renewal_case',entity_id:'ra',occurred_at:'2026-11-02'},{id:'e2',entity_type:'renewal_case',entity_id:'rb',occurred_at:'2026-11-03'},{id:'e3',entity_type:'property',entity_id:'p',occurred_at:'2026-11-04'},{id:'e4',entity_type:'task',entity_id:'t6',occurred_at:'2026-10-31'}];d.rents=[{lease_id:'la',amount_usd:100},{lease_id:'lb',amount_usd:200}];
 const unit=M.scope(d,'unit','a');assert.deepEqual(unit.leases.map(x=>x.id),['la']);assert.deepEqual(unit.renewals.map(x=>x.id),['ra']);assert.deepEqual(unit.tasks.map(x=>x.id),['t1','t4']);assert.deepEqual(unit.events.map(x=>x.id),['e1','e4']);assert.equal(unit.rents.length,1);
 const property=M.scope(d,'property','p');assert.equal(property.units.length,2);assert.equal(property.tasks.length,5);assert.equal(property.events[0].id,'e3');
});
test('Search combines words, normalizes accents, excludes archived work and links exact IDs',()=>{
 const d=base();d.people=[{id:'person',display_name:'José Fictional',email:'jose@example.invalid'}];d.tasks=[{id:'t',unit_id:'b',task_title:'Review application'},{id:'archived',task_title:'Review private',archived_at:'2026-11-01'}];
 const i=M.searchIndex(d);assert.equal(M.search(i,'JOSE fictional')[0].id,'person');assert.equal(M.search(i,'application court')[0].id,'t');assert.equal(M.search(i,'private').length,0);assert.equal(M.search(i,'').length,0);
 assert.equal(M.search(i,'unit',1).length,1);assert.equal(M.search(i,'Unit B')[0].id,'b');
});
test('Original-document links only use a validated Drive ID',()=>{
 assert.equal(M.driveUrl({drive_file_id:'abc_123456789'}),'https://drive.google.com/file/d/abc_123456789/view');
 for(const value of ['javascript:alert(1)','https://evil.invalid','../abc','abc?secret=1',''])assert.equal(M.driveUrl({drive_file_id:value}),null);
});
