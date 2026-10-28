'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {lookup}=require('../notice-contact.js');
const one='11111111-1111-4111-8111-111111111111';
const two='22222222-2222-4222-8222-222222222222';
const p='33333333-3333-4333-8333-333333333333';
const data={
 units:[{id:one,property_id:p},{id:two,property_id:p}],
 leases:[{id:'a',unit_id:one,tenancy_id:'t1'},{id:'b',unit_id:two,tenancy_id:'t2'},{id:'c',unit_id:one,tenancy_id:'t3'}],
 parties:[{tenancy_id:'t1',person_id:'a'},{tenancy_id:'t2',person_id:'b'},{tenancy_id:'t3',person_id:'c'}],
 people:[{id:'a',display_name:'Alex Example',email:'Alex@Example.invalid',contact_verification:'unverified'},
         {id:'b',display_name:'Blake Example',email:'blake@example.invalid',contact_verification:'unverified'},
         {id:'c',display_name:'Casey Example',email:'casey@example.invalid',contact_verification:'unverified'}]
};
test('exact selected unit and tenant match shows address with verify reminder',()=>{
 const result=lookup(data,one,'Alex Example');
 assert.deepEqual(result.emails,['alex@example.invalid']);
 assert.match(result.message,/verify/i);
});
test('never copy a different unit tenant email or infer from address',()=>{
 assert.deepEqual(lookup(data,one,'Blake Example').emails,[]);
 assert.deepEqual(lookup(data,p,'Alex Example').emails,[],'multiunit property UUID is not one unit');
 assert.deepEqual(lookup(data,'bad','Alex Example').emails,[]);
 assert.deepEqual(lookup(data,one,'All Occupants').emails,[]);
});
test('supports named joint recipients only when each has unique linked email',()=>{
 assert.deepEqual(lookup(data,one,'Alex Example and Casey Example').emails,['alex@example.invalid','casey@example.invalid']);
 assert.deepEqual(lookup(data,one,'Alex Example and Blake Example').emails,[]);
});
test('missing or conflicting email never exposes a guess',()=>{
 const missing=structuredClone(data);missing.people[0].email='';
 assert.deepEqual(lookup(missing,one,'Alex Example').emails,[]);
 const duplicate=structuredClone(data);
 duplicate.parties.push({tenancy_id:'t1',person_id:'different'});
 duplicate.people.push({id:'different',display_name:'Alex Example',email:'other@example.invalid'});
 assert.deepEqual(lookup(duplicate,one,'Alex Example').emails,[]);
});
test('legacy property link is accepted only for unambiguous single-unit property',()=>{
 const solo=structuredClone(data);solo.units=solo.units.filter(u=>u.id===one);
 assert.deepEqual(lookup(solo,p,'Alex Example').emails,['alex@example.invalid']);
 assert.deepEqual(lookup(null,one,'Alex Example').emails,[]);
});
