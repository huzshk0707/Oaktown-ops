'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../bill-reminders-model.js'),T=require('../today-model.js');
const id='11111111-1111-4111-8111-111111111111',event='22222222-2222-4222-8222-222222222222';
const rule=(extra={})=>({id,label:'Fictional Card',recipient:'Example Manager',day_from:4,day_through:6,kind:'payment',instructions:'Check the current statement and confirm payment.',start_month:'2026-11-01',lead_days:3,active:true,...extra});
const data=(r=rule(),occurrences=[])=>({rules:[r],occurrences,can_edit:true});
const state=(extra={})=>({rule_id:id,period:'2026-11-01',revision:1,reminded_at:'2026-11-04T14:00:00Z',verified_at:null,note:null,last_action:'reminded',last_event_id:event,updated_at:'2026-11-04T14:00:00Z',...extra});
test('monthly windows alert early, retain unconfirmed work and keep sent reminders separate from payment',()=>{
 assert.equal(M.project(data(),'2026-10-31').attention.length,0);
 assert.equal(M.project(data(),'2026-11-01').attention[0].phase,'upcoming');
 assert.equal(M.project(data(),'2026-11-05').attention[0].phase,'window');
 const item=M.project(data(rule(),[state()]),'2026-11-09').attention[0];assert.equal(item.phase,'check');assert.equal(item.verified,false);
 assert.match(M.message(item),/Nov 4–Nov 6/);assert.match(M.priority(item),/Remind Example Manager/);
 const verified=state({last_action:'verified',verified_at:'2026-11-05T14:00:00Z',note:'Manager confirmed payment'});
 assert.equal(M.project(data(rule(),[verified]),'2026-11-09').attention.length,0);
 const next=M.project(data(rule(),[verified]),'2026-12-04');assert.equal(next.attention.length,1);assert.equal(next.attention[0].period,'2026-12-01');assert.equal(next.attention[0].revision,0);
});
test('year and leap-month boundaries use calendar dates; older unconfirmed months are retained',()=>{
 const d=data(rule({start_month:'2027-01-01',day_from:2,day_through:2}));assert.equal(M.project(d,'2026-12-30').attention[0].from,'2027-01-02');
 const end=data(rule({start_month:'2028-02-01',day_from:30,day_through:31}));assert.equal(M.project(end,'2028-02-29').attention[0].through,'2028-02-29');
 assert.equal(M.project(data(),'2027-01-09').attention.length,3);
 assert.equal(T.today(new Date('2026-11-10T02:00:00Z')),'2026-11-09');
});
test('autopay checks and inactive schedules are explicit; malformed or duplicate records fail closed',()=>{
 const item=M.project(data(rule({kind:'autopay_check'})),'2026-11-04').attention[0];assert.match(M.message(item),/verify the autopay payment/);
 assert.equal(M.project(data(rule({active:false})),'2026-11-04').attention.length,0);
 for(const d of [[],{rules:[],occurrences:[]},data(rule({day_through:2})),data(rule({lead_days:-1})),data(rule({start_month:'2026-02-30'})),data(rule(),[state(),state()])])assert.throws(()=>M.validate(d));
 assert.throws(()=>M.project(data(),'2026-02-30'));
});
test('readback must match the exact month, action, version and audit event, not only a receipt',()=>{
 const o=state(),d=data(rule(),[o]),req={p_rule:id,p_period:'2026-11-01',p_action:'reminded',p_expected_revision:0,p_note:null};assert.equal(M.matches(o,d,req),true);
 for(const patch of [{rule_id:event},{period:'2026-12-01'},{revision:2},{last_event_id:id},{reminded_at:null},{note:'different'}])assert.equal(M.matches({...o,...patch},d,req),false);
 assert.equal(M.matches(o,d,{...req,p_expected_revision:1}),false);
});
test('calendar has monthly recurrence, Eastern time, lead and day-of reminders, escaping and byte-safe folding',()=>{
 const r=rule({label:'Fictional, Card; '+ 'é'.repeat(70),instructions:'Check statement; review, confirm.',day_from:30,day_through:31}),ics=M.calendar(data(r),new Date('2026-11-09T15:00:00Z'));
 assert.match(ics,/DTSTAMP:20261109T150000Z/);assert.match(ics,/TZID:America\/New_York/);assert.match(ics,/RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30;BYSETPOS=-1/);assert.match(ics,/TRIGGER:-P3D/);assert.match(ics,/TRIGGER:PT0S/);assert.match(ics,/Fictional\\, Card\\;/);
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(ics.replace(/\r\n /g,''),/do not sync payment confirmations/);
});
