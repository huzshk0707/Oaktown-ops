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
test('every layout retains the complete template and marks excluded areas N/A without inventing observations',()=>{
 for(const beds of [1,2,3,4,5]){
  const r=M.buildReview({...fixture(),bedrooms:String(beds),conditions:{}});
  assert.equal(r.rooms.filter(x=>x.key.startsWith('bedroom-')).length,5);
  assert.equal(r.rooms.filter(x=>x.key.startsWith('bedroom-')&&x.applicable).length,beds);
  assert.ok(r.rooms.every(room=>Object.values(room.entries).every(x=>x===(room.applicable===false?'N/A':''))));
  assert.ok(r.missing.some(x=>x.includes('Record unit-specific')));
  assert.equal(r.conditionCount.entered,0);
 }
 const notes={'bedroom-5::Doors':'Private fictional observation'};
 const two=M.buildReview({...fixture(),conditions:notes});assert.equal(two.rooms.find(x=>x.key==='bedroom-5').entries.Doors,'N/A');assert.equal(JSON.stringify(two.page8).includes(notes['bedroom-5::Doors']),false);
 const five=M.buildReview({...fixture(),bedrooms:'5',conditions:notes});assert.equal(five.rooms.find(x=>x.key==='bedroom-5').entries.Doors,notes['bedroom-5::Doors']);
 const basement=two.rooms.find(x=>x.key==='basement');assert.ok(Object.values(basement.entries).every(x=>x==='N/A'));
 assert.equal(two.conditionCount.notApplicable,43);
});
test('a filled field review cannot enable a ten-page export before source approval',()=>{
 const s={...fixture(),cleanMasterApproved:true,depositRulesConfirmed:true,blankConditionPageReceived:true};
 const r=M.buildReview(s);assert.deepEqual(r.missing,[]);assert.equal(r.canExport,false);assert.ok(r.sourceBlockers.some(x=>x.includes('Deposit rules')));assert.ok(!r.sourceBlockers.some(x=>x.includes('replacement condition sheet is still needed')));assert.equal(M.source.pages,10);assert.deepEqual(M.source.editablePages,[1,8,10]);
});
test('missing context stays unknown; invalid terms, service choices and unsupported counts need review',()=>{
 const r=M.readiness({...fixture(),start:'2026-02-30',deposit:'garbage',bedrooms:'6',bathrooms:'0',basement:'',utilities:{},pets:'',fiveOverride:'-1'});
 for(const phrase of ['lease term','deposit box','Water','pet description','bedroom count','bathroom count','basement','late-charge'])assert.ok(r.missing.some(x=>x.includes(phrase)),phrase);
 assert.ok(M.readiness({}).missing.length>15);
});

test('source-derived room labels, optional den and condition choices remain explicit',()=>{
 const s={...fixture(),bedrooms:'3',additionalRoom:true,roomLabels:{'bedroom-3':'Primary bedroom','bathroom-1':'Main bath',additional:'Den'}};
 const r=M.buildReview(s);assert.equal(r.rooms.find(x=>x.key==='additional').title,'Den');assert.equal(r.rooms.find(x=>x.key==='bedroom-3').title,'Primary bedroom');assert.equal(r.rooms.find(x=>x.key==='bathroom-1').title,'Main bath');assert.ok(r.rooms.find(x=>x.key==='additional').items.includes('Ceiling'));
 for(const phrase of ['Rekeyed','New Paint','Refinished Hardwood','Good Laminate','N/A'])assert.ok(M.conditionOptions.includes(phrase));
 assert.ok(r.rooms.every(x=>x.key==='kitchen'||Object.values(x.entries).every(v=>v===(x.applicable===false?'N/A':''))));
});

test('unknown room counts and basement presence stay unconfirmed rather than being marked N/A',()=>{
 const r=M.buildReview({...fixture(),bedrooms:'',bathrooms:'',basement:'',conditions:{}});
 for(const room of r.rooms.filter(x=>x.key.startsWith('bedroom-')||x.key.startsWith('bathroom-')||x.key==='basement')){
  assert.equal(room.applicable,null);assert.ok(Object.values(room.entries).every(value=>value===''));
 }
});
