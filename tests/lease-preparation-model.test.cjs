'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../lease-preparation-model.js'),R=require('../renewal-rules.js');
function fixture(){return {approvalReviewed:true,depositStepReviewed:true,leaseDate:'2026-11-02',start:'2026-12-01',end:'2027-11-30',tenantName:'Fictional Resident',emails:'fictional@example.invalid',address:'111 Fictional Road, Unit 2',cityline:'Example City, KY 40201',rent:'1,234.56',deposit:'800',occupants:['Fictional Resident'],pets:'None — verified',utilities:Object.fromEntries(R.utilities.map(k=>[k,'Tenant'])),appliances:Object.fromEntries(R.appliances.map(k=>[k,'No'])),bedrooms:'2',bathrooms:'1',basement:'not-included',conditions:{'kitchen::Doors':'Good & Fresh Paint'},conditionsReviewed:true,satisfactory:'Yes'}}
test('late-charge labels stay fixed while manual dollar overrides agree on pages 1 and 10',()=>{
 let s=fixture(),r=M.buildReview(s);assert.equal(r.page1.lateFive,'$61.73');assert.equal(r.page10.lateTen,'$123.46');
 s.fiveOverride='0';s.tenOverride='150.25';s.rent='2000';r=M.buildReview(s);
 assert.equal(r.fees.five.percent,5);assert.equal(r.fees.ten.percent,10);assert.equal(r.page1.lateFive,'$0.00');assert.equal(r.page1.lateFive,r.page10.lateFive);assert.equal(r.page1.lateTen,r.page10.lateTen);assert.equal(r.page10.lateTen,'$150.25');
 assert.equal(M.calculateFees('1000','',null).five.cents,null);
 assert.equal(M.calculateFees('1000','10.001',null).five.cents,null);
});
test('deposit components never invent a printed total or apply an application credit',()=>{
 const s={...fixture(),deposit:'',securityDeposit:'1000',petDeposit:'300',otherFee:'100',petRent:'25'};
 let r=M.buildReview(s);assert.equal(r.page1.depositToPrint,'Not entered');assert.ok(r.missing.some(x=>x.includes('deposit box')));
 s.deposit='750';r=M.buildReview(s);assert.equal(r.page1.depositToPrint,'$750.00');assert.equal(r.deposits.pet,'$300.00');assert.equal(r.deposits.monthlyPetRent,'$25.00');
});
test('bedroom layouts use only the selected rooms and never prefill example conditions',()=>{
 for(const beds of [2,3,4,5]){
  const r=M.buildReview({...fixture(),bedrooms:String(beds),conditions:{}});
  assert.equal(r.rooms.filter(x=>x.key.startsWith('bedroom-')).length,beds);
  assert.ok(r.rooms.every(room=>Object.values(room.entries).every(x=>x==='')));
 }
 const notes={'bedroom-5::Doors':'Private fictional observation'};
 const two=M.buildReview({...fixture(),conditions:notes});assert.ok(!two.rooms.some(x=>x.key==='bedroom-5'));assert.equal(JSON.stringify(two.page8).includes(notes['bedroom-5::Doors']),false);
 const five=M.buildReview({...fixture(),bedrooms:'5',conditions:notes});assert.equal(five.rooms.find(x=>x.key==='bedroom-5').entries.Doors,notes['bedroom-5::Doors']);
});
test('a filled field review cannot enable a ten-page export before source approval',()=>{
 const s={...fixture(),cleanMasterApproved:true,depositRulesConfirmed:true,blankConditionPageReceived:true};
 const r=M.buildReview(s);assert.deepEqual(r.missing,[]);assert.equal(r.canExport,false);assert.equal(r.sourceBlockers.length,6);assert.equal(M.source.pages,10);assert.deepEqual(M.source.editablePages,[1,8,10]);
});
test('missing context stays unknown; invalid terms, service choices and unsupported counts need review',()=>{
 const r=M.readiness({...fixture(),start:'2026-02-30',deposit:'garbage',bedrooms:'6',bathrooms:'0',basement:'',utilities:{},pets:'',fiveOverride:'-1'});
 for(const phrase of ['lease term','deposit box','Water','pet description','bedroom count','bathroom count','basement','late-charge'])assert.ok(r.missing.some(x=>x.includes(phrase)),phrase);
 assert.ok(M.readiness({}).missing.length>15);
});
