/* Overlay only: original PDF pages/content are never reconstructed or masked. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./lease-page8-model.js'):root.OpsLeasePage8);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsLeaseTemplatePDF=api;})(typeof window!=='undefined'?window:null,function(P){
 'use strict';
 const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
 const hash=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const libs=passed=>passed||(typeof window!=='undefined'?window.PDFLib:require('./vendor/lease-pdf/pdf-lib-1.17.1.min.js'));
 const rectangle=r=>['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0;
 const overlaps=(a,b)=>a.x<b.x+b.width-.1&&a.x+a.width>b.x+.1&&a.y<b.y+b.height-.1&&a.y+a.height>b.y+.1;
 const fieldKeys=f=>[f.key,...(f.sources||[]).map(s=>s.key)];
 function fieldValue(field,values){
  const sources=[{key:field.key,label:field.primaryLabel||'',omitValues:field.omitValues},...(field.sources||[])];
  const entries=sources.map(s=>({label:s.label||'',value:(s.omitValues||[]).includes(values[s.key])?'':String(values[s.key]||'')})).filter(s=>s.value);
  if(field.collapseEqual&&entries.length&&entries.every(s=>s.value===entries[0].value))return entries[0].value;
  const result=entries.map(s=>(s.label?s.label+' - ':'')+s.value).join(field.join||' · ');
  return field.format==='amount'?result.replace(/^\$/,''):result;
 }
 async function inspect(bytes,{PDFLib}={}){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<20||bytes.byteLength>12*1024*1024)throw Error('Choose a PDF master up to 12 MB.');
  const L=libs(PDFLib),doc=await L.PDFDocument.load(bytes,{updateMetadata:false});
  if(doc.getPageCount()!==10)throw Error('The new-lease master must contain exactly ten original pages.');
  if(doc.catalog.get(L.PDFName.of('OpenAction'))||doc.catalog.get(L.PDFName.of('AA'))||doc.catalog.get(L.PDFName.of('Names'))?.lookup?.(L.PDFName.of('JavaScript')))throw Error('Use an approved blank master without automatic document actions.');
  for(const field of doc.getForm().getFields()){
   const value=field.acroField.dict.get(L.PDFName.of('V'));
   if(value&&value.toString()!=='()'&&value.toString()!=='/Off')throw Error('This master contains filled form or signature values. Choose the approved blank original.');
  }
  const pages=doc.getPages().map(p=>({width:p.getWidth(),height:p.getHeight(),rotation:p.getRotation().angle}));
  if(pages.some(p=>p.rotation!==0))throw Error('A rotated master needs an approved rotation-aware mapping before use.');
  return {sha256:await hash(bytes),pageCount:10,pages};
 }
 function validateMap(map,source){
  if(!map||map.schema_version!=='oaktown.lease-template-map.v1'||map.templateSha256!==source.sha256||canonical(map.pages)!==canonical(source.pages))throw Error('The template map does not match this exact original PDF.');
  if(!Array.isArray(map.fields)||map.fields.length<1||map.fields.length>250||!Array.isArray(map.protectedAreas)||map.protectedAreas.length>80)throw Error('Choose a bounded template map with reviewed field positions.');
  const keys=new Set(),allowedTerms=new Set([...P.terms,'bedrooms',...Array.from({length:5},(_,i)=>['utility-'+i,'utility-'+i+'-landlord','utility-'+i+'-tenant']).flat(),...Array.from({length:7},(_,i)=>['appliance-'+i,'appliance-'+i+'-yes','appliance-'+i+'-no']).flat()]);
  const inside=r=>Number.isInteger(r.page)&&r.page>=1&&r.page<=10&&rectangle(r)&&r.x+r.width<=source.pages[r.page-1].width&&r.y+r.height<=source.pages[r.page-1].height;
  if(map.protectedAreas.some(r=>!inside(r)))throw Error('Invalid protected signature rectangle.');
  for(const field of map.fields){
   const parts=String(field.key||'').split('/');
   const binding=parts[0]==='term'&&parts.length===2&&allowedTerms.has(parts[1])||parts[0]==='slot'&&parts.length>=5&&P.sections.includes(parts[1])&&['0','1'].includes(parts[2])&&['0','1','2'].includes(parts[3])&&parts.slice(4).join('/').length>0&&parts.slice(4).join('/').length<=100;
   if(!binding||parts[0]==='slot'&&field.page!==8||!inside(field)||!Number.isFinite(field.size)||field.size<6||field.size>24||!['Helvetica','Times-Roman','Courier','Custom'].includes(field.font)||!['left','center','right'].includes(field.align||'left'))throw Error('A template field has an invalid binding, size, font or page position.');
   if(field.sources!==undefined&&(!Array.isArray(field.sources)||field.sources.length>12||field.sources.some(s=>!s||typeof s.key!=='string'||!/^slot\/(kitchen|bathroom|living|bedroom-[1-5]|basement|additional|exterior|systems|other)\/[01]\/[0-2]\/.{1,100}$/.test(s.key)||field.page!==8||typeof s.label!=='string'||s.label.length>100)))throw Error('Invalid grouped condition binding.');
   if(field.baseline!==undefined&&(!Number.isFinite(field.baseline)||field.baseline<0||field.baseline>field.height))throw Error('Invalid text baseline.');
   for(const key of fieldKeys(field)){const id=field.page+':'+key;if(keys.has(id))throw Error('Duplicate field mapping on the same page.');keys.add(id);}
   if(map.protectedAreas.some(r=>r.page===field.page&&overlaps(r,field)))throw Error('A mapped field overlaps a protected signature area.');
  }
  for(let i=0;i<map.fields.length;i++)for(let j=i+1;j<map.fields.length;j++)if(map.fields[i].page===map.fields[j].page&&overlaps(map.fields[i],map.fields[j]))throw Error('Mapped fields overlap; choose distinct positions on the original.');
  return true;
 }
 function approved(data,record){const r=record?.receipt;return record?.status==='approved'&&Number.isInteger(record.version)&&record.version>0&&r?.schema_version==='oaktown.lease-preparation-receipt.v1'&&r.id===record.id&&r.version===record.version&&r.approved_by===record.actor_id&&typeof r.approved_by==='string'&&Number.isFinite(Date.parse(r.approved_at))&&r.executed===false&&/^[a-f0-9]{64}$/.test(r.data_sha256)&&r.template_sha256===data.template.map.templateSha256&&canonical(record.data)===canonical(data);}
 function coverage(data){
  const mapped=new Set(data.template.map.fields.flatMap(fieldKeys)),issues=[];
  for(const key of ['address','cityline','leaseDate','start','end','rent','deposit','tenantName','emails','pets','five','ten'])if(!mapped.has('term/'+key))issues.push('Map lease field '+key+' on the approved original.');
  for(const key of ['five','ten'])for(const page of [1,10])if(!data.template.map.fields.some(f=>f.key==='term/'+key&&f.page===page))issues.push('Map the '+key+' late charge on actual PDF page '+page+'.');
  const satisfactory='term/satisfactory';if(!mapped.has(satisfactory)&&!mapped.has(satisfactory+'-'+String(data.state.satisfactory).toLowerCase()))issues.push('Map the overall satisfactory condition choice.');
  const all=P.values(data.state);
  for(const [key,value]of Object.entries(all))if(value&&/^term\/occupant-/.test(key)&&!mapped.has(key))issues.push('Map occupant '+(Number(key.split('-').at(-1))+1)+'.');
  for(const [key,value]of Object.entries(all))if(value&&/^term\/(utility|appliance)-[0-9]+$/.test(key)&&!mapped.has(key)){
   const suffix={'Landlord':'landlord','Tenant':'tenant','Yes':'yes','No':'no'}[value];if(!suffix||!mapped.has(key+'-'+suffix))issues.push('Map the confirmed service choice '+key+'.');
  }
  for(const room of P.rooms(data.state))if(room.applicable===false&&['bedroom-4','basement'].includes(room.key)){const p=room.placement;if(!mapped.has('slot/'+p.section+'/'+p.column+'/'+p.row+'/label'))issues.push('Map the N/A label for '+room.title+'.');}
  for(const room of P.rooms(data.state)){
   if(room.applicable!==true)continue;const p=room.placement,prefix='slot/'+p.section+'/'+p.column+'/'+p.row+'/';
   for(const [item,value]of Object.entries(room.entries))if(value&&!mapped.has(prefix+item))issues.push('Map '+room.label+' / '+item+'; an entered observation would otherwise be omitted.');
   if((data.state.roomLabels?.[room.key]||p.section!==room.key&&!room.key.startsWith('bathroom-'))&&!mapped.has(prefix+'label'))issues.push('Map the edited label for '+room.label+'.');
   if(room.location&&!mapped.has(prefix+'location'))issues.push('Map the location for '+room.label+'.');
  }
  return issues;
 }
 async function generate(bytes,data,{PDFLib,fontkit,fontBytes,approval=null,final=false,viewerUser=()=>null}={}){
  const who=viewerUser();if(!who)throw Error('Sign in to prepare the lease.');
  const source=await inspect(bytes,{PDFLib}),map=data?.template?.map;validateMap(map,source);
  if(data.template.originalReviewed!==true||data.template.mappingReviewed!==true||!String(data.template.reference||'').trim())throw Error('Review the approved blank original, all ten pages and exact field positions first.');
  const problems=final?P.reviewProblems(data.state):P.layoutProblems(data.state);if(problems.length)throw Error(problems.join(' '));
  if(final&&!approved(data,approval))throw Error('Final export requires the exact saved, approved preparation and server receipt.');
  const profile=typeof module==='object'&&module.exports?require('./lease-template-profile.js'):window.OpsLeaseOriginalProfile;
  if(final&&profile?.referenceOnly(map.originalSha256||source.sha256))throw Error('This reference master contains existing disclosure marks/signatures. Supply and review a clean unsigned master before final export.');
  if(final&&coverage(data).length)throw Error(coverage(data).join(' '));
  const L=libs(PDFLib),doc=await L.PDFDocument.load(bytes,{updateMetadata:false}),values=P.values(data.state),fonts=new Map();
  if(map.fields.some(f=>f.font==='Custom')){
   if(!fontBytes||await hash(fontBytes)!==data.template.fontSha256||!fontkit)throw Error('Attach the exact reviewed custom font again.');
   doc.registerFontkit(fontkit);fonts.set('Custom',await doc.embedFont(fontBytes,{subset:true}));
  }
  for(const name of new Set(map.fields.map(f=>f.font)))if(name!=='Custom')fonts.set(name,await doc.embedFont(name));
  for(const field of map.fields){
   const value=fieldValue(field,values);if(!value)continue;
   const font=fonts.get(field.font),lines=String(value).split(/\r?\n/),height=field.size*1.15;
   const ascent=font.heightAtSize(field.size,{descender:false}),descent=font.heightAtSize(field.size)-ascent;
   if(field.baseline!==undefined?(field.baseline+ascent>field.height+.01||field.baseline-(lines.length-1)*height<descent-.01):lines.length*height>field.height+.01)throw Error('Text is too tall for '+field.key+'. Review the field box; no text was clipped.');
   for(let i=0;i<lines.length;i++){
    let width;try{width=font.widthOfTextAtSize(lines[i],field.size)}catch{throw Error('The selected font cannot preserve a character in '+field.key+'. Choose the approved custom font.');}
    if(width>field.width)throw Error('Text is too wide for '+field.key+'. Shorten the observation or review its original field placement.');
    const x=field.x+(field.align==='center'?(field.width-width)/2:field.align==='right'?field.width-width:0);
    doc.getPage(field.page-1).drawText(lines[i],{x,y:field.y+(field.baseline??(field.height-field.size))-i*height,size:field.size,font,color:L.rgb(0,0,0)});
   }
  }
  doc.setSubject(final?'Approved preparation; unsigned lease PDF':'DRAFT preparation preview; not approved or executed');
  const result=await doc.save({useObjectStreams:false,addDefaultPage:false});
  if(viewerUser()!==who)throw Error('Account changed; PDF generation cancelled.');
  return {bytes:result,sourceSha256:source.sha256,pageCount:10,final};
 }
 return Object.freeze({hash,canonical,inspect,validateMap,approved,coverage,fieldKeys,fieldValue,generate});
});
