/* Reviewed holding-deposit fields. No payments, task writes or applicant decisions. */
(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./renewal-rules.js'):root.OpsRenewalRules,node?require('./today-model.js'):root.OpsTodayModel);
 if(node)module.exports=api;if(root)root.OpsDepositModel=api;
})(typeof window!=='undefined'?window:null,function(R,T){
 'use strict';
 const PET_CENTS=15000,clean=v=>typeof v==='string'?v.trim():'';
 const text=(v,label,max=220)=>{const x=clean(v);if(!x||x.length>max||/[\r\n]/.test(x))throw Error('Enter '+label+' on one line (up to '+max+' characters).');return x};
 const money=(v,label)=>{const n=R.moneyCents(v);if(n===null||n<=0||n>100000000)throw Error('Enter a positive '+label+' with at most two decimals.');return n};
 const dollars=n=>R.formatCents(n).slice(1);
 const date=v=>{if(!T.validDate(v))throw Error('Enter the confirmed move-in date.');return v.slice(5,7)+'/'+v.slice(8,10)+'/'+v.slice(0,4)};
 function review(input={}){
  const errors=[],report={};
  try{
   report.address=text(input.address,'full property/unit address');
   report.greeting=text(input.greeting,'email greeting name(s)',120);report.sender=text(input.sender,'sender name',100);
   if(!Array.isArray(input.signers)||input.signers.length<1||input.signers.length>6)throw Error('Add between one and six tenant signers.');
   const seen=new Set();report.signers=input.signers.map((s,i)=>{
    const name=text(s.name,'signer '+(i+1)+' name',120),email=text(s.email,'signer '+(i+1)+' email',254);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Check signer '+(i+1)+' email.');
    if(seen.has(email.toLowerCase()))throw Error('Use a distinct email for each tenant signer.');seen.add(email.toLowerCase());return {name,email};
   });
   report.securityCents=money(input.security,'base security deposit');report.rentCents=money(input.rent,'full first-month rent');
   if(!/^\d{1,2}$/.test(String(input.pets??''))||Number(input.pets)>20)throw Error('Confirm the pet count (0–20).');
   report.pets=Number(input.pets);report.petCents=report.pets*PET_CENTS;report.holdingCents=report.securityCents+report.petCents;
   report.moveIn=input.moveIn;report.moveInLabel=date(input.moveIn);
   report.credit=report.pets?'**This holding deposit shall be credited to the tenants security deposit upon lease signing, however $ '+dollars(report.petCents)+' of the deposit is non-refundable once applied to the lease for a pet deposit.**':'**This holding deposit shall be credited to the tenants security deposit upon lease signing.**';
   report.paragraphs=[
    'I, '+report.signers[0].name+', agree and understand that;',
    'I am paying a NON-REFUNDABLE HOLDING DEPOSIT OF $ '+dollars(report.holdingCents)+' for the premises located at '+report.address+'.  If the tenant does not move in for any reason, this holding deposit shall be forever forfeited and shall not be refunded.  I understand that I am required to pay the balance of $ '+dollars(report.rentCents)+' for a full first month rent on or before '+report.moveInLabel+'.  At the time I will send an electronic payment via Venmo, or Zelle and will receive an e-sign lease, I will receive the lockbox code to get the keys and receive an email to set up my Turbo tenant portal.  In order to sign the lease an email for each tenant that is regularly used as a vital communication link between tenants, landlord and portal is needed. I may have one that you sent your information to me with already, verify this is the one that needs to be used for the lease and portal.',
    'I have viewed the property and I am happy with the condition. I understand I need to set up utilities to be on for my move in date failure to do so could result in having no utilities and I have been provided with those phone numbers.',
    'I also understand my pro-rated rent will be due on the 1st of the following month.'
   ];
   report.email='Hi '+report.greeting+',\n\nI’ve attached the deposit form for your signatures. Once completed, you can send the deposit via Venmo or Zelle.\n\nI’ve also included the Move-In Vendors Sheet for your reference. Please arrange to have the utilities set up prior to move-in to avoid any interruption in service, as I will be canceling my accounts once the lease is signed.\n\nPlease feel free to reach out if you have any questions. Thank you!\n\nThank you!\n'+report.sender+'\nOaktown Rentals';
  }catch(error){errors.push(error.message)}
  if(input.approved!==true)errors.push('Confirm that Leslie’s approval is recorded and these terms are confirmed.');
  return {valid:!errors.length,errors,report};
 }
 const filename=address=>'Non-refundable Deposit - '+String(address).replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').trim().slice(0,100);
 return Object.freeze({PET_CENTS,review,dollars,filename});
});
