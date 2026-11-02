'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {jsPDF}=require('../vendor/jspdf-2.5.1.umd.min.js');
const M=require('../lease-preparation-model.js'),P=require('../lease-condition-pdf.js');
function sheet(beds=4,baths=2,additional=false){return M.buildReview({bedrooms:String(beds),bathrooms:String(baths),basement:'included',additionalRoom:additional,satisfactory:'',address:'111 Fictional Lane, Unit 2',conditions:{}}).page8}
function recording(){const pdf=new jsPDF({unit:'pt',format:[612,792]});const texts=[];const old=pdf.text.bind(pdf);pdf.text=(value,x,y,...rest)=>{texts.push({value:String(value),x,y,size:pdf.getFontSize()});return old(value,x,y,...rest)};return {pdf,texts}}
test('corrected sheets fit all supported bedroom and bathroom counts on one letter page',()=>{
 for(const beds of [2,3,4,5])for(const baths of [1,2,3]){
  const {pdf,layout}=P.generate(sheet(beds,baths),{JsPDF:jsPDF,viewerUser:()=> 'fictional-staff'});
  assert.equal(pdf.internal.getNumberOfPages(),1);assert.equal(pdf.internal.pageSize.getWidth(),612);assert.equal(pdf.internal.pageSize.getHeight(),792);assert.ok(layout.leftBottom<=635.1);assert.ok(layout.lineStep>=8);
  assert.ok(pdf.output('arraybuffer').byteLength>2000);
 }
});
test('bedrooms, bath groups and den retain their own headings and complete ordered fields',()=>{
 const s=sheet(3,3,true);s.rooms.find(r=>r.key==='additional').title='Den';s.rooms.find(r=>r.key==='bathroom-3').title='Primary bath';
 const {pdf,texts}=recording();P.draw(pdf,s);
 assert.ok(texts.some(x=>x.value==='DEN'));assert.ok(texts.some(x=>x.value==='Primary bath'));
 assert.equal(texts.filter(x=>x.value==='Ceiling').length,8); // Every room/group keeps its ceiling row.
 const leftLabels=texts.filter(x=>['Doors','Walls','Ceiling','Floor','Other'].includes(x.value)&&x.x===36);
 for(const group of s.rooms.filter(r=>r.key.startsWith('bedroom-'))){assert.ok(texts.some(x=>x.value===group.title.toUpperCase()))}
 assert.ok(leftLabels.every(x=>x.y<635));
});
test('overall answer and signatures are blank unless the staff enters an answer',()=>{
 const blank=recording();P.draw(blank.pdf,sheet());assert.equal(blank.texts.filter(x=>x.value==='X').length,0);
 const yes=recording(),s=sheet();s.satisfactory='Yes';P.draw(yes.pdf,s);assert.equal(yes.texts.filter(x=>x.value==='X').length,1);
 assert.equal(blank.texts.filter(x=>x.value==='Signature').length,5);
 assert.ok(blank.texts.some(x=>x.value.startsWith('DRAFT LAYOUT PREVIEW')));
});
test('condition values stay with their room and comments can express exceptions',()=>{
 const s=sheet(4,2);s.rooms.find(r=>r.key==='bedroom-4').entries.Floor='Refinished Hardwood';s.rooms.find(r=>r.key==='systems').entries.Comments='Fictional example: repair noted for this unit only.';
 const {pdf,texts}=recording();P.draw(pdf,s);assert.equal(texts.filter(x=>x.value==='Refinished Hardwood').length,1);assert.ok(texts.some(x=>x.value.includes('Fictional example')));
});
test('overflow and unsupported room plans fail without clipping or inventing extra pages',()=>{
 const s=sheet(5,3,true);assert.throws(()=>P.generate(s,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/five bedroom\/den/);
 const long=sheet();long.rooms[0].entries.Doors='X'.repeat(500);assert.throws(()=>P.generate(long,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/too long/);
 const notes=sheet();notes.rooms.find(r=>r.key==='systems').entries.Comments=Array(500).fill('word').join(' ');assert.throws(()=>P.generate(notes,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/exceed/);
 assert.throws(()=>P.generate(sheet(),{JsPDF:jsPDF,viewerUser:()=>null}),/Sign in/);
});
