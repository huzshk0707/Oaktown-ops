'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../lease-template-profile.js'),E=require('../lease-template-pdf.js'),L=require('../vendor/lease-pdf/pdf-lib-1.17.1.min.js');
for(const name of require('./lease-template-variants.cjs').names)test('original checklist profile: '+name,async()=>{
 const f=await require('./lease-template-variants.cjs').variant(name);f.state.roomPlacements=P.suggestPlacements(f.state,name.includes('master')?'master':'columns');
 // The measured source fields are tight; explicit short observations fit.
 for(const k of Object.keys(f.state.conditions))f.state.conditions[k]='Good';
 f.state.roomLocations={};f.state.roomLabels={};
 const bytes=await P.page8Preview(f.state,{PDFLib:L,E,viewerUser:()=> 'fictional'}),doc=await L.PDFDocument.load(bytes);assert.equal(doc.getPageCount(),1);assert.deepEqual(doc.getPage(0).getSize(),{width:612,height:792});
 f.state.conditions['kitchen::Floor']='W'.repeat(500);await assert.rejects(P.page8Preview(f.state,{PDFLib:L,E,viewerUser:()=> 'fictional'}),/too wide/);
});
test('grouped fields retain distinct text and reject invalid sources',async()=>{assert.equal(E.fieldValue({key:'a',sources:[{key:'b',label:'Second Floor'}],primaryLabel:'First Floor',join:' & '},{a:'New',b:'Good'}),'First Floor - New & Second Floor - Good');const f=await require('./lease-template-fixture.cjs').fixture();f.data.template.map.fields.at(-1).sources=[{key:'slot/invalid/0/0/Floor',label:''}];await assert.rejects(E.generate(f.bytes,f.data,{viewerUser:()=> 'fictional'}),/grouped/);});
