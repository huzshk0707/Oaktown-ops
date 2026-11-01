'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../eod-model.js');
const date='2026-11-01';
const work=(id,minutes,basis='user_estimate',day=date)=>({id,event_type:'task_work_recorded',event_metadata:{activity:{work_date:day,summary:'Fictional batch work',minutes,duration_basis:basis}}});
const task=(id,at='2026-11-01T19:00:00Z')=>({id,status:'completed',task_title:'Fictional completed task',completed_at:at,intake_details:{completion_summary:'Fictional details'}});
test('EOD counts a batch duration once and keeps estimates separate from reported time',()=>{
 const r=M.build([work('a',90),work('b',10,'reported'),work('c',null,'not_provided')],Array.from({length:9},(_,i)=>task(String(i))),date,{includeTime:true});
 assert.equal(r.estimated,90);assert.equal(r.reported,10);assert.equal(r.unknown,1);assert.equal(r.workCount,3);assert.equal(r.completedCount,9);assert.match(r.text,/Known recorded time: 100 minutes/);assert.match(r.text,/90 minutes \(estimated by you\)/);
});
test('completed tasks without work entries never invent time',()=>{
 const r=M.build([], [task('a')],date);assert.equal(r.completedCount,1);assert.equal(r.workCount,0);assert.equal(r.reported+r.estimated,0);assert.doesNotMatch(r.text,/minutes/);
});
test('EOD focuses on work done by default and requires explicit time inclusion',()=>{
 const r=M.build([work('a',90)],[task('a')],date);assert.match(r.text,/Fictional batch work/);assert.match(r.text,/Fictional details/);assert.doesNotMatch(r.text,/minutes|Recorded time|recorded time/);
});
test('completed work is listed once without repeating the linked activity duration in the default report',()=>{
 const entry=work('e',90);entry.entity_id='t';entry.event_metadata.activity.summary='Fictional batch; 90 estimated minutes';const r=M.build([entry],[task('t')],date);assert.match(r.text,/Fictional details/);assert.doesNotMatch(r.text,/90|minutes/);assert.equal(r.workCount,1);
});
test('work date and Eastern completion date are independent, including DST transitions',()=>{
 const tasks=[task('before','2026-11-01T03:59:00Z'),task('first','2026-11-01T05:30:00Z'),task('second','2026-11-01T06:30:00Z'),task('next','2026-11-02T05:00:00Z')];
 const r=M.build([work('a',90),work('other',20,'reported','2026-11-02')],tasks,date);assert.equal(r.workCount,1);assert.equal(r.completedCount,2);assert.equal(r.estimated,90);
});
test('invalid dates, malformed durations, duplicate identities and capped results fail closed',()=>{
 assert.throws(()=>M.build([],[],'2026-02-30'),/valid work date/);
 for(const value of [-1,NaN,'90',null])assert.throws(()=>M.build([work('a',value)],[],date),/duration/);
 assert.throws(()=>M.build([work('a',90),work('a',90)],[],date),/identity/);
 assert.throws(()=>M.build(Array(1000).fill(work('a',1)),[],date),/No partial report/);
 assert.throws(()=>M.build([],Array(1000).fill(task('a')),date),/No partial report/);
});
