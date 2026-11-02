/* Native vector reconstruction of the supplied condition sheet (lease page 8).
   Fixes displaced headings/rules; contains no signatures or property presets. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsLeaseConditionPDF=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const WIDTH=612,HEIGHT=792;
 const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 function fit(pdf,value,x,y,width,{size=8.3,min=6.4,bold=false,align='left'}={}){
  const text=clean(value);if(!text)return;
  pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
  while(pdf.getTextWidth(text)>width&&size>min){size=Math.max(min,size-.2);pdf.setFontSize(size)}
  if(pdf.getTextWidth(text)>width)throw Error('Condition-sheet text is too long for its field. Shorten it or use Comments: '+text.slice(0,35));
  pdf.setTextColor(0,0,0);pdf.text(text,x,y,{align});
 }
 function rule(pdf,x,y,width){pdf.setDrawColor(0,0,0);pdf.setLineWidth(.45);pdf.line(x,y,x+width,y)}
 function notes(pdf,value,x,y,width,lines,size=8){
  pdf.setFont('helvetica','normal');pdf.setFontSize(size);
  const text=clean(value),wrapped=text?pdf.splitTextToSize(text,width):[];
  if(wrapped.length>lines||wrapped.some(line=>pdf.getTextWidth(line)>width))throw Error('Condition comments exceed '+lines+' lines. Shorten the notes before previewing.');
  for(let i=0;i<lines;i++){rule(pdf,x,y+i*10.2,width);if(wrapped[i])fit(pdf,wrapped[i],x+1,y-2+i*10.2,width-2,{size,min:size})}
 }
 function rows(pdf,room,x,y,step,width=252){
  fit(pdf,room.title.toUpperCase(),x,y,width,{size:8.8,min:7.2,bold:true});y+=step;
  for(const item of room.items){
   const value=room.entries[item]||'';
   fit(pdf,item,x,y,65,{size:Math.min(8.5,step-.6),min:6.8});
   rule(pdf,x+71,y+1.1,width-71);
   fit(pdf,value,x+72,y-.25,width-74,{size:Math.min(8.5,step-.6),min:6.4});y+=step;
  }
  return y;
 }
 function bathrooms(pdf,rooms,x,y,step,width=252){
  if(!rooms.length)return y;
  const single=rooms.length===1;
  fit(pdf,single&&rooms[0].title!=='Bathroom 1'?rooms[0].title.toUpperCase():'BATHROOM',x,y,width,{size:8.8,min:7.2,bold:true});y+=step;
  const left=71,column=(width-left)/rooms.length;
  if(!single){rooms.forEach((r,i)=>fit(pdf,r.title,x+left+i*column,y,column-3,{size:7.8,min:6.4,bold:true}));y+=step;}
  for(const item of rooms[0].items){
   fit(pdf,item,x,y,66,{size:Math.min(8.5,step-.6),min:6.8});
   rooms.forEach((r,i)=>{const at=x+left+i*column;rule(pdf,at,y+1.1,column-3);fit(pdf,r.entries[item]||'',at+1,y-.25,column-5,{size:Math.min(8.3,step-.6),min:6.2})});y+=step;
  }
  return y;
 }
 function signature(pdf,x,y,width,{yellow=true,label='Signature'}={}){
  if(yellow){pdf.setFillColor(255,255,0);pdf.rect(x,y-10,width,11,'F')}
  rule(pdf,x,y,width);fit(pdf,label,x,y+9,width*.7,{size:8,min:8});fit(pdf,'Date',x+width-38,y+9,38,{size:8,min:8});
 }
 function validate(sheet){
  if(!sheet||![2,3,4,5].includes(Number(sheet.bedrooms)))throw Error('Confirm a two-to-five bedroom layout before previewing the condition sheet.');
  if(!Array.isArray(sheet.rooms))throw Error('Condition observations are missing.');
  if(!['','Yes','No'].includes(sheet.satisfactory||''))throw Error('Select Yes / No, or leave the answer unconfirmed.');
  const keys=sheet.rooms.map(r=>r.key);
  for(const required of ['kitchen','living','exterior','systems','other'])if(!keys.includes(required))throw Error('Missing condition group: '+required);
  if(keys.some(key=>!['kitchen','living','exterior','systems','other','basement','additional'].includes(key)&&!/^bedroom-[1-5]$/.test(key)&&!/^bathroom-[1-3]$/.test(key)))throw Error('Unmapped condition group. Review the layout before generating.');
  if(new Set(keys).size!==keys.length)throw Error('Duplicate condition-room keys.');
  const bedrooms=sheet.rooms.filter(r=>r.key.startsWith('bedroom-'));
  if(bedrooms.length!==Number(sheet.bedrooms))throw Error('Bedroom count does not match the condition rows.');
  const baths=sheet.rooms.filter(r=>r.key.startsWith('bathroom-'));
  if(baths.length<1||baths.length>3)throw Error('Confirm one to three bathroom groups.');
  if(bedrooms.length+sheet.rooms.filter(r=>r.key==='additional').length>5)throw Error('This page fits at most five bedroom/den groups. This additional layout needs a reviewed source sheet.');
  return {bedrooms,baths};
 }
 function draw(pdf,sheet,{preview=true}={}){
  const {baths}=validate(sheet),find=key=>sheet.rooms.find(r=>r.key===key);
  fit(pdf,'ALL ITEMS LISTED BELOW ARE SATISFACTORY',72,44,356,{size:11.4,min:10.6,bold:true});
  rule(pdf,345,46,38);fit(pdf,'YES',386,44,28,{size:11,bold:true});rule(pdf,413,46,38);fit(pdf,'NO',454,44,23,{size:11,bold:true});
  if(sheet.satisfactory==='Yes')fit(pdf,'X',358,43,12,{size:11,bold:true});
  if(sheet.satisfactory==='No')fit(pdf,'X',426,43,12,{size:11,bold:true});
  fit(pdf,'IF NO PLEASE MAKE A NOTE BESIDE ITEM ON LINE PROVIDED',306,65,430,{size:7.6,min:7.6,bold:true,align:'center'});
  fit(pdf,'Unit Address',50,87,82,{size:11,bold:true});rule(pdf,128,89,358);fit(pdf,sheet.address,130,86,352,{size:10,min:7.2});
  fit(pdf,'Bed',490,87,28,{size:11,bold:true});rule(pdf,518,89,44);fit(pdf,String(sheet.bedrooms),536,86,22,{size:11,bold:true});
  fit(pdf,'ITEMS',36,108,65,{size:8.6,bold:true});fit(pdf,'CONDITION',108,108,170,{size:8.6,bold:true});
  fit(pdf,'ITEM',324,108,65,{size:8.6,bold:true});fit(pdf,'CONDITION',397,108,162,{size:8.6,bold:true});
  const left=[find('kitchen'),...baths.slice(0,1),find('living'),...sheet.rooms.filter(r=>r.key.startsWith('bedroom-')),find('additional'),find('basement')].filter(Boolean);
  const lineCount=left.reduce((n,r)=>n+r.items.length+(r.key.startsWith('bathroom-')&&baths.length>1?2:1),0);
  const step=Math.min(9.4,(634-123)/lineCount);
  if(step<8)throw Error('Too many condition groups to fit legibly on page 8. Review the room layout.');
  let y=123;
  for(const room of left){y=room.key.startsWith('bathroom-')?bathrooms(pdf,baths,36,y,step):rows(pdf,room,36,y,step)}
  if(y>635.1)throw Error('Condition rows crossed the bottom signature area.');
  // Right column retains the original item order, followed by blank acceptance lines.
  const ext=find('exterior'),systems=find('systems'),other=find('other'),extEntries=ext?.entries||{},systemEntries=systems?.entries||{};
  let rightY=123;
  for(const item of ['Windows','Screens','Locks & keys','Porch & stairs','Hot water heater']){
   fit(pdf,item,324,rightY,88,{size:8.1,min:7.5});rule(pdf,415,rightY+1,144);fit(pdf,extEntries[item]||'',416,rightY-.25,141,{size:8.2,min:6.4});rightY+=9.2;
  }
  fit(pdf,'EXTERIOR CONDITION',324,rightY,235,{size:8.8,bold:true});rightY+=9.2;
  for(const item of ['Building','Front yard','Rear yard','Side yard','Garage / shed','Other']){
   fit(pdf,item,324,rightY,70,{size:8.2});rule(pdf,397,rightY+1,162);fit(pdf,extEntries[item]||'',398,rightY-.25,159,{size:8.2,min:6.4});rightY+=9.2;
  }
  for(const item of ['Furnace / AC','Electrical fixtures','Electrical outlets']){
   fit(pdf,item,324,rightY,88,{size:8.1,min:7.2});rule(pdf,415,rightY+1,144);fit(pdf,systemEntries[item]||'',416,rightY-.25,141,{size:8.1,min:6.4});rightY+=9.2;
  }
  fit(pdf,'Comments',324,rightY,100,{size:8.2});notes(pdf,systemEntries.Comments||'',324,rightY+12,235,4,8);
  const otherValue=other?.entries?.['Other appliance / item conditions'];
  if(otherValue){fit(pdf,'Other items',324,317,100,{size:8.2});notes(pdf,otherValue,324,329,235,2,8)}
  fit(pdf,'ACCEPTANCE:',324,359,235,{size:9.2,bold:true});signature(pdf,324,382,228);signature(pdf,324,421,228);
  fit(pdf,'LANDLORD SIGNATURES:',324,480,235,{size:9.2,bold:true});rule(pdf,324,506,228);
  fit(pdf,'ALL SMOKE ALARMS IN HOUSE ARE WORKING AND UP!',324,545,235,{size:8.2,min:7.8,bold:true});signature(pdf,324,572,228);
  fit(pdf,'I understand I am taking house AS IS I have viewed property and am happy with its condition.',72,668,505,{size:8.6,min:8.2,bold:true});
  pdf.setDrawColor(0,0,0);pdf.setLineWidth(1.2);pdf.line(72,690,575,690);
  pdf.setFillColor(255,255,0);pdf.rect(72,696,254,11,'F');fit(pdf,'Signature',72,705,150,{size:8.6,bold:true});fit(pdf,'Signature',285,705,120,{size:8.6,bold:true});
  if(preview){pdf.setTextColor(95,95,95);pdf.setFont('helvetica','normal');pdf.setFontSize(7.2);pdf.text('DRAFT LAYOUT PREVIEW — condition sheet only; not an executed lease.',306,762,{align:'center'});pdf.setTextColor(0,0,0)}
  return {pageCount:1,leftBottom:y,lineStep:step};
 }
 function generate(sheet,{JsPDF,viewerUser,preview=true}={}){
  if(typeof JsPDF!=='function')throw Error('PDF library not available.');
  const who=viewerUser?.();if(!who)throw Error('Sign in to preview the condition sheet.');
  const pdf=new JsPDF({unit:'pt',format:[WIDTH,HEIGHT],orientation:'portrait',compress:true});
  const layout=draw(pdf,sheet,{preview});if(viewerUser()!==who)throw Error('Account changed; preview cancelled.');
  return {pdf,layout};
 }
 return Object.freeze({WIDTH,HEIGHT,draw,generate,validate});
});
