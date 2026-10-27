/* Oaktown Renewal Lease five-page PDF; static sanitized master background, on-page values only. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsRenewalPDF=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const BASE='renewal-assets/lease-master-page-';
const PAGE_COUNT=5;
const CENTERS=[118.8,208.8,302.4,396.9];
const UTILITY_X=[
 [182.0,257.0,318.0,363.0,467.0],
 [202.0,273.0,336.0,405.0,480.0]
];
const APPLIANCE_SLOTS=[
 {name:'Range',x:71.2,y:613.4,w:39.0},
 {name:'Refrigerator',x:145.0,y:613.4,w:39.0},
 {name:'Dishwasher',x:244.5,y:613.4,w:33.0},
 {name:'Blinds',x:313.3,y:613.4,w:33.0},
 {name:'Microwave',x:376.7,y:613.4,w:33.0},
 {name:'Garage Door Opener',x:512.3,y:613.4,w:38.5},
 {name:'Washer & Dryer',x:112.7,y:624.9,w:39.5}
];
// Highlight coordinates are taken from the original five-page lease master.
const INITIALS_HIGHLIGHTS=[
 [[442,716,535,728]],
 [[513,53,573,65],[432,145,535,157],[432,202,535,214],[448,570,553,582],[228,674,332,686]],
 [[468,18,572,30],[77,133,156,145],[468,156,572,168],[468,225,572,237],[468,271,572,283],[231,340,335,352],[426,363,550,375],[440,421,564,433],[468,501,575,513],[252,559,359,571],[296,628,400,640],[468,697,566,709]],
 [[468,7,566,19],[468,151,555,163],[432,197,519,209],[468,255,555,267],[468,347,572,359],[429,404,513,416],[432,473,516,485],[454,542,541,554],[468,588,555,600],[468,657,555,669]],
 [[396,41,483,53],[417,110,504,122],[468,230,552,242]]
];
async function restoreInitialHighlights(bytes,pageNumber){
 // The prepared master is monochrome. Multiply yellow with existing pixels so
 // original black type, ruling, and underscored INITIALS remain perfectly visible.
 if(typeof document==='undefined'||typeof createImageBitmap!=='function')return bytes;
 const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
 try{
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Cannot restore renewal master highlights.');
  ctx.drawImage(bitmap,0,0);
  ctx.globalCompositeOperation='multiply';
  ctx.fillStyle='#ffff00';
  for(const [l,t,r,b] of INITIALS_HIGHLIGHTS[pageNumber-1]||[]){
   ctx.fillRect(l*canvas.width/612,t*canvas.height/792,
                (r-l)*canvas.width/612,(b-t)*canvas.height/792);
  }
  ctx.globalCompositeOperation='source-over';
  return canvas.toDataURL('image/png');
 }finally{if(typeof bitmap.close==='function')bitmap.close()}
}
function writeUnderlinedAnswer(pdf,value,x,y,w,h,textX,textY,textW,{size=9,minSize=7,lineY}={}){
 // Erase only the template's underscores, then explicitly redraw the rule
 // beneath the new text. Otherwise filling the answer makes the line disappear.
 fillBox(pdf,x,y,w,h);
 textFit(pdf,value,textX,textY,textW,{size,minSize});
 pdf.setDrawColor(0,0,0);
 pdf.setLineWidth(0.45);
 pdf.line(x,lineY,x+w,lineY);
}
const removeUnsupported=s=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
function wrapMeasured(pdf,value,maxWidth,size,maxLines){
 const words=removeUnsupported(value).split(/\s+/).filter(Boolean),lines=[];let current='';
 pdf.setFont('helvetica','normal');pdf.setFontSize(size);
 for(const word of words){
  if(pdf.getTextWidth(word)>maxWidth)throw Error('An entry is too long to fit the lease: '+word.slice(0,25));
  const test=current?current+' '+word:word;
  if(pdf.getTextWidth(test)>maxWidth){lines.push(current);current=word}else current=test;
 }
 if(current)lines.push(current);
 if(lines.length>maxLines)throw Error('Text exceeds the available '+maxLines+' line(s) in the lease. Shorten this entry.');
 return lines;
}
function textFit(pdf,value,x,y,maxWidth,{size=10,minSize=7,align='left',bold=false}={}){
 const str=removeUnsupported(value);
 if(!str)return;
 pdf.setFont('helvetica',bold?'bold':'normal');
 let current=size;pdf.setFontSize(current);
 while(pdf.getTextWidth(str)>maxWidth&&current>minSize){current=Math.max(minSize,current-.25);pdf.setFontSize(current)}
 if(pdf.getTextWidth(str)>maxWidth)throw Error('Text will not fit in the approved lease field: '+str.slice(0,38));
 pdf.setTextColor(0,0,0);pdf.text(str,x,y,{align});
}
function fillBox(pdf,x,y,w,h){
 pdf.setFillColor(255,255,255);pdf.rect(x,y,w,h,'F');
}
function overlay(pdf,model){
 const values=[
  model.generationDate,model.start,model.end,model.rentFormatted
 ];
 for(let i=0;i<4;i++)textFit(pdf,values[i],CENTERS[i],124.5,[91,85,97,85][i],{size:10,minSize:8,align:'center',bold:i===3});
 // Tenant and emails: preserve the original table and landlord text.
 const tenants=wrapMeasured(pdf,model.tenantName,235,9.3,2);
 tenants.forEach((part,i)=>textFit(pdf,part,116,176.2+i*12,235,{size:9.3,minSize:8}));
 const emails=model.emails.split(';').map(s=>removeUnsupported(s)).filter(Boolean);
 if(emails.length>3)throw Error('A maximum of three tenant email lines fit the lease.');
 emails.forEach((email,i)=>textFit(pdf,email,109,211.8+i*11.7,235,{size:9.4,minSize:7.6}));
 textFit(pdf,model.address,200.5,265.0,244,{size:11,minSize:7.5,align:'center'});
 textFit(pdf,model.cityline,200.5,300.7,244,{size:11,minSize:7.5,align:'center'});
 // Occupant A/B/C left, D/E right, with original underlines intact.
 const locations=[[105,499.5,207],[105,520.2,207],[105,540.9,207],[352,499.5,188],[352,520.2,188]];
 model.occupants.forEach((person,i)=>{if(person)textFit(pdf,person,...locations[i].slice(0,3),{size:10.5,minSize:7})});
 // Pet field may use two small lines; do not print across Utility choices.
 const pets=wrapMeasured(pdf,model.pets||'None',170,9.1,2);
 pets.forEach((s,i)=>textFit(pdf,s,370.5,540.6+i*10,170,{size:9.1,minSize:7.1}));
 // Each utility must appear on exactly one landlord or tenant line.
 const keys=['Water','Electric','Gas','Trash','Internet'];
 keys.forEach((name,i)=>{
  const row=model.utilities[name]==='Landlord'?0:1;
  if(!['Landlord','Tenant'].includes(model.utilities[name]))throw Error('Utility responsibility missing for '+name);
  pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.setTextColor(0,0,0);
  pdf.text('X',UTILITY_X[row][i],row===0?565.1:576.5,{align:'center'});
 });
 // Appliance answer completely replaces an underscore, without changing clauses.
 for(const field of APPLIANCE_SLOTS){
  const value=model.appliances[field.name];
  if(!['Yes','No'].includes(value))throw Error('Appliance choice missing for '+field.name);
  writeUnderlinedAnswer(pdf,value,field.x-.3,field.y-.7,field.w+1.2,12.4,
                       field.x+1.5,field.y+8.7,field.w-3,{size:9,minSize:8,lineY:field.y+10.7});
 }
 // Late fees sit beside the percentage clauses in the original paragraph.
 writeUnderlinedAnswer(pdf,model.fiveFormatted.slice(1),217.0,693.0,40.4,12.6,
                      218,702.6,38,{size:9,minSize:7,lineY:704.6});
 writeUnderlinedAnswer(pdf,model.tenFormatted.slice(1),70,704.7,43.5,12.0,
                      71.5,714.1,40.5,{size:9,minSize:7,lineY:716.1});
}
function buildModel(state,rules,when){
 const errors=rules.validate(state);
 if(!state.cityline?.trim())errors.push('Confirm the city, state and ZIP.');
 if(!state.occupants.some(Boolean))errors.push('Confirm at least one occupant.');
 if(errors.length)throw Error(errors.join(' '));
 const cents=rules.moneyCents(state.rent),late=rules.fees(cents);
 const date=rules.leaseDate(when||new Date());
 return {
  generationDate:rules.displayDate(date),start:rules.displayDate(state.start),end:rules.displayDate(state.end),
  rentFormatted:rules.formatCents(cents),
  fiveFormatted:rules.formatCents(late.five),tenFormatted:rules.formatCents(late.ten),
  tenantName:state.tenantName,emails:state.emails||'',address:state.address,cityline:state.cityline,
  occupants:state.occupants,pets:state.pets||'',
  utilities:state.utilities,appliances:state.appliances,
  sourceUnitId:state.unitId,sourceLeaseId:state.leaseId
 };
}
async function generate(state,{rules,JsPDF,viewerUser,when,fetchAsset=fetch}={}){
 if(typeof JsPDF!=='function')throw Error('The PDF library did not load. Reload Oaktown Ops.');
 if(!rules)throw Error('Renewal rules missing.');
 if(typeof viewerUser!=='function'||!viewerUser())throw Error('Sign in before preparing a lease.');
 const person=viewerUser(),model=buildModel(state,rules,when);
 const pdf=new JsPDF({unit:'pt',format:[612,792],orientation:'portrait',compress:true});
 for(let p=1;p<=PAGE_COUNT;p++){
  if(viewerUser()!==person)throw Error('Account changed. PDF generation was cancelled.');
  const response=await fetchAsset(BASE+p+'.png',{cache:'force-cache'});
  if(!response.ok)throw Error('Missing renewal template page '+p+' ('+response.status+').');
  const png=new Uint8Array(await response.arrayBuffer());
  if(p>1)pdf.addPage([612,792],'portrait');
  const master=await restoreInitialHighlights(png,p);
  pdf.addImage(master,'PNG',0,0,612,792,undefined,'FAST');
  if(p===1)overlay(pdf,model);
 }
 if(viewerUser()!==person)throw Error('Account changed. PDF generation was cancelled.');
 return {pdf,model};
}
function filename(model){
 const addr=removeUnsupported(model.address).replace(/[^A-Za-z0-9 _-]/g,'').replace(/\s+/g,' ').trim().slice(0,70);
 return 'Renewal Rental Lease - '+(addr||'Property')+' - '+model.generationDate.replace(/\//g,'-')+'.pdf';
}
return Object.freeze({PAGE_COUNT,BASE,CENTERS,UTILITY_X,APPLIANCE_SLOTS,INITIALS_HIGHLIGHTS,restoreInitialHighlights,buildModel,overlay,generate,filename});
});