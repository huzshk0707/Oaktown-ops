'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../notice-recipient.js');
const u='unit-current',old='unit-past';
const sample={
 tenancies:[{id:'tenancy-current',unit_id:u,status:'Current'},
            {id:'tenancy-past',unit_id:u,status:'Past'},
            {id:'tenancy-unrelated',unit_id:old,status:'Current'}],
 parties:[{tenancy_id:'tenancy-current',person_id:'a',party_role:'tenant'},
          {tenancy_id:'tenancy-current',person_id:'b',party_role:'tenant'},
          {tenancy_id:'tenancy-past',person_id:'retired',party_role:'tenant'},
          {tenancy_id:'tenancy-unrelated',person_id:'other',party_role:'tenant'}],
 people:[{id:'a',display_name:'Alex Example'},
         {id:'b',display_name:'Casey Example'},
         {id:'retired',display_name:'Prior Occupant'},
         {id:'other',display_name:'Neighbor Example'}]
};
test('prefills verified unit linkage with named tenants of one current tenancy only',()=>{
 const r=R.fromUnit(u,sample);
 assert.equal(r.name,'Alex Example and Casey Example');
 assert.match(r.reason,/verify/i);
});
test('does not substitute prior tenant or another unit name',()=>{
 assert.equal(R.fromUnit('no-current',sample).name,'');
 const r=R.fromUnit(u,{...sample,tenancies:sample.tenancies.filter(t=>t.status==='Past')});
 assert.equal(r.name,'');
 assert.equal(R.fromUnit(old,sample).name,'Neighbor Example');
});
test('ambiguous current tenancies leave field blank for manual review',()=>{
 const duplicate=structuredClone(sample);
 duplicate.tenancies.push({id:'another-current',unit_id:u,status:'Ending soon'});
 assert.equal(R.fromUnit(u,duplicate).name,'');
 assert.match(R.fromUnit(u,duplicate).reason,/More than one/i);
});
test('unnamed tenants, non-tenant people and missing names do not prefill',()=>{
 const d=structuredClone(sample);
 d.parties[0].party_role='occupant';
 d.people[1].display_name='';
 assert.equal(R.fromUnit(u,d).name,'');
});
test('month-to-month and ending-soon statuses remain eligible',()=>{
 for(const status of ['Current - month to month','Ending soon']){
  const d=structuredClone(sample);
  d.tenancies[0].status=status;
  assert.equal(R.fromUnit(u,d).name,'Alex Example and Casey Example');
 }
});
