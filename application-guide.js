(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const model=window.OpsApplicationGuideModel;
 if(!model)return;
 const form=$('application-guide-form'),result=$('application-guide-prompt'),status=$('application-guide-status'),incomeResult=$('application-income-result');
 if(!form||!result||!status||!incomeResult)return;
 const keys=['stage','mode','property','status','policy','request','rent','grossPay','payFrequency'];
 const update=()=>{
  const values=Object.fromEntries(keys.map(k=>[k,$('application-'+k).value]));
  result.value=model.buildPrompt(values);
  const x=model.calculateIncome(values);
  incomeResult.textContent=x.valid
   ?'REVIEW ONLY — estimated monthly gross $'+x.monthlyGross.toFixed(2)+'; 3× asking rent $'+x.benchmark.toFixed(2)+'; ratio '+x.ratio.toFixed(2)+'×. '+x.message+' Staff must confirm the source figures, household/voucher circumstances and applicable policy.'
   :x.message;
  status.textContent='Draft prompt prepared locally. No applicant information has been saved or sent.';
 };
 form.addEventListener('input',update);
 form.addEventListener('change',update);
 $('application-guide-copy').addEventListener('click',async()=>{
  try{
   if(navigator.clipboard&&window.isSecureContext){
    await navigator.clipboard.writeText(result.value);
    status.textContent='Prompt copied. Review and redact before using an authorized AI assistant.';
   }else {result.focus();result.select();status.textContent='Prompt selected; use your device Copy command.';}
  }catch{result.focus();result.select();status.textContent='Clipboard blocked; prompt selected for manual copying.';}
 });
 $('application-guide-clear').addEventListener('click',()=>{
  form.reset();update();$('application-status').focus();status.textContent='Inputs cleared; no case record changed.';
 });
 update();
})();
