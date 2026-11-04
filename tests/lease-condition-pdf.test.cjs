'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {jsPDF}=require('../vendor/jspdf-2.5.1.umd.min.js');
const M=require('../lease-preparation-model.js'),P=require('../lease-condition-pdf.js');
function sheet(beds=4,baths=2,additional=false,basement='included'){
 return M.buildReview({bedrooms:String(beds),bathrooms:String(baths),basement,additionalRoom:additional,satisfactory:'',address:'111 Fictional Lane, Unit 2',conditions:{}}).page8;
}
function recording(){
 const pdf=new jsPDF({unit:'pt',format:[612,792]}),texts=[],lines=[];
 const text=pdf.text.bind(pdf),line=pdf.line.bind(pdf);
 pdf.text=(value,x,y,...rest)=>{texts.push({value:String(value),x,y,size:pdf.getFontSize()});return text(value,x,y,...rest)};
 pdf.line=(...args)=>{lines.push(args);return line(...args)};
 return {pdf,texts,lines};
}
test('all sixty bedroom/bathroom/basement/den layouts use identical one-page rules and room positions',()=>{
 let baseline;
 for(const beds of [1,2,3,4,5])for(const baths of [1,2,3])for(const basement of ['included','not-included'])for(const additional of [false,true]){
  const r=recording(),layout=P.draw(r.pdf,sheet(beds,baths,additional,basement));
  const headings=r.texts.filter(x=>/^(BEDROOM [1-5]|Bathroom [1-3]|BASEMENT|DEN \/ OTHER ROOM)$/.test(x.value));
  const geometry={lines:r.lines,headings,layout};
  if(baseline)assert.deepEqual(geometry,baseline);else baseline=geometry;
  assert.equal(r.pdf.internal.getNumberOfPages(),1);assert.equal(r.pdf.internal.pageSize.getWidth(),612);assert.equal(r.pdf.internal.pageSize.getHeight(),792);assert.ok(layout.leftBottom<=635.1);assert.ok(layout.lineStep>=8);
 }
});
test('room-array order cannot move fields into a different template slot',()=>{
 const s=sheet(3,2,true),first=recording(),reordered=recording();P.draw(first.pdf,s);s.rooms.reverse();P.draw(reordered.pdf,s);
 assert.deepEqual(reordered.texts,first.texts);assert.deepEqual(reordered.lines,first.lines);
});
test('two-bedroom sheet retains bedrooms three to five and the absent basement with N/A in every field',()=>{
 const s=sheet(2,1,false,'not-included');s.rooms.find(r=>r.key==='bedroom-4').entries.Doors='Stale observation must not print';
 const r=recording();P.draw(r.pdf,s);
 assert.equal(r.texts.filter(x=>x.value==='N/A').length,43);
 for(const heading of ['BEDROOM 1','BEDROOM 2','BEDROOM 3','BEDROOM 4','BEDROOM 5','BASEMENT','DEN / OTHER ROOM'])assert.ok(r.texts.some(x=>x.value===heading));
 assert.ok(!r.texts.some(x=>x.value.includes('Stale observation')));
});
test('room labels and den fields remain independent when every template section is present',()=>{
 const s=sheet(3,3,true);s.rooms.find(r=>r.key==='additional').title='Den';s.rooms.find(r=>r.key==='bathroom-3').title='Primary bath';
 const {pdf,texts}=recording();P.draw(pdf,s);
 assert.ok(texts.some(x=>x.value==='DEN'));assert.ok(texts.some(x=>x.value==='Primary bath'));
 assert.equal(texts.filter(x=>x.value==='Ceiling').length,10);
});
test('overall answer, findings and signatures stay blank until entered; N/A is not an observation',()=>{
 const blank=recording();P.draw(blank.pdf,sheet());assert.equal(blank.texts.filter(x=>x.value==='X').length,0);
 const yes=recording(),s=sheet();s.satisfactory='Yes';P.draw(yes.pdf,s);assert.equal(yes.texts.filter(x=>x.value==='X').length,1);
 assert.equal(blank.texts.filter(x=>x.value==='Signature').length,5);assert.ok(blank.texts.some(x=>x.value.startsWith('DRAFT LAYOUT PREVIEW')));
 const unknown=sheet(2,1,false,'');assert.equal(unknown.rooms.find(x=>x.key==='basement').applicable,null);assert.ok(Object.values(unknown.rooms.find(x=>x.key==='basement').entries).every(x=>x===''));
});
test('condition values stay with their room and comments can express exceptions',()=>{
 const s=sheet(4,2);s.rooms.find(r=>r.key==='bedroom-4').entries.Floor='Refinished Hardwood';s.rooms.find(r=>r.key==='systems').entries.Comments='Fictional example: repair noted for this unit only.';
 const {pdf,texts}=recording();P.draw(pdf,s);assert.equal(texts.filter(x=>x.value==='Refinished Hardwood').length,1);assert.ok(texts.some(x=>x.value.includes('Fictional example')));
});
test('overflow, dropped sections and unsupported counts fail before a PDF is returned',()=>{
 const long=sheet();long.rooms[0].entries.Doors='X'.repeat(500);assert.throws(()=>P.generate(long,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/too long/);
 const notes=sheet();notes.rooms.find(r=>r.key==='systems').entries.Comments=Array(500).fill('word').join(' ');assert.throws(()=>P.generate(notes,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/exceed/);
 const incomplete=sheet();incomplete.rooms=incomplete.rooms.filter(r=>r.key!=='bedroom-5');assert.throws(()=>P.generate(incomplete,{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/every room group/);
 assert.throws(()=>P.generate(sheet(6),{JsPDF:jsPDF,viewerUser:()=> 'staff'}),/one-to-five/);
 assert.throws(()=>P.generate(sheet(),{JsPDF:jsPDF,viewerUser:()=>null}),/Sign in/);
});
