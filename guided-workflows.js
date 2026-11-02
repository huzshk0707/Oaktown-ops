/* Progressive disclosure for source guides. Progress is only a reading aid in memory. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const button=(text,action,cls='button')=>{const node=el('button',cls,text);node.type='button';node.addEventListener('click',action);return node};
 const configs=[
  {key:'listing',section:'listings-workflow',title:'Prepare a listing',intro:'From verified property details to a description Leslie approves.',list:'.listing-steps',card:'.listing-card',heading:'listings-guide-title',
   steps:[
    {title:'Find the right unit',summary:'Start with Leslie’s current photos and notes. Match them to the exact property and unit.',items:[0]},
    {title:'Verify the details',summary:'Confirm rent and current features. Leave unknowns blank and ask Leslie rather than borrowing details.',items:[1]},
    {title:'Draft two alternatives',promptStage:'drafts',summary:'Build a prompt for two full descriptions. Let Leslie choose a version or request changes.',items:[2],cta:true},
    {title:'Get approval',promptStage:'features',cta:true,summary:'Keep Leslie’s approved description unchanged. Create website feature lines only after approval.',items:[3]},
    {title:'Publish and check',summary:'Staff publishes the same approved description across platforms, then checks the live pages.',items:[4]}
   ],
   groups:[
    {title:'Property & goal',hint:'Start with the exact unit and what you need. Unknown details can stay blank.',fields:['listing-guide-stage','listing-address','listing-rent'],extras:['listing-stage-explanation']},
    {title:'Verified details',hint:'Add only what you can confirm for this unit. These fields are optional.',fields:['listing-facts','listing-photoNotes']},
    {title:'Reference & approval',hint:'Older text is reference only. Approved text is needed only for website features.',fields:['listing-previous'],extras:['listing-approved-wrap']}
   ],privacy:'Use public property details only. Leave tenant data, access codes and private photos out.',privacySelector:'.listing-warning',output:'listing-guide-prompt',initial:'listing-address'},
  {key:'lead',section:'leads-workflow',title:'Handle a lead',intro:'Read the conversation, verify the facts, then prepare one useful reply.',list:'.lead-flow',card:'.lead-panel',heading:'leads-title',
   steps:[
    {title:'Read the full thread',summary:'Find the exact unit and the latest unanswered question—not just the last message.',items:[0]},
    {title:'Check what’s answered',summary:'Keep earlier answers and Leslie’s promises in view. Don’t repeat questions already answered.',items:[1]},
    {title:'Verify current facts',summary:'Check current rent, availability and utilities for this unit. Old quotes are not current proof.',items:[2]},
    {title:'Prepare a reply',summary:'Ask AI for a short Suggested Reply and a separate Internal Note. You can analyze or rewrite instead.',items:[3],cta:true},
    {title:'Review, then send',summary:'Staff checks accuracy and privacy, handles screening or accommodation questions, and sends through the original channel.',items:[4]}
   ],
   groups:[
    {title:'Conversation & goal',hint:'Paste the full redacted thread so earlier answers are not missed.',fields:['lead-mode','lead-thread']},
    {title:'Property facts',hint:'Add the exact unit and facts you have verified. Unknowns can stay blank.',fields:['lead-property','lead-facts']},
    {title:'Leslie’s context',hint:'Optional: recent corrections or one relevant anonymized example.',fields:['lead-corrections','lead-example']}
   ],privacy:'Redact names, contacts and identifiers. Never include IDs, bank details, door codes or sensitive histories.',privacySelector:'.lead-notice',output:'lead-guide-prompt',initial:'lead-thread'},
  {key:'application',section:'applications-workflow',title:'Process an application',intro:'A flexible map of the staff process, including work that runs in parallel.',list:'.application-steps',card:'.application-panel',heading:'applications-title',
   steps:[
    {title:'Receive the application',summary:'Open the Fillout submission and confirm the property and files. A submission is not a signed application.',items:[0]},
    {title:'Run parallel checks',summary:'These workstreams can move independently. You can read or review them in any order.',items:[1,2,3],parallel:['Dropbox signature','Income review','Prepare verification'],shorts:['Send to the same applicant and track signature status. Internal pay-stub arithmetic need not wait.','Review gross pay and frequency against verified rent. The numerical comparison is not an eligibility decision.','Identify the correct jurisdictions and collect landlord contacts. External inquiries still need applicable consent.']},
    {title:'Authorized verification',summary:'Confirm required permission before external requests. Water and landlord responses can arrive separately.',items:[4,5],parallel:['Water verification','Landlord reference'],shorts:['Use signed page 3 and confirm the recipient. Track sent, pending and received separately.','Use the approved form and message once required permission is in place. Track the request and reply.']},
    {title:'Prepare the findings',promptStage:'summary',summary:'Bring the evidence, missing items and discrepancies together for Leslie.',items:[6],cta:true},
    {title:'Get Leslie’s decision',summary:'Only Leslie or an authorized reviewer makes the decision under current policy. AI and income ratios do not approve a case.',items:[7]},
    {title:'Prepare approved documents',summary:'After documented approval, use reviewed deposit and vendor templates. Missing templates and terms need confirmation.',items:[8]},
    {title:'Hand off the next work',summary:'Move to lease preparation, move-in and utility workflows. Keep missing templates or instructions visible.',items:[9]}
   ],
   groups:[
    {title:'Task & property',hint:'Choose the actual work you need help with. This does not change your place in the guide.',fields:['application-stage','application-mode','application-property']},
    {title:'Progress & request',hint:'Describe completed work, pending items and the help you want, without applicant identifiers.',fields:['application-status','application-request']},
    {title:'Income numbers',hint:'Optional. Anonymous numerical summaries only. This worksheet does not decide eligibility.',fields:['application-rent','application-grossPay','application-payFrequency'],extras:['application-income-result']},
    {title:'Current guidance',hint:'Optional. Add only what Leslie actually confirmed, including the source and date.',fields:['application-policy']}
   ],privacy:'Use redacted notes and anonymous earnings totals only. Never paste pay stubs, IDs, banking details or DOBs.',privacySelector:'.application-warning',output:'application-guide-prompt',initial:'application-property'}
 ];
 for(const config of configs)enhance(config);
 function enhance(c){
  const root=$(c.section),form=$(c.key+'-guide-form'),output=$(c.output);
  if(!root||!form||!output)return;
  // Capture existing content and controls before moving them; no input is cloned.
  const cards=[...root.querySelectorAll(':scope > '+c.card)],sourceItems=[...root.querySelectorAll(c.list+' > li')];
  const originalHeading=$(c.heading),copy=$(c.key+'-guide-copy'),clear=$(c.key+'-guide-clear'),status=$(c.key+'-guide-status');
  const outputLabel=root.querySelector('label[for="'+c.output+'"]');
  const privacyNotes=[...root.querySelectorAll(c.privacySelector)];
  const notes=el('details','guide-resources'),notesTitle=el('summary','', 'Sources & detailed guidance');notes.append(notesTitle);
  for(const card of cards){
   if(card.contains(form)){
    for(const note of card.querySelectorAll(':scope > p:not(.status)'))notes.append(note);
    continue;
   }
   for(const node of [...card.children]){
    if(node===originalHeading||node.matches('.stage,'+c.list))continue;
    notes.append(node);
   }
  }
  for(const note of privacyNotes){if(!notes.contains(note))notes.append(note)}
  const fieldGroups=c.groups.map((group,i)=>{
   const panel=el('section','guide-form-step');panel.dataset.promptStep=String(i);
   const title=el('h3','guide-step-title',group.title);title.tabIndex=-1;
   panel.append(el('span','guide-eyebrow','DETAILS '+(i+1)+' OF '+c.groups.length),title,el('p','guide-hint',group.hint));
   for(const id of group.fields){const input=$(id);if(input)panel.append(input.closest('label'))}
   for(const id of group.extras||[]){const node=$(id);if(node)panel.append(node)}
   return panel;
  });
  form.replaceChildren(...fieldGroups);
  const header=el('div','guide-header');
  originalHeading.textContent=c.title;header.append(originalHeading,el('p','guide-hint',c.intro));
  let view='workflow',all=false,flowIndex=0,promptIndex=0;
  const reviewed=c.steps.map(step=>step.items.map(()=>false));
  const toolbar=el('div','guide-toolbar'),viewControls=el('div','guide-segments');viewControls.setAttribute('role','group');viewControls.setAttribute('aria-label','Guide view');
  const workflowButton=button('Workflow',()=>changeView('workflow')),promptButton=button('Build prompt',()=>changeView('prompt'));
  viewControls.append(workflowButton,promptButton);
  const modes=el('div','guide-segments');modes.setAttribute('role','group');modes.setAttribute('aria-label','Reading mode');
  const guidedButton=button('One step',()=>{all=false;render()}),allButton=button('View all',()=>{all=true;render()});modes.append(guidedButton,allButton);toolbar.append(viewControls,modes);
  const flow=el('div','guide-workflow'),prompt=el('div','guide-prompt'),flowLayout=el('div','guide-layout');
  const flowRail=el('nav','guide-step-nav');flowRail.setAttribute('aria-label',c.title+' steps');
  const railList=el('ol'),flowButtons=[];
  c.steps.forEach((step,i)=>{
   const li=el('li'),b=button('',()=>{flowIndex=i;render();focusTitle(flowPanels[i])},'guide-step-button');
   b.append(el('span','guide-step-number',String(i+1)),el('span','guide-step-name',step.title),el('span','guide-step-check'));
   b.setAttribute('aria-label','Step '+(i+1)+': '+step.title);li.append(b);railList.append(li);flowButtons.push(b);
  });flowRail.append(railList);
  const flowContent=el('div','guide-content'),flowPanels=c.steps.map((step,i)=>{
   const panel=el('section','guide-step-card');panel.dataset.workflowStep=String(i);
   const title=el('h3','guide-step-title',step.title);title.tabIndex=-1;
   panel.append(el('span','guide-eyebrow','STEP '+(i+1)+' OF '+c.steps.length),title,el('p','guide-step-summary',step.summary));
   const items=el('div',step.parallel?'guide-parallel':'guide-detail-block');
   step.items.forEach((sourceIndex,j)=>{
    const item=el('div',step.parallel?'guide-branch':'guide-context');
    if(step.parallel){item.append(el('span','guide-branch-label','PARALLEL '+String.fromCharCode(65+j)),el('h4','',step.parallel[j]),el('p','guide-hint',step.shorts[j]))}
    const details=el('details','guide-more'),summary=el('summary','',step.parallel?'Instructions':'Read the details');
    const original=sourceItems[sourceIndex];details.append(summary,el('p','',original?.textContent||''));item.append(details);
    const mark=button('Mark reviewed',()=>{
     reviewed[i][j]=!reviewed[i][j];render();
    },'button guide-review');
    mark.dataset.reviewStep=i+':'+j;
    item.append(mark);
    items.append(item);
   });panel.append(items);
   if(step.cta)panel.append(button('Build a prompt for this work',()=>{
    if(step.promptStage){
     const select=$(c.key==='listing'?'listing-guide-stage':'application-stage');
     select.value=step.promptStage;select.dispatchEvent(new Event('change',{bubbles:true}));
     if(c.key==='application'){$('application-mode').value='summary';$('application-mode').dispatchEvent(new Event('change',{bubbles:true}))}
    }
    changeView('prompt');
   },'button primary guide-prompt-link'));
   return panel;
  });
  const flowFooter=el('div','guide-footer'),flowBack=button('Back',()=>moveFlow(-1)),flowNext=button('Next step',()=>moveFlow(1)),markNext=button('Reviewed · next',()=>{
   reviewed[flowIndex].fill(true);
   if(flowIndex<c.steps.length-1)moveFlow(1);else render();
  },'button primary');
  flowFooter.append(flowBack,markNext,flowNext);flowContent.append(...flowPanels,flowFooter);flowLayout.append(flowRail,flowContent);
  const progressRow=el('div','guide-progress-row'),progress=el('progress'),progressLabel=el('span');progress.max=c.steps.length;progress.setAttribute('aria-label','Steps reviewed in this guide');
  progressRow.append(progress,progressLabel);flow.append(progressRow,flowLayout,el('p','guide-session-note','Review progress is just your place in this guide. It resets on reload; it does not update case records.'));
  const promptTop=el('div','guide-prompt-top');promptTop.append(el('p','guide-privacy',c.privacy),clear);
  const promptRail=el('nav','guide-form-nav');promptRail.setAttribute('aria-label','Prompt preparation steps');const promptButtons=[];
  const review=el('section','guide-form-step guide-output');review.dataset.promptStep=String(c.groups.length);
  const reviewTitle=el('h3','guide-step-title','Review & copy');reviewTitle.tabIndex=-1;
  review.append(el('span','guide-eyebrow','READY WHEN YOU ARE'),reviewTitle,el('p','guide-hint','Check what you added, then copy the prompt into your approved AI tool. Blank fields stay unknown.'));
  const recap=el('div','guide-recap');review.append(recap);
  const preview=el('details','guide-prompt-preview');preview.append(el('summary','','Review or edit the full prompt'),outputLabel,output);review.append(preview);
  const copyActions=el('div','guide-copy-actions');copyActions.append(copy);review.append(copyActions,status,el('p','guide-session-note','Nothing is sent to AI or saved as a work record. Staff reviews any output before use.'));
  const promptPanels=[...fieldGroups,review];
  promptPanels.forEach((panel,i)=>{
   const name=i<c.groups.length?c.groups[i].title:'Review & copy';
   const b=button((i+1)+'. '+name,()=>{promptIndex=i;render();focusTitle(panel)},'guide-form-jump');promptButtons.push(b);promptRail.append(b);
  });
  const promptFooter=el('div','guide-footer'),promptBack=button('Back',()=>movePrompt(-1)),promptNext=button('Continue',()=>movePrompt(1),'button primary');
  promptFooter.append(promptBack,promptNext);
  prompt.append(promptTop,promptRail,form,review,promptFooter);
  root.replaceChildren(header,toolbar,flow,prompt,notes);root.classList.add('guided-workspace');
  clear.addEventListener('click',()=>{promptIndex=0;render();queueMicrotask(refreshRecap)},{capture:true});
  form.addEventListener('input',refreshRecap);form.addEventListener('change',refreshRecap);
  function refreshRecap(){
   recap.replaceChildren();
   c.groups.forEach((group,i)=>{
    const fields=[...fieldGroups[i].querySelectorAll('input,textarea')];
    const count=fields.filter(n=>n.value.trim()).length;
    const item=button('',()=>{promptIndex=i;all=false;render();focusTitle(fieldGroups[i])},'guide-recap-item');
    item.append(el('strong','',group.title),el('span','',fields.length?(count?count+' of '+fields.length+' text fields added':'No text added — optional'):'Selection set'),el('span','guide-recap-edit','Edit'));
    recap.append(item);
   });
  }
  function changeView(next){view=next;render()}
  function focusTitle(panel){panel.querySelector('.guide-step-title')?.focus()}
  function moveFlow(delta){flowIndex=Math.max(0,Math.min(c.steps.length-1,flowIndex+delta));render();focusTitle(flowPanels[flowIndex])}
  function movePrompt(delta){promptIndex=Math.max(0,Math.min(promptPanels.length-1,promptIndex+delta));render();focusTitle(promptPanels[promptIndex])}
  function render(){
   root.dataset.guideView=view;root.dataset.guideMode=all?'all':'one';
   workflowButton.setAttribute('aria-pressed',String(view==='workflow'));promptButton.setAttribute('aria-pressed',String(view==='prompt'));
   guidedButton.setAttribute('aria-pressed',String(!all));allButton.setAttribute('aria-pressed',String(all));
   flow.hidden=view!=='workflow';prompt.hidden=view!=='prompt';
   flowRail.hidden=all;flowFooter.hidden=all;promptFooter.hidden=all;
   flowPanels.forEach((panel,i)=>panel.hidden=!all&&i!==flowIndex);
   promptPanels.forEach((panel,i)=>panel.hidden=!all&&i!==promptIndex);
   flowButtons.forEach((b,i)=>{
    const done=reviewed[i].every(Boolean);b.classList.toggle('is-reviewed',done);
    b.querySelector('.guide-step-check').textContent=done?'✓':'';
    b.setAttribute('aria-label','Step '+(i+1)+': '+c.steps[i].title+(done?' — reviewed':''));
    if(i===flowIndex&&!all)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
   });
   promptButtons.forEach((b,i)=>{if(i===promptIndex&&!all)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
   root.querySelectorAll('[data-review-step]').forEach(b=>{
    const [i,j]=b.dataset.reviewStep.split(':').map(Number),done=reviewed[i][j];
    b.hidden=!all&&!c.steps[i].parallel;
    b.textContent=done?'Reviewed ✓':'Mark reviewed';b.setAttribute('aria-pressed',String(done));
   });
   const done=reviewed.filter(group=>group.every(Boolean)).length;progress.value=done;progressLabel.textContent=done+' of '+c.steps.length+' steps reviewed';
   flowBack.disabled=flowIndex===0;flowNext.disabled=flowIndex===c.steps.length-1;
   markNext.hidden=!!c.steps[flowIndex].parallel;
   markNext.disabled=flowIndex===c.steps.length-1&&reviewed[flowIndex].every(Boolean);
   markNext.textContent=flowIndex===c.steps.length-1?(markNext.disabled?'Reviewed ✓':'Mark reviewed'):'Reviewed · next';
   promptBack.disabled=promptIndex===0;promptNext.hidden=promptIndex===promptPanels.length-1;
   promptNext.textContent=promptIndex===promptPanels.length-2?'Review & copy':'Continue';
   refreshRecap();
  }
  render();
 }
})();
