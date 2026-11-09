/* Navigation aids for the existing local notice studio; no data or PDF changes. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),area=$('generator-area'),frame=$('studio-frame');
 if(!area||!frame||!$('notice-picker'))return;
 const node=(tag,text,klass)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(klass)n.className=klass;return n};
 const toolbar=node('nav',null,'notice-step-navigation');toolbar.setAttribute('aria-label','Jump to a notice preparation step');
 const intro=node('div',null,'notice-step-intro');intro.append(node('strong','Prepare your notices'),node('span','Jump between steps. Review every draft before use.'));
 const steps=node('div',null,'notice-step-buttons'),buttons=[];
 const captions=['Select units','Edit details','Review & export'];
 const context=node('p','Drafts stay on this browser. Creating or downloading a draft does not send it.','notice-step-context');context.id='notice-workflow-context';context.setAttribute('role','status');
 const behavior=()=>document.documentElement.dataset.opsMotion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 function setStep(index){buttons.forEach((b,i)=>i===index?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current'))}
 function go(index){
  setStep(index);
  if(index===0&&!window.OpsCloud?.user){$('staff-access-signin').click();return}
  if(index===0){$('notice-picker-search').focus({preventScroll:true});$('notice-picker').scrollIntoView({block:'start',behavior:behavior()});return}
  const doc=frame.contentDocument;
  if(index===1){$('notice-editor-title').focus({preventScroll:true});$('notice-editor-overview').scrollIntoView({block:'start',behavior:behavior()});return}
  const target=doc?.getElementById('notice-readiness');
  if(!target){context.textContent='The notice editor is loading. Try Review & export again.';return}
  const heading=doc.getElementById('notice-readiness-title');heading.tabIndex=-1;heading.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:behavior()});
 }
 captions.forEach((caption,index)=>{const b=node('button',null,'button notice-step-button');b.type='button';b.append(node('span',String(index+1),'notice-step-number'),node('span',caption));b.addEventListener('click',()=>go(index));buttons.push(b);steps.append(b)});
 toolbar.append(intro,steps,context);area.prepend(toolbar);setStep(0);
 let observer;
 function refreshContext(){
  const doc=frame.contentDocument;if(!doc)return;
  const count=doc.querySelectorAll('#noticeList .chip').length;
  const selected=doc.querySelector('#noticeList .chip.active')?.textContent?.trim();
  const readiness=doc.getElementById('notice-readiness-summary')?.textContent?.trim();
  context.textContent=(count?count+' local draft'+(count===1?'':'s'):'Local notice drafts')+(selected?' · Selected: '+selected:'')+(readiness?' · '+readiness:'')+'. Browser-only draft; export a JSON backup. Not sent.';
 }
 function bindStudio(){
  observer?.disconnect();
  const doc=frame.contentDocument;if(!doc)return;
  observer=new MutationObserver(refreshContext);
  for(const id of ['noticeList','notice-readiness-summary']){const target=doc.getElementById(id);if(target)observer.observe(target,{subtree:true,childList:true,characterData:true,attributes:id==='noticeList',attributeFilter:id==='noticeList'?['class']:undefined})}
  doc.addEventListener('focusin',event=>{if(event.target.closest('#notice-readiness,.preview-panel'))setStep(2);else if(event.target.closest('.control-panel'))setStep(1)});
  refreshContext();
 }
 frame.addEventListener('load',bindStudio);
 if(frame.contentDocument?.readyState==='complete')bindStudio();
 $('notice-picker').addEventListener('focusin',()=>setStep(0));
 $('notice-back-to-selection').addEventListener('click',()=>setStep(0));
 $('message-edit-notice').addEventListener('click',()=>setStep(1));
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='oaktown-import-confirmed'&&(event.data.added||event.data.updated)){setStep(1);refreshContext()}});
})();
