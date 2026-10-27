'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../renewal-rules.js'),P=require('../renewal-pdf.js');
function example(){
 return {
  unitId:'00000000-0000-4000-8000-000000000001',
  leaseId:'00000000-0000-4000-8000-000000000002',
  verified:true,start:'2026-11-01',end:'2027-10-31',rent:'4,000.00',
  tenantName:'Fictional Resident',emails:'fictional@example.invalid',
  address:'111 Fictional Court',cityline:'Louisville, KY 40229',
  occupants:['Fictional Resident','','','',''],pets:'None',
  utilities:Object.fromEntries(R.utilities.map(k=>[k,'Tenant'])),
  appliances:Object.fromEntries(R.appliances.map(k=>[k,'No']))
 };
}
test('master assets are exactly five PNGs, each letter portrait and with no sample text file',()=>{
 for(let i=1;i<=5;i++){
  const p=path.join(__dirname,'..','renewal-assets','lease-master-page-'+i+'.png');
  const b=fs.readFileSync(p);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(b.readUInt32BE(16),1530);
  assert.equal(b.readUInt32BE(20),1980);
  assert.ok(b.length>20000);
 }
});
test('populated model matches renewal lease currency, 2026 reference dates and selections',()=>{
 const s=example();s.rent='1425';s.appliances.Microwave='Yes';
 const m=P.buildModel(s,R,new Date('2026-09-17T14:10:00Z'));
 assert.equal(m.generationDate,'09/17/2026');
 assert.equal(m.start,'11/01/2026');
 assert.equal(m.end,'10/31/2027');
 assert.equal(m.rentFormatted,'$1,425.00');
 assert.equal(m.fiveFormatted,'$71.25');
 assert.equal(m.tenFormatted,'$142.50');
 assert.equal(m.appliances.Microwave,'Yes');
});
test('invalid unreviewed inputs cannot export',()=>{
 const s=example();s.verified=false;assert.throws(()=>P.buildModel(s,R),/verified/);
 s.verified=true;s.utilities.Gas='';assert.throws(()=>P.buildModel(s,R),/Gas/);
});
test('render overlays on only page 1 of five and preserves the original master images',async()=>{
 class FakePDF{
  constructor(){this.pages=1;this.images=[];this.texts=[];this.size=10;}
  addPage(){this.pages++}
  addImage(bytes,type,x,y,w,h){assert.equal(type,'PNG');assert.equal(w,612);assert.equal(h,792);this.images.push({page:this.pages,bytes:bytes.length})}
  setFont(){}setFontSize(size){this.size=size}setTextColor(){}setFillColor(){}
  getTextWidth(value){return String(value).length*this.size*.45}
  text(value,x,y,opts){this.texts.push({page:this.pages,value,x,y,opts})}
  rect(){}
 }
 const calls=[];
 const fetchAsset=async path=>{calls.push(path);return {ok:true,arrayBuffer:async()=>new Uint8Array([137,80,78,71,13,10,26,10]).buffer}};
 const s=example();s.appliances.Microwave='Yes';
 const {pdf,model}=await P.generate(s,{rules:R,JsPDF:FakePDF,fetchAsset,viewerUser:()=> 'verified-staff-id',when:new Date('2026-10-27T12:00:00Z')});
 assert.equal(pdf.pages,5);assert.equal(pdf.images.length,5);
 assert.equal(pdf.texts.every(x=>x.page===1),true);
 assert.equal(pdf.texts.filter(x=>x.value==='X').length,5);
 assert.ok(pdf.texts.some(x=>x.value==='$4,000.00'));
 assert.ok(pdf.texts.some(x=>x.value==='Yes'));
 assert.equal(calls.length,5);
 assert.match(P.filename(model),/Renewal Rental Lease/);
});
test('account change while pages load aborts document',async()=>{
 let n=0;
 const fetchAsset=async()=>{n++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(10)}};
 await assert.rejects(()=>P.generate(example(),{rules:R,JsPDF:class{addImage(){} addPage(){} setFont(){}setFontSize(){}setTextColor(){}setFillColor(){}text(){}rect(){}getTextWidth(){return 1}},fetchAsset,viewerUser:()=>n>=1?'signed-out-user':'initial-user'}),/Account changed/);
});
