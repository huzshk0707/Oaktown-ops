/* Approved-application deposit packet. Private visit-only inputs; no sending or payment writes. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),M=window.OpsDepositModel,E=window.OpsDepositExport,cloud=window.OpsCloud;
 if(!M||!E||!cloud||!$('deposit-template'))return;
 $('applications-workflow').append($('deposit-template').content.cloneNode(true));
 const launch=document.createElement('button');launch.type='button';launch.className='button primary';launch.id='application-deposit-open';launch.textContent='Prepare deposit & move-in packet';launch.addEventListener('click',open);$('applications-workflow').prepend(launch);
 const form=$('deposit-form'),status=t=>{$('deposit-status').textContent=t},buttons=['deposit-docx','deposit-vendors','deposit-packet','deposit-copy'];
 let reviewed=null,busy=false,generation=0,signerId=0,imageFile=null,imageURL=null;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 function signer(name='',email=''){
  const row=node('fieldset',null,'deposit-signer'),legend=node('legend','Tenant signer');row.append(legend);
  for(const [key,title,value] of [['name','Full legal name',name],['email','Email address',email]]){
   const label=node('label',title),input=node('input');input.type=key==='email'?'email':'text';input.dataset.signer=key;input.id='deposit-signer-'+(++signerId);input.value=value;input.maxLength=key==='email'?254:120;input.required=true;label.htmlFor=input.id;label.append(input);row.append(label);
  }
  const remove=node('button','Remove signer','button');remove.type='button';remove.onclick=()=>{row.remove();invalidate();};row.append(remove);$('deposit-signers').append(row);
 }
 function input(){return {address:$('deposit-address').value,greeting:$('deposit-greeting').value,sender:$('deposit-sender').value,security:$('deposit-security').value,rent:$('deposit-rent').value,pets:$('deposit-pets').value,moveIn:$('deposit-move-in').value,approved:$('deposit-approved').checked,signers:[...$('deposit-signers').children].map(row=>Object.fromEntries([...row.querySelectorAll('[data-signer]')].map(i=>[i.dataset.signer,i.value])))};}
 function clearImage(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;imageFile=null;$('deposit-image').value='';$('deposit-image-preview').removeAttribute('src');$('deposit-image-preview').hidden=true;}
 function controls(){$('deposit-email').disabled=busy||!reviewed||!cloud.user;for(const id of buttons)$(id).disabled=busy||!cloud.user||!reviewed;$('deposit-review').disabled=busy||!cloud.user;$('deposit-add-signer').disabled=busy||!cloud.user||$('deposit-signers').children.length>=6;}
 function invalidate(){generation++;reviewed=null;$('deposit-preview').replaceChildren();$('deposit-email').value='';controls();if(cloud.user)status('Review the updated details to prepare a new packet.');}
 function reset(){generation++;busy=false;reviewed=null;form.reset();clearImage();$('deposit-signers').replaceChildren();signer();$('deposit-preview').replaceChildren();$('deposit-email').value='';$('deposit-fields').disabled=!cloud.user;$('deposit-locked').hidden=!!cloud.user;controls();status(cloud.user?'Enter the approved terms and signer details.':'Sign in to prepare a deposit packet.');}
 function preview(r){
  const host=$('deposit-preview');host.replaceChildren();
  const amounts=node('dl',null,'deposit-summary');for(const [label,value] of [['Base security deposit','$'+M.dollars(r.securityCents)],['Pet deposit',r.pets+' × $150 = $'+M.dollars(r.petCents)],['Holding deposit due now','$'+M.dollars(r.holdingCents)],['First-month rent due at move-in','$'+M.dollars(r.rentCents)+' · '+r.moveInLabel]]){amounts.append(node('dt',label),node('dd',value))}host.append(amounts);
  const paper=node('article',null,'deposit-document');paper.append(node('h3','NON-REFUNDABLE HOLDING DEPOSIT'));
  for(const p of r.paragraphs)paper.append(node('p',p));
  for(const s of r.signers){paper.append(node('p','Email: '+s.email+' · '+s.name),node('p','____________________________   __________________','deposit-signature'),node('p','Signature                                           Date','deposit-signature'))}
  paper.append(node('p',r.credit,'deposit-credit'));host.append(paper);$('deposit-email').value=imageFile?r.email.replace('\n\nPlease feel free','\n\nPayment details are included in the attached image.\n\nPlease feel free'):r.email;
 }
 form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
 $('deposit-add-signer').onclick=()=>{if($('deposit-signers').children.length<6){signer();invalidate();$('deposit-signers').lastElementChild.querySelector('input').focus()}};
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!cloud.user||busy)return;const result=M.review(input());
  if(!result.valid){invalidate();status(result.errors.join(' '));return}
  reviewed=result.report;preview(reviewed);controls();status('Draft ready. Review the form and email, then download both required attachments. Nothing has been sent or signed.');
 });
 $('deposit-image').addEventListener('change',()=>{
  const file=$('deposit-image').files?.[0];clearImage();if(!file)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>8000000){status('Choose a PNG or JPEG payment image up to 8 MB.');return}
  imageFile=file;imageURL=URL.createObjectURL(file);$('deposit-image-preview').src=imageURL;$('deposit-image-preview').hidden=false;
 });
 $('deposit-clear').onclick=()=>{if((input().address||$('deposit-signers input')?.value)&&!confirm('Clear the deposit draft and its email?'))return;reset()};
 $('deposit-signin').onclick=()=>$('account-button').click();
 async function asset(path){const response=await fetch(path);if(!response.ok)throw Error('A packet template could not load. Retry before using the draft.');return response.arrayBuffer()}
 const download=(data,type,name)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};
 async function exportFile(kind){
  if(busy||!reviewed||!cloud.user)return;const r=reviewed,email=$('deposit-email').value,account=cloud.user.id,ticket=generation;busy=true;controls();$('deposit-fields').disabled=true;status('Preparing the download…');
  try{
   let documentBytes,vendors;
   if(kind!=='vendors')documentBytes=await E.documentBytes(window.JSZip,await asset('assets/deposit/holding-template.docx'),r);
   if(kind!=='docx')vendors=await asset('assets/deposit/move-in-vendors.pdf');
   if(ticket!==generation||cloud.user?.id!==account)return;
   const name=M.filename(r.address);
   if(kind==='docx')download(documentBytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',name+'.docx');
   else if(kind==='vendors')download(vendors,'application/pdf','Move-In Vendors.pdf');
   else{
    const zip=new window.JSZip();zip.file(name+'.docx',documentBytes);zip.file('Move-In Vendors.pdf',vendors);zip.file('Deposit email.txt',email);
    if(imageFile)zip.file('Payment details.'+(imageFile.type==='image/png'?'png':'jpg'),await imageFile.arrayBuffer());
    const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
    if(ticket!==generation||cloud.user?.id!==account)return;download(bytes,'application/zip',name+' - packet.zip');
   }
   status('Download prepared. Attach the deposit form and Move-In Vendors sheet to your email; sending, signing and payment remain separate steps.');
  }catch(error){if(ticket===generation)status('Download unavailable: '+error.message)}
  finally{if(ticket===generation){busy=false;$('deposit-fields').disabled=!cloud.user;controls()}}
 }
 $('deposit-docx').onclick=()=>exportFile('docx');$('deposit-vendors').onclick=()=>exportFile('vendors');$('deposit-packet').onclick=()=>exportFile('packet');
 $('deposit-copy').onclick=async()=>{
  if(!reviewed||!cloud.user)return;const account=cloud.user.id,ticket=generation;
  try{await navigator.clipboard.writeText($('deposit-email').value);if(ticket===generation&&cloud.user?.id===account)status('Email copied. Attach both documents before sending it yourself.');}
  catch{if(ticket===generation&&cloud.user?.id===account){$('deposit-email').focus();$('deposit-email').select();status('Email selected for manual copying.');}}
 };
 function open(){const panel=$('deposit-preparation');panel.open=true;panel.scrollIntoView({block:'start',behavior:'instant'});if(cloud.user)$('deposit-address').focus();else $('deposit-signin').focus();}
 window.addEventListener('ops-open-deposit',open);window.addEventListener('ops-auth-change',reset);reset();
})();
