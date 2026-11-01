'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../workspace-clocks.js');
test('Eastern and India clocks show the same instant across the date boundary',()=>{
 const v=C.format(new Date('2026-11-01T20:00:00Z'));
 assert.equal(v.eastern.time,'03:00:00 PM');assert.equal(v.eastern.date,'Sun, Nov 1');assert.equal(v.eastern.zone,'EST');
 assert.equal(v.india.time,'01:30:00 AM');assert.equal(v.india.date,'Mon, Nov 2');assert.equal(v.india.zone,'IST');
});
test('Eastern falls back from EDT to EST while India continues forward',()=>{
 const before=C.format(new Date('2026-11-01T05:59:59Z')),after=C.format(new Date('2026-11-01T06:00:00Z'));
 assert.equal(before.eastern.time,'01:59:59 AM');assert.equal(before.eastern.zone,'EDT');
 assert.equal(after.eastern.time,'01:00:00 AM');assert.equal(after.eastern.zone,'EST');
 assert.equal(before.india.time,'11:29:59 AM');assert.equal(after.india.time,'11:30:00 AM');
});
test('Eastern spring forward skips the missing hour',()=>{
 const before=C.format(new Date('2026-03-08T06:59:59Z')),after=C.format(new Date('2026-03-08T07:00:00Z'));
 assert.equal(before.eastern.time,'01:59:59 AM');assert.equal(before.eastern.zone,'EST');
 assert.equal(after.eastern.time,'03:00:00 AM');assert.equal(after.eastern.zone,'EDT');
 assert.equal(after.india.time,'12:30:00 PM');
});
