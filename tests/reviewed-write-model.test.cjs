'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../reviewed-write-model.js'),T=require('../task-edit-model.js'),R=require('../renewal-tracking-rules.js');

test('a reviewed write must pass checking and independent verification before success',()=>{
 const flow=W.create();assert.equal(flow.start('submit'),null);assert.equal(flow.open(),true);
 const ticket=flow.start('submit');assert.equal(flow.phase,'checking');assert.equal(flow.busy,true);
 assert.equal(flow.start('submit'),null);assert.equal(flow.advance(ticket,'verified'),false);
 assert.equal(flow.advance(ticket,'approved'),true);assert.equal(flow.phase,'saving');
 assert.equal(flow.advance(ticket,'received'),true);assert.equal(flow.phase,'verifying');
 assert.equal(flow.advance(ticket,'verified'),true);assert.equal(flow.phase,'saved');assert.equal(flow.busy,false);
 assert.equal(flow.current(ticket),false);assert.equal(flow.advance(ticket,'failed'),false);
});
test('uncertain writes require a reload and a fresh review; late and foreign tickets cannot change state',()=>{
 const flow=W.create();flow.open();const old=flow.start('submit');flow.advance(old,'approved');
 flow.advance(old,'failed');assert.equal(flow.phase,'needs_review');assert.equal(flow.start('submit'),null);
 const read=flow.start('reload');assert.equal(flow.advance(old,'received'),false);
 assert.equal(flow.advance(read,'failed'),true);const retry=flow.start('reload');
 flow.advance(retry,'loaded');assert.equal(flow.phase,'reviewing');
 const write=flow.start('submit');flow.reset();assert.equal(flow.busy,false);flow.open();
 const next=flow.start('submit');assert.equal(flow.advance(write,'approved'),false);
 const other=W.create();other.open();assert.equal(flow.advance(other.start('submit'),'approved'),false);
 assert.equal(flow.current(next),true);assert.deepEqual(flow.snapshot().allowed,['approved','rejected']);
 assert.deepEqual(Object.keys(flow.snapshot()),['phase','busy','allowed']);
});
test('every rejected preflight and stale review returns to a recoverable state without enabling another write',()=>{
 const flow=W.create();flow.open();const ticket=flow.start('submit');flow.advance(ticket,'rejected');
 assert.equal(flow.phase,'needs_review');assert.equal(flow.busy,false);assert.equal(flow.can('submit'),false);
 flow.reset();flow.open();assert.equal(flow.stale(),true);assert.equal(flow.can('reload'),true);
 assert.equal(Object.isFrozen(W.transitions.reviewing),true);
});
test('a stalled request has a bounded wait, aborts the client fetch and never turns a late result into success',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let release,signal;
 const pending=new Promise(resolve=>{release=resolve});
 const request=W.withTimeout(value=>{signal=value;return pending});
 const rejected=assert.rejects(request,/timed out/);await Promise.resolve();
 context.mock.timers.tick(20000);await rejected;assert.equal(signal.aborted,true);
 release('late saved receipt');await Promise.resolve();
 assert.equal(await W.withTimeout(()=>Promise.resolve('verified response')),'verified response');
});
test('task verification checks identity, version precision, every edited field and archived state',()=>{
 const changes={task_title:'Fictional task',status:'waiting',priority:'high',assigned_label:null,property_id:'p1',unit_id:null,lease_id:null,renewal_case_id:null,notes:'Reviewed note',next_action:'Follow up',due_date:'2026-11-12',follow_up_date:null};
 const receipt={task_id:'t1',updated_at:'2026-11-11T12:00:00.123456+00:00'};
 const row={...changes,id:'t1',updated_at:'2026-11-11T12:00:00.123456Z',archived_at:null,intake_details:{next_action:changes.next_action,due:{date:changes.due_date}}};
 const verify=(item=row,ack=receipt)=>T.verified('t1',ack,[item],changes);
 assert.equal(verify(),true);
 for(const key of ['task_title','status','priority','assigned_label','property_id','unit_id','lease_id','renewal_case_id','notes'])assert.equal(verify({...row,[key]:'Wrong saved value'}),false,key);
 assert.equal(verify({...row,intake_details:{}}),false);assert.equal(verify({...row,archived_at:'2026-11-11'}),false);
 assert.equal(verify({...row,id:'other'}),false);assert.equal(verify(row,{...receipt,task_id:'other'}),false);
 assert.equal(verify({...row,updated_at:'2026-11-11T12:00:00.123457Z'}),false);
 assert.equal(T.verified('t1',receipt,[row,row],changes),false);
 assert.equal(W.sameVersion('2026-11-11T12:00:00.000000+00:00','2026-11-11T12:00:00Z'),true);
 assert.equal(W.sameVersion('bad','bad'),false);
});
test('renewal verification requires the saved event and reviewed case, actor, status, notes and prior event',()=>{
 const payload=R.eventPayload('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',{status:'preparing',message:'Preparing fictional draft',note:'Source checked',nextAction:'Review'},'prior');
 const row={...payload,id:'event-1',occurred_at:'2026-11-11T12:00:00Z'};
 assert.equal(R.verified(payload,{id:row.id},[row]),true);
 for(const key of ['entity_id','entity_type','event_type','actor_id','summary'])assert.equal(R.verified(payload,row,[{...row,[key]:'other'}]),false,key);
 for(const key of Object.keys(payload.event_metadata))assert.equal(R.verified(payload,row,[{...row,event_metadata:{...row.event_metadata,[key]:'other'}}]),false,key);
 assert.equal(R.verified(payload,row,[{...row,id:'other'}]),false);assert.equal(R.verified(payload,row,[]),false);
});
