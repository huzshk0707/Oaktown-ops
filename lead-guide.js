(()=>{'use strict';
 const $=id=>document.getElementById(id),model=window.OpsLeadGuideModel;
 if(!model)return;
 const form=$('lead-guide-form'),prompt=$('lead-guide-prompt'),copy=$('lead-guide-copy'),status=$('lead-guide-status');
 if(!form||!prompt||!copy||!status)return;
 const fields=['property','facts','corrections','example','thread','mode'];
 function refresh(){
   const data=Object.fromEntries(fields.map(k=>[k,$('lead-'+k).value]));
   prompt.value=model.buildPrompt(data);
   status.textContent='Prompt prepared in this browser. Nothing has been saved or sent.';
 }
 form.addEventListener('input',refresh);
 form.addEventListener('change',refresh);
 copy.addEventListener('click',async()=>{
   try {
     if(navigator.clipboard&&window.isSecureContext){
       await navigator.clipboard.writeText(prompt.value);
       status.textContent='Copied. Review and paste into an approved AI tool. Never send its suggested tenant reply without staff review.';
     } else {prompt.focus();prompt.select();status.textContent='Prompt selected. Use Copy, then paste into your approved AI tool.';}
   } catch {prompt.focus();prompt.select();status.textContent='Clipboard unavailable. Prompt selected; use your device\'s Copy command.';}
 });
 $('lead-guide-clear').addEventListener('click',()=>{form.reset();refresh();$('lead-thread').focus();status.textContent='All input fields cleared; no lead record was created.';});
 refresh();
})();
