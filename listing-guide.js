(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const model=window.OpsListingGuideModel;
 if(!model)return;
 const fields=['address','rent','facts','previous','photoNotes','approved'];
 const form=$('listing-guide-form'),output=$('listing-guide-prompt'),stage=$('listing-guide-stage'),copy=$('listing-guide-copy'),status=$('listing-guide-status');
 if(!form||!output||!stage||!copy||!status)return;
 const refresh=()=>{
   const data=Object.fromEntries(fields.map(k=>[k,$('listing-'+k).value]));
   data.stage=stage.value;
   output.value=model.buildPrompt(data);
   $('listing-approved-wrap').hidden=stage.value!=='features';
   $('listing-stage-explanation').textContent=stage.value==='features'?'After Leslie approves one description, paste the approved text below to derive website-only ALL-CAPS features.':'First send Leslie two full alternatives for selection. Website features are a separate post-approval step.';
   status.textContent='Prompt prepared locally. No listing data has been saved or sent.';
 };
 form.addEventListener('input',refresh);
 form.addEventListener('change',refresh);
 copy.addEventListener('click',async()=>{
  try{
   if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(output.value);status.textContent='Prompt copied. Paste into ChatGPT or Gemini; review the response before sending to Leslie.';}
   else{output.focus();output.select();status.textContent='Prompt selected. Use Copy, then paste into ChatGPT or Gemini.';}
  }catch{output.focus();output.select();status.textContent='Clipboard unavailable. Prompt selected: use Copy.';}
 });
 $('listing-guide-clear').addEventListener('click',()=>{
   form.reset();stage.value='drafts';refresh();$('listing-address').focus();status.textContent='Inputs cleared. Nothing was stored or sent.';
 });
 refresh();
})();
