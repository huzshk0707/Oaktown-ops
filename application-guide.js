(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const model=window.OpsApplicationGuideModel;
 if(!model)return;
 const form=$('application-guide-form'),result=$('application-guide-prompt'),status=$('application-guide-status');
 if(!form||!result||!status)return;
 const keys=['stage','mode','property','status','policy','request'];
 const update=()=>{
  const values=Object.fromEntries(keys.map(k=>[k,$('application-'+k).value]));
  result.value=model.buildPrompt(values);
  status.textContent='Draft prompt prepared locally. No application record has been saved or sent.';
 };
 form.addEventListener('input',update);
 form.addEventListener('change',update);
 $('application-guide-copy').addEventListener('click',async()=>{
  try{
   if(navigator.clipboard&&window.isSecureContext){
    await navigator.clipboard.writeText(result.value);
    status.textContent='Prompt copied. Review/redact before using your approved AI assistant.';
   }else {result.focus();result.select();status.textContent='Prompt selected; use your device Copy command.';}
  }catch{result.focus();result.select();status.textContent='Clipboard blocked; prompt selected for manual copying.';}
 });
 $('application-guide-clear').addEventListener('click',()=>{
  form.reset();update();$('application-status').focus();status.textContent='Inputs cleared; no case changes made.';
 });
 update();
})();
