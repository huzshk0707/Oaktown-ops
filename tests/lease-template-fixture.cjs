'use strict';
const L=require('../vendor/lease-pdf/pdf-lib-1.17.1.min.js'),P=require('../lease-page8-model.js');
async function fixture(){
 const original=await L.PDFDocument.create(),font=await original.embedFont(L.StandardFonts.TimesRoman);
 for(let i=1;i<=10;i++){const page=original.addPage([612,792]);page.drawText('FICTIONAL ORIGINAL — PAGE '+i,{x:36,y:752,size:12,font});page.drawRectangle({x:30,y:40,width:550,height:680,borderWidth:.5});if(i===8){page.drawText('KITCHEN / BEDROOMS / BATHROOMS',{x:40,y:700,size:10,font});page.drawLine({start:{x:40,y:100},end:{x:560,y:100},thickness:1});page.drawText('Signature (leave blank)',{x:40,y:80,size:9,font})}}
 const bytes=await original.save({useObjectStreams:false});
 const state={unitId:'11111111-1111-4111-8111-111111111111',bedrooms:'3',bathrooms:'1',basement:'not-included',additionalRoom:false,address:'100 Fictional Lane, Unit 2',conditions:{'kitchen::Floor':'Good & Fresh Paint'},roomLabels:{},roomLocations:{},roomPlacements:{},rent:'1500',deposit:'800',leaseDate:'2026-11-16',start:'2026-12-01',end:'2027-11-30',tenantName:'Fictional Resident',emails:'fictional@example.invalid',pets:'None',fiveOverride:null,tenOverride:null};
 const core=['address','cityline','leaseDate','start','end','rent','deposit','tenantName','emails','pets','five','ten'];
 const fields=core.map((k,i)=>({key:'term/'+k,page:1,x:40,y:680-i*24,width:500,height:16,size:9,font:'Times-Roman',align:'left'}));fields.push({key:'slot/kitchen/0/0/Floor',page:8,x:100,y:630,width:300,height:16,size:9,font:'Times-Roman',align:'left'});
 const E=require('../lease-template-pdf.js'),source=await E.inspect(bytes);
 return {bytes,state,data:{schema_version:'oaktown.lease-preparation.v1',state,template:{reference:'Fictional blank master, explicitly reviewed',originalReviewed:true,mappingReviewed:true,map:{schema_version:'oaktown.lease-template-map.v1',templateSha256:source.sha256,pages:source.pages,fields,protectedAreas:[{page:8,x:30,y:65,width:550,height:50}]}}}};
}
module.exports={fixture};
