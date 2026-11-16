'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../focus-actions-model.js');
const day='2026-11-15',id='00000000-0000-4000-8000-000000000001',session='10000000-0000-4000-8000-000000000001';
const task=()=>({id,task_title:'Fictional inspection',task_code:'DEMO-101',status:'pending',priority:'high',updated_at:'2026-11-15T12:00:00.123456Z',completed_at:null,intake_details:{description:'Fictional context',due:{date:'2026-11-13',time:'09:15',timezone:'America/New_York',original_text:'Recorded deadline'}},due_at:'2026-11-13T14:15:00Z'});
test('completion requires a summary, preserves context and explicitly reviews cleared blockers',()=>{
 const t=task();t.status='waiting';t.intake_details.waiting_on='Fictional reviewer';
 assert.throws(()=>M.plan(t,'complete',{},day),/Describe/);
 const p=M.plan(t,'complete',{summary:'Inspection finished and report filed.'},day);
 assert.deepEqual(p.changes,{status:'completed',completion_summary:'Inspection finished and report filed.'});assert.deepEqual(p.clears,['waiting_on']);assert.equal(t.status,'waiting');assert.deepEqual(p.after.intake_details.due,t.intake_details.due);assert.equal(p.after.due_at,t.due_at);
 assert.deepEqual(p.reverse,{changes:{status:'waiting',waiting_on:'Fictional reviewer'},clears:['completion_summary']});
});
test('deferral changes only follow-up and requires a later valid Eastern date',()=>{
 const t=task(),p=M.plan(t,'defer',{date:'2026-11-18'},day);
 assert.deepEqual(Object.keys(p.changes),['follow_up']);assert.equal(p.after.status,t.status);assert.deepEqual(p.after.intake_details.due,t.intake_details.due);assert.equal(p.after.due_at,t.due_at);
 assert.deepEqual(p.reverse,{changes:{},clears:['follow_up']});
 for(const date of ['2026-02-30','2026-11-15','2026-11-14','bad'])assert.throws(()=>M.plan(t,'defer',{date},day),/Choose/);
 t.intake_details.follow_up=p.changes.follow_up;assert.throws(()=>M.plan(t,'defer',{date:'2026-11-18'},day),/later/);assert.equal(M.suggest(t,day),'2026-11-19');
});
test('existing status requirements and inaccessible or versionless tasks fail before proposal construction',()=>{
 const t=task();for(const patch of [{status:'completed'},{status:'cancelled'},{archived_at:'2026-11-15'},{updated_at:null}])assert.throws(()=>M.plan({...t,...patch},'complete',{summary:'Fictional work'},day));
 assert.throws(()=>M.plan({...t,status:'waiting'},'defer',{date:'2026-11-18'},day),/need review/);
});
test('payload binds one narrow proposal, exact version, before values and reversal audit reference',()=>{
 const p=M.plan(task(),'defer',{date:'2026-11-18'},day),r=M.payload(p,session,'focus-fictional',day);
 assert.equal(r.reviewed,true);assert.equal(r.expected_versions[id],p.version);assert.equal(r.export.proposals.length,1);assert.equal(r.export.proposals[0].operation,'update');assert.equal(r.export.activities.length,0);assert.deepEqual(r.export.proposals[0].changes,p.changes);assert.deepEqual(JSON.parse(r.export.sources[0].evidence_excerpt).before.follow_up,{absent:true});
 const record=M.recent(p,{...p.after,updated_at:'2026-11-15T13:00:00.123456Z'},'focus-fictional',1000),u=M.undo({...p.after,updated_at:record.version},record,1001);
 assert.deepEqual(u.clears,['follow_up']);assert.match(M.payload(u,session,'focus-undo',day).export.proposals[0].match_reason,/reversing focus-fictional/);
});
test('persisted Undo rejects intervening microsecond edits, expiry and unavailable records',()=>{
 const p=M.plan(task(),'complete',{summary:'Fictional work finished'},day),row={...p.after,updated_at:'2026-11-15T13:00:00.123456Z',completed_at:'2026-11-15T13:00:00Z'},r=M.recent(p,row,'focus-1',1000);
 assert.equal(M.undo(row,r,1001).after.status,'pending');assert.equal(M.undo(row,r,1001).after.completed_at,null);
 assert.throws(()=>M.undo({...row,updated_at:'2026-11-15T13:00:00.123457Z'},r,1001),/changed/);assert.throws(()=>M.undo(row,r,121000),/window/);assert.throws(()=>M.undo(null,r,1001),/accessible/);
});
test('unrepresentable previous fields disable Undo without simulating a reversal',()=>{
 const t=task();t.intake_details.follow_up=null;const p=M.plan(t,'defer',{date:'2026-11-18'},day);assert.equal(p.reverse,null);
 const r=M.recent(p,{...p.after,updated_at:t.updated_at},'focus-1',1000);assert.throws(()=>M.undo(p.after,r,1001),/unavailable/);
});
test('readback checks receipt identity, microsecond version, all changed and preserved fields',()=>{
 const p=M.plan(task(),'defer',{date:'2026-11-18'},day),row={...p.after,updated_at:'2026-11-15T13:00:00.123456Z'},receipt={schema_version:'oaktown.task-receipt.v1',session_id:session,batch_ref:'focus-1',tasks:[row],proposals:[{task_id:id,proposal_ref:'P1',result:'imported'}]};
 assert.equal(M.verified(p,receipt,row,session,'focus-1'),true);
 for(const patch of [{due_at:null},{status:'completed'},{notes:'A concurrent edit'},{updated_at:'2026-11-15T13:00:00.123457Z'},{intake_details:{...row.intake_details,due:null}}])assert.equal(M.verified(p,receipt,{...row,...patch},session,'focus-1'),false);
 assert.equal(M.verified(p,{...receipt,tasks:[]},row,session,'focus-1'),false);assert.equal(M.verified(p,{...receipt,session_id:'another'},row,session,'focus-1'),false);
});
test('deferral reuses deterministic ordering without hiding a real overdue deadline',()=>{
 const B=require('../focus-board-model.js'),t=task(),p=M.plan(t,'defer',{date:'2026-11-18'},day),other={...task(),id:'other',priority:'urgent',intake_details:{},due_at:null};
 assert.equal(B.order([other,p.after],day)[0].id,t.id);assert.equal(B.lane(p.after,day),'overdue');
 const follow={...t,id:'follow',due_at:null,intake_details:{follow_up:{date:'2026-11-14',time:null,timezone:'America/New_York',original_text:'Fictional follow-up'}}};
 assert.equal(B.lane(follow,day),'overdue');assert.equal(B.lane(M.plan(follow,'defer',{date:'2026-11-18'},day).after,day),'remaining');
});
