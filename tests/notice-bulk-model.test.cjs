'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const bulk=require('../notice-bulk-model.js');
const item=(id,street,unitDisplay='',propertyAliases=[],unitAliases=[])=>({
 unit:{id,unit_code:'UNIT-'+id},prop:{street_address:street,city:'Fiction City',state:'KY',postal_code:'40000'},unitDisplay,propertyAliases,unitAliases
});
const directory=[
 item('u1','111 Lantana Example Road','Unit 1',['Lantana']),
 item('u2','111 Lantana Example Road','Unit 2',['Lantana']),
 item('u3','222 Sequoia Example Way','Apt 4',[],['Sequoia Apartment']),
 item('u4','1111 Lantana Example Road','',[])
];
test('pasted rows preserve deliberate order and remove only list bullets',()=>{
 assert.deepEqual(bulk.parse('  1. Sequoia\n- Lantana\n\n3) 1111 Lantana\n'),['Sequoia','Lantana','1111 Lantana']);
 assert.deepEqual(bulk.parse('123 Main Street\n456 Second Street'),['123 Main Street','456 Second Street']);
 assert.throws(()=>bulk.parse(Array(251).fill('Lantana').join('\n')),/250/);
});
test('name and property alias ambiguity requires choosing unit, never silently taking first',()=>{
 assert.equal(bulk.match('Lantana',directory).length,2);
 assert.deepEqual(bulk.match('Lantana unit 2',directory).map(x=>x.unit.id),['u2']);
 assert.deepEqual(bulk.match('Sequoia Apartment',directory).map(x=>x.unit.id),['u3']);
 assert.deepEqual(bulk.match('1111 Lantana Example Road',directory).map(x=>x.unit.id),['u4']);
 assert.deepEqual(bulk.match('999 Unknown',directory),[]);
});
test('exact words prevent house and unit number prefix collisions',()=>{
 assert.deepEqual(bulk.match('1111 Lantana',directory).map(x=>x.unit.id),['u4']);
 assert.deepEqual(bulk.match('Lantana unit 1',directory).map(x=>x.unit.id),['u1']);
});
test('unresolved and duplicate choices block creation, preserving row sequence',()=>{
 const rows=bulk.matchList(['Sequoia','Lantana','Lantana'],directory);
 assert.equal(bulk.review(rows).ready,false);
 rows[1].selectedId='u1';rows[2].selectedId='u1';
 assert.deepEqual(bulk.review(rows).duplicateIds,['u1']);
 rows[2].selectedId='u2';
 assert.deepEqual(bulk.review(rows),{ready:true,unresolved:0,duplicateIds:[],selectedIds:['u3','u1','u2']});
 assert.deepEqual(bulk.orderedItems(directory,new Set(['u3','u1','u2'])).map(x=>x.unit.id),['u3','u1','u2']);
});
