/* Fill a sanitized blank DOCX; vendor PDF is the fixed supplied sheet. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsDepositExport=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 function paragraph(text,keep=false,underline=false){return '<w:p><w:pPr>'+(keep?'<w:keepNext/>':'')+'<w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Roboto" w:hAnsi="Roboto"/><w:sz w:val="24"/>'+(underline?'<w:u w:val="single"/>':'')+'</w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>'}
 function signingBlock(s){
  const cell=(width,content,highlight=false)=>'<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+(highlight?'<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="000000"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/>':'')+'<w:vAlign w:val="center"/></w:tcPr>'+content+'</w:tc>';
  const row=(left,right,{height=0,keep=false,highlight=false}={})=>'<w:tr><w:trPr><w:cantSplit/>'+(height?'<w:trHeight w:val="'+height+'" w:hRule="atLeast"/>':'')+'</w:trPr>'+cell(5400,paragraph(left,keep),highlight)+cell(360,paragraph('',keep))+cell(3600,paragraph(right,keep),highlight)+'</w:tr>';
  const identity='<w:tr><w:trPr><w:cantSplit/></w:trPr>'+cell(5400,paragraph('Email: '+s.email,true,true))+cell(360,paragraph('',true))+cell(3600,paragraph(s.name,true,true))+'</w:tr>';
  return '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5400"/><w:gridCol w:w="360"/><w:gridCol w:w="3600"/></w:tblGrid>'+identity+row(' ',' ',{height:360,keep:true,highlight:true})+row('Signature','Date')+'</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t> </w:t></w:r></w:p>';
 }
 function fill(xml,report){
  const signers=report.signers.map(signingBlock).join('');
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
