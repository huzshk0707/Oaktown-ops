'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../lease-page8-model.js');
const state=()=>({bedrooms:'3',bathrooms:'1',basement:'not-included',additionalRoom:false,conditions:{},roomLabels:{},roomLocations:{},roomPlacements:{}});
test('absent areas retain N/A labels with blank dependent conditions; unknown observations are never Good',()=>{
 const s=state();s.conditions['basement::Floor']='Old observation';const r=M.rooms(s),b=r.find(x=>x.key==='basement');assert.equal(b.label,'N/A');assert.ok(Object.values(b.entries).every(v=>v===''));assert.ok(Object.values(r.find(x=>x.key==='kitchen').entries).every(v=>v===''));assert.equal(M.values(s)['slot/bedroom-4/0/0/label'],'N/A');assert.equal(M.values(s)['slot/basement/0/0/Floor'],'');
});
test('a den occupies the original Bedroom 4 position without becoming a fourth bedroom',()=>{
 const s=state();s.additionalRoom=true;s.roomLabels.additional='DEN';s.roomPlacements.additional={section:'bedroom-4',column:0,row:0};s.conditions['additional::Floor']='Good & New Paint';assert.deepEqual(M.layoutProblems(s),[]);const v=M.values(s);assert.equal(v['slot/bedroom-4/0/0/label'],'DEN');assert.equal(v['slot/bedroom-4/0/0/Floor'],'Good & New Paint');assert.equal(s.bedrooms,'3');
});
test('five bedrooms and a master bathroom have separate identity, location and reviewed positions',()=>{
 const s=state();s.bedrooms='5';s.bathrooms='3';s.basement='included';s.roomLocations['bedroom-4']='BSMT';s.roomLabels['bathroom-3']='MASTER';s.roomPlacements['bathroom-3']={section:'bedroom-3',column:1,row:0};s.roomPlacements['bedroom-5']={section:'bedroom-5',column:0,row:0};s.conditions['bathroom-3::Other']='Toilet, Vanity, Tub, Shower - Good.';s.conditions['bedroom-3::Floor']='Refinished Hardwoods';assert.deepEqual(M.layoutProblems(s),[]);const v=M.values(s);assert.equal(v['slot/bedroom-3/1/0/label'],'MASTER');assert.equal(v['slot/bedroom-3/1/0/Other'],'Toilet, Vanity, Tub, Shower - Good.');assert.equal(v['slot/bedroom-3/0/0/Floor'],'Refinished Hardwoods');assert.equal(v['slot/bedroom-4/0/0/location'],'BSMT');
});
test('multiple bathroom rows in each existing column retain independent exact wording',()=>{
 const s=state();s.bathrooms='3';s.roomPlacements['bathroom-2']={section:'bathroom',column:0,row:1};s.roomPlacements['bathroom-3']={section:'bathroom',column:1,row:0};s.roomLocations['bathroom-1']='First Floor';s.roomLocations['bathroom-2']='Second Floor';s.roomLocations['bathroom-3']='Basement';s.conditions['bathroom-1::Floor']='New';s.conditions['bathroom-2::Floor']='Good';s.conditions['bathroom-3::Floor']='Fair — custom';assert.deepEqual(M.layoutProblems(s),[]);const v=M.values(s);assert.equal(v['slot/bathroom/0/0/Floor'],'New');assert.equal(v['slot/bathroom/0/1/Floor'],'Good');assert.equal(v['slot/bathroom/1/0/Floor'],'Fair — custom');
});
test('unplaced complex rooms, conflicting slots and sixth bedrooms cannot silently generate',()=>{
 const s=state();s.bedrooms='5';assert.match(M.layoutProblems(s).join(' '),/position/);s.bedrooms='6';assert.match(M.layoutProblems(s).join(' '),/Six-bedroom/);s.bedrooms='3';s.roomPlacements.living={section:'kitchen',column:0,row:0};assert.match(M.layoutProblems(s).join(' '),/same PDF position/);
});
test('presets include requested exact phrases while Custom preserves arbitrary text',()=>{for(const v of ['Fair','Good Granite','Refinished Hardwoods','N/A'])assert.equal(M.exactPreset(v),v);assert.equal(M.exactPreset('Good Tile; one crack near vanity'),'Custom');const s=state();s.conditions['kitchen::Floor']='Good & Fresh Paint / LVT';assert.equal(M.values(s)['slot/kitchen/0/0/Floor'],'Good & Fresh Paint / LVT');});
