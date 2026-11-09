/* Fill a sanitized blank DOCX; vendor PDF is the fixed supplied sheet. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsDepositExport=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 function paragraph(text,keep=false){return '<w:p><w:pPr>'+(keep?'<w:keepNext/>':'')+'<w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Roboto" w:hAnsi="Roboto"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>'}
 function fill(xml,report){
  const signers=report.signers.map(s=>paragraph('Email: '+s.email+'          '+s.name,true)+paragraph('__________________________________    ____________________',true)+paragraph('Signature                                                   Date')).join('');
  xml=xml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?\{\{SIGNERS\}\}(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/,signers);
  const data={PRIMARY_NAME:report.signers[0].name,HOLDING:(report.holdingCents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),ADDRESS:report.address,RENT:(report.rentCents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),MOVE_IN:report.moveInLabel,CREDIT:report.credit};
  for(const [key,value] of Object.entries(data))xml=xml.replaceAll('{{'+key+'}}',escape(value));
  if(/\{\{[A-Z_]+\}\}/.test(xml))throw Error('The document template has unresolved fields.');
  return xml;
 }
 async function documentBytes(zipLibrary,template,report){
  const zip=await zipLibrary.loadAsync(template),part=zip.file('word/document.xml');if(!part)throw Error('Document template unavailable.');
  zip.file('word/document.xml',fill(await part.async('string'),report));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 }
 return Object.freeze({fill,documentBytes});
});
