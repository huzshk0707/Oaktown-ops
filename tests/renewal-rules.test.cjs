'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../renewal-rules.js');
test('renewal terms follow full prior 12-month terms and preserve end-of-month boundaries',()=>{
 assert.deepEqual(R.suggestTerm('2025-11-01','2026-10-31'),{start:'2026-11-01',end:'2027-10-31',method:'calendar-months'});
 assert.deepEqual(R.suggestTerm('2026-05-01','2026-10-31'),{start:'2026-11-01',end:'2027-04-30',method:'calendar-months'});
 assert.equal(R.suggestTerm('2026-10-31','2026-01-01'),null);
});
test('currency format is exact with separators and cents; no floating imprecision',()=>{
 assert.equal(R.moneyCents('4,000.00'),400000);
 assert.equal(R.moneyCents('1425'),142500);
 assert.equal(R.moneyCents('1,234.567'),null);
 assert.equal(R.formatCents(400000),'$4,000.00');
 assert.deepEqual(R.fees(142500),{five:7125,ten:14250});
 assert.equal(R.formatCents(R.fees(400000).ten),'$400.00');
});
test('dates are MM/DD/YYYY and invalid dates are rejected',()=>{
 assert.equal(R.displayDate('2026-11-01'),'11/01/2026');
 assert.equal(R.parseISO('2026-02-30'),null);
});
test('no presumed responsibility, appliances or historical identity can sneak into a generated lease',()=>{
 const s={unitId:'unit-a',leaseId:'lease-a',verified:false,start:'2026-11-01',end:'2027-10-31',rent:'4000',tenantName:'Test Resident',address:'Test Court',occupants:['Test Resident'],utilities:{},appliances:{}};
 assert.ok(R.validate(s).some(x=>x.includes('verified')));
 assert.ok(R.validate(s).some(x=>x.includes('Water')));
 s.verified=true;
 for(const k of R.utilities)s.utilities[k]='Tenant';
 for(const k of R.appliances)s.appliances[k]='No';
 assert.deepEqual(R.validate(s),[]);
 s.utilities.Gas='';assert.ok(R.validate(s).some(x=>x.includes('Gas')));
});
