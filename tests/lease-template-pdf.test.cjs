'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),L=require('../vendor/lease-pdf/pdf-lib-1.17.1.min.js'),E=require('../lease-template-pdf.js'),{fixture}=require('./lease-template-fixture.cjs');
const opts={viewerUser:()=> 'fictional-staff'};
test('original ten-page dimensions, order and content streams survive additive overlays',async()=>{
 const f=await fixture(),out=await E.generate(f.bytes,f.data,opts),before=await L.PDFDocument.load(f.bytes),after=await L.PDFDocument.load(out.bytes);
 assert.equal(after.getPageCount(),10);assert.equal(await E.hash(f.bytes),f.data.template.map.templateSha256);
 for(let i=0;i<10;i++){
  assert.deepEqual(after.getPage(i).getSize(),before.getPage(i).getSize());
  const a=before.getPage(i).node.Contents(),b=after.getPage(i).node.Contents();
  for(const stream of a.asArray().map(x=>before.context.lookup(x)))assert.ok(b.asArray().map(x=>after.context.lookup(x)).some(x=>Buffer.from(x.contents).equals(Buffer.from(stream.contents))),'Original stream changed on page '+(i+1));
 }
});
test('mismatched originals, unreviewed mapping, clipped text and signature collisions fail explicitly',async()=>{
 let f=await fixture();f.data.template.map.templateSha256='0'.repeat(64);await assert.rejects(E.generate(f.bytes,f.data,opts),/exact original/);
 f=await fixture();f.data.template.mappingReviewed=false;await assert.rejects(E.generate(f.bytes,f.data,opts),/Review the approved/);
 f=await fixture();f.state.conditions['kitchen::Floor']='W'.repeat(200);await assert.rejects(E.generate(f.bytes,f.data,opts),/too wide/);
 f=await fixture();f.data.template.map.fields.at(-1).y=80;await assert.rejects(E.generate(f.bytes,f.data,opts),/signature/);
});
test('final export requires exact server-approved data, complete mapping and no sixth-bedroom generation',async()=>{
 const f=await fixture();await assert.rejects(E.generate(f.bytes,f.data,{...opts,final:true}),/server receipt/);
 const approval={id:'fictional-case',version:3,status:'approved',data:structuredClone(f.data),receipt:{schema_version:'oaktown.lease-preparation-receipt.v1',id:'fictional-case',version:3,template_sha256:f.data.template.map.templateSha256}};
 assert.equal((await E.generate(f.bytes,f.data,{...opts,final:true,approval})).final,true);
 f.state.address='Changed after review';await assert.rejects(E.generate(f.bytes,f.data,{...opts,final:true,approval}),/exact saved/);
 f.state.bedrooms='6';await assert.rejects(E.generate(f.bytes,f.data,opts),/Six-bedroom/);
});
test('entered conditions and edited room labels cannot be dropped from final mapping',async()=>{
 const f=await fixture();f.state.conditions['bedroom-3::Floor']='Good Tile';f.state.roomLabels['bedroom-3']='MASTER';const issues=E.coverage(f.data).join(' ');assert.match(issues,/observation would otherwise be omitted/);assert.match(issues,/edited label/);
});
test('filled form fields and non-ten-page originals cannot become blank templates',async()=>{
 const d=await L.PDFDocument.create();d.addPage();await assert.rejects(E.inspect(await d.save()),/exactly ten/);
 for(let i=1;i<10;i++)d.addPage();const field=d.getForm().createTextField('oldResident');field.setText('Fictional prior resident');await assert.rejects(E.inspect(await d.save()),/filled form/);
});
