/* Focus Board view and native Center Focus dialog. Task state belongs to OpsToday. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),host=$('focus-workflow'),store=window.OpsToday,M=window.OpsFocusBoardModel,T=window.OpsTodayModel,W=window.OpsWorkstationModel;
 if(!host||!store||!M||!W)return;
 const deck=$('focus-deck'),track=$('focus-track'),topbar=document.querySelector('.topbar'),search=$('operations-search-open');
 const dialog=$('focus-detail-dialog'),body=$('focus-detail-body'),content=$('focus-detail-content');
 const searchText=search.textContent,searchHome=document.createComment('Shared search control');search.before(searchHome);
 const exit=document.createElement('button');exit.type='button';exit.id='focus-exit';exit.className='button';exit.textContent='Full workspace';exit.hidden=true;topbar.prepend(exit);
 let selectedId=null,detailId=null,active=false,previousRoute={workflow:'today',tab:null},pointer=null,suppressClick=false,reference=T.today();
 let reviewBusy=false,interaction=0,closing=0,boardScroll=0,detailScroll=0,reviewReturn=null;
 const rows=()=>M.order(store.getData()?.tasks||[],reference);
 const reduced=()=>document.documentElement.dataset.opsMotion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 const date=value=>value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Not recorded';
 const selectedButton=()=>track.querySelector('.focus-card[data-offset="0"] .focus-open-task');
 function fact(list,label,value){list.append(node('dt',label),node('dd',value))}
 function facts(task){
  const list=node('dl',null,'focus-facts');
  fact(list,'Due date',date(M.due(task)));fact(list,'Follow-up',date(T.validDate(task.intake_details?.follow_up?.date)?task.intake_details.follow_up.date:null));
  fact(list,'Owner',task.assigned_label||task.assigned_user_id||'Unassigned');fact(list,'Work level',W.level(task).label);return list;
 }
 function tags(task){
  const tags=node('div',null,'focus-card-tags'),priority=node('span','Priority · '+(task.priority||'Not recorded'),'focus-priority');priority.dataset.priority=String(task.priority||'').toLowerCase();tags.append(priority,node('span','Status · '+(task.status||'Not recorded'),'focus-task-status'));return tags;
 }
 function animate(element,frames,options){if(!reduced())return element.animate(frames,options)}
 function card(task,index,total,offset){
  const item=node('article',null,'focus-card'),look=M.appearance(task,reference);item.dataset.offset=offset;item.dataset.taskId=task.id;item.dataset.lane=look.lane;item.dataset.tone=look.tone;item.style.setProperty('--slot',offset);
  if(offset!==0)item.setAttribute('aria-hidden','true');
  else{item.setAttribute('role','group');item.setAttribute('aria-roledescription','slide');item.setAttribute('aria-label','Task '+(index+1)+' of '+total);}
  const top=node('div',null,'focus-card-top');top.append(node('span',task.task_code||task.id,'focus-task-code'),node('span',look.label,'focus-lane'));
  item.append(top,node('h2',task.task_title||'Untitled task'),tags(task),facts(task));
  const bottom=node('div',null,'focus-card-bottom');bottom.append(node('span','TASK RECORD'),node('span',task.id,'focus-record-id'));item.append(bottom);
  if(offset===0){const open=node('button','Open Focus Mode →','focus-open-task');open.type='button';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-label','Open Focus Mode for '+(task.task_title||'this task'));item.append(open)}
  return item;
 }
 function render(){
  if(!active)return;
  const phase=store.getState(),ready=!!window.OpsCloud.user&&phase==='ready',all=ready?rows():[];
  const restoreCard=document.activeElement?.classList.contains('focus-open-task');
  track.replaceChildren();deck.hidden=!all.length;$('focus-navigation').hidden=!all.length;$('focus-signin').hidden=!!window.OpsCloud.user;
  $('focus-refresh').disabled=!window.OpsCloud.user||phase==='loading';deck.setAttribute('aria-busy',String(phase==='loading'));
  $('focus-count').textContent=ready?all.length+' active '+(all.length===1?'task':'tasks'):'Active work';
  const state=!window.OpsCloud.user?'Sign in with your Oaktown staff account to open your active work.':phase==='error'?'Tasks could not be loaded. Refresh tasks to retry.':!ready?'Loading your active tasks…':!all.length?'No active tasks. Your completed and archived work is available in the full workspace.':'';
  $('focus-state').textContent=state;$('focus-state').hidden=!state;
  if(!ready||!all.length){$('focus-position').textContent='';if(!window.OpsCloud.user||phase==='error'||ready)selectedId=null;renderDetail(all,phase);return}
  if(dialog.open&&all.some(t=>t.id===detailId))selectedId=detailId;
  let at=all.findIndex(t=>t.id===selectedId);if(at<0)at=0;selectedId=all[at].id;
  for(let i=Math.max(0,at-2);i<=Math.min(all.length-1,at+2);i++)track.append(card(all[i],i,all.length,i-at));
  $('focus-prev').disabled=at===0;$('focus-next').disabled=at===all.length-1;
  $('focus-position').textContent=(at+1)+' / '+all.length+' · '+(all[at].task_code||'Task')+' · '+(all[at].task_title||'Untitled task');
  $('focus-progress-fill').style.width=((at+1)/all.length*100)+'%';
  renderDetail(all,phase);if(restoreCard&&!dialog.open)selectedButton()?.focus({preventScroll:true});
 }
 function choose(where,inside=false){
  if(!active||store.getState()!=='ready'||document.querySelector('dialog[open]')&&!inside||reviewBusy)return;
  const all=rows();if(!all.length)return;
  const at=Math.max(0,all.findIndex(t=>t.id===(inside?detailId:selectedId)));
  const next=where==='first'?0:where==='last'?all.length-1:Math.max(0,Math.min(all.length-1,at+where));if(at===next)return;
  selectedId=all[next].id;if(inside){detailId=selectedId;detailScroll=0;body.scrollTop=0;interaction++}
  render();
  if(inside){$('focus-detail-title').focus({preventScroll:true});animate(body,[{opacity:.5,transform:'translateX('+(next>at?10:-10)+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:180})}
  else for(const item of track.children){const base=getComputedStyle(item).transform;animate(item,[{transform:base+' translateX('+(next>at?38:-38)+'px) scale(.98)',opacity:.3},{transform:base+' translateX('+(next>at?-3:3)+'px)',offset:.8},{transform:base,opacity:item.dataset.offset==='0'?1:innerWidth<741?.5:.35}],{duration:330,easing:'cubic-bezier(.2,.75,.25,1)'})}
 }
 function clearDetail(){
  detailId=null;reviewBusy=false;delete dialog.dataset.taskId;delete dialog.dataset.tone;content.replaceChildren();$('focus-detail-title').textContent='Task focus';$('focus-detail-code').textContent='';$('focus-detail-feedback').textContent='';$('focus-detail-position').textContent='';document.body.classList.remove('focus-detail-open');
 }
 function closeDetail(restore=true,immediate=false){
  interaction++;const ticket=++closing;
  const finish=()=>{if(ticket!==closing)return;clearDetail();dialog.close();if(restore&&active){(selectedButton()||$('focus-heading')).focus({preventScroll:true});window.scrollTo({top:boardScroll,behavior:'instant'})}};
  for(const a of dialog.getAnimations())a.cancel();
  if(!dialog.open){clearDetail();return}
  if(immediate||reduced())finish();else animate(dialog,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.99)'}],{duration:130}).finished.then(finish,finish);
 }
 function openDetail(){
  if(!active||store.getState()!=='ready'||document.querySelector('dialog[open]')||!rows().some(t=>t.id===selectedId))return;
  closing++;interaction++;detailId=selectedId;detailScroll=0;boardScroll=scrollY;pointer=null;reviewBusy=false;
  dialog.showModal();document.body.classList.add('focus-detail-open');renderDetail(rows(),store.getState());body.scrollTop=0;$('focus-detail-title').focus({preventScroll:true});
  animate(dialog,[{opacity:0,transform:'translateY(18px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 function renderDetail(all,phase){
  if(!dialog.open)return;
  const task=phase==='ready'?all.find(t=>t.id===detailId):null,at=task?all.findIndex(t=>t.id===detailId):-1;
  if(phase==='loading')detailScroll=body.scrollTop||detailScroll;
  content.replaceChildren();dialog.setAttribute('aria-busy',String(phase==='loading'));
  for(const id of ['focus-detail-prev','focus-detail-next','focus-detail-review'])$(id).disabled=!task||reviewBusy;
  $('focus-detail-refresh').disabled=phase==='loading'||!window.OpsCloud.user||reviewBusy;
  if(!task){
   delete dialog.dataset.taskId;delete dialog.dataset.tone;
   $('focus-detail-title').textContent=phase==='loading'?'Refreshing task…':phase==='error'?'Task details unavailable':'Task no longer available';$('focus-detail-code').textContent='';$('focus-detail-position').textContent='';
   content.append(node('p',phase==='loading'?'Checking the shared task records.':phase==='error'?'The refresh failed. Refresh tasks to retry, or return to the board.':'This task is no longer active or accessible. Return to the board to choose another task.','focus-detail-empty'));return;
  }
  const look=M.appearance(task,reference),projection=M.detail(task,store.getData());dialog.dataset.tone=look.tone;dialog.dataset.taskId=task.id;
  $('focus-detail-title').textContent=task.task_title||'Untitled task';$('focus-detail-code').textContent=task.task_code||task.id;
  const urgency=node('span',look.label,'focus-lane');content.append(urgency,tags(task),facts(task));
  if(!projection.sections.length)content.append(node('p','No additional description or notes recorded.','focus-detail-empty'));
  for(const [label,value] of projection.sections){const section=node('section',null,'focus-detail-section');section.append(node('h3',label),node('p',value));content.append(section)}
  for(const [label,entries] of [['Related records',projection.references],['Record details',projection.metadata]])if(entries.length){const section=node('section',null,'focus-detail-section'),list=node('dl',null,'focus-facts');section.append(node('h3',label));for(const [key,value] of entries)fact(list,key,value);section.append(list);content.append(section)}
  $('focus-detail-prev').disabled=at===0||reviewBusy;$('focus-detail-next').disabled=at===all.length-1||reviewBusy;
  $('focus-detail-position').textContent=(at+1)+' / '+all.length;body.scrollTop=detailScroll;
 }
 async function reviewTask(){
  if(reviewBusy||!dialog.open||store.getState()!=='ready'||!rows().some(t=>t.id===detailId))return;
  const api=window.OpsOperations,account=window.OpsCloud.user?.id,id=detailId,ticket=++interaction;
  if(!api?.refresh||!api?.openSource){$('focus-detail-feedback').textContent='Task Review is unavailable. Refresh the workspace and retry.';return}
  reviewBusy=true;renderDetail(rows(),store.getState());$('focus-detail-feedback').textContent='Checking the saved task before opening Review…';
  try{
   const saved=await api.refresh(true);
   if(ticket!==interaction||!dialog.open||window.OpsCloud.user?.id!==account||detailId!==id)return;
   if(store.getState()!=='ready'||!rows().some(t=>t.id===id)||!saved?.tasks.some(t=>t.id===id&&!t.archived_at))throw Error('Task unavailable');
   reviewReturn=id;closeDetail(false,true);await api.openSource('task',id);
  }catch{if(ticket===interaction&&dialog.open)$('focus-detail-feedback').textContent='Task Review could not be opened. Refresh tasks and retry.';}
  finally{if(ticket===interaction){reviewBusy=false;renderDetail(rows(),store.getState())}}
 }
 function leave(){reviewReturn=null;closeDetail(false,true);window.OpsWorkspace.navigate(previousRoute.workflow,previousRoute.tab)}
 function route(){
  const next=window.OpsWorkspace.getRoute(),on=next.workflow==='focus';
  if(!on){previousRoute={workflow:next.workflow,tab:next.tab};if(active){closeDetail(false,true);searchHome.after(search);search.textContent=searchText;exit.hidden=true;document.body.classList.remove('focus-board-mode');active=false;pointer=null;$('workspace-title').focus({preventScroll:true});}return}
  if(active)return;
  active=true;reference=T.today();document.body.classList.add('focus-board-mode');exit.hidden=false;topbar.insertBefore(search,$('workspace-appearance-open'));search.textContent='Search';
  if(reviewReturn){selectedId=reviewReturn;reviewReturn=null}
  render();if(window.OpsCloud.user)store.refresh();(deck.hidden?$('focus-heading'):deck).focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
 }
 $('focus-detail-back').onclick=()=>closeDetail();$('focus-detail-workspace').onclick=leave;
 $('focus-detail-prev').onclick=()=>choose(-1,true);$('focus-detail-next').onclick=()=>choose(1,true);$('focus-detail-review').onclick=reviewTask;
 $('focus-detail-refresh').onclick=()=>{interaction++;reviewBusy=false;$('focus-detail-feedback').textContent='';store.refresh()};
 body.addEventListener('scroll',()=>{if(dialog.open&&store.getState()==='ready'&&dialog.dataset.taskId===detailId)detailScroll=body.scrollTop});
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail()});
 dialog.addEventListener('close',()=>{if(!dialog.open)clearDetail()});
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeDetail()});
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length),first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('focus-detail-title'))){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 exit.onclick=leave;$('focus-signin').onclick=()=>$('account-button').click();$('focus-refresh').onclick=()=>{reference=T.today();store.refresh()};
 $('focus-prev').onclick=()=>choose(-1);$('focus-next').onclick=()=>choose(1);
 document.addEventListener('keydown',event=>{
  if(!active||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||document.querySelector('dialog[open]')||event.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  if((event.key==='Enter'||event.key===' ')&&event.target===deck){event.preventDefault();openDetail();return}
  const moves={ArrowLeft:-1,ArrowRight:1,Home:'first',End:'last'};if(!Object.hasOwn(moves,event.key))return;event.preventDefault();choose(moves[event.key]);
 });
 deck.addEventListener('click',event=>{if(suppressClick){suppressClick=false;return}if(dialog.open)return;const item=event.target.closest('.focus-card');if(item){const offset=Number(item.dataset.offset);offset?choose(offset):openDetail()}});
 deck.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0||dialog.open)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY};suppressClick=false});
 deck.addEventListener('pointermove',event=>{if(pointer?.id===event.pointerId&&Math.abs(event.clientX-pointer.x)>10&&Math.abs(event.clientX-pointer.x)>Math.abs(event.clientY-pointer.y)*1.4)deck.setPointerCapture(event.pointerId)});
 deck.addEventListener('pointerup',event=>{if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;if(Math.abs(dx)>=56&&Math.abs(dx)>Math.abs(dy)*1.4){suppressClick=true;choose(dx<0?1:-1)}});
 deck.addEventListener('pointercancel',()=>{pointer=null});
 window.addEventListener('ops-workspace-change',route);window.addEventListener('ops-today-state',render);
 window.addEventListener('ops-auth-change',()=>{interaction++;closeDetail(false,true);selectedId=null;reviewReturn=null;pointer=null;render();if(active&&window.OpsCloud.user)store.refresh()});
 window.addEventListener('resize',()=>{for(const animation of track.getAnimations({subtree:true}))animation.cancel()});
 const stopMotion=()=>{if(reduced())for(const scope of [host,dialog])for(const animation of scope.getAnimations({subtree:true}))animation.cancel()};
 new MutationObserver(stopMotion).observe(document.documentElement,{attributes:true,attributeFilter:['data-ops-motion']});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',stopMotion);
 setInterval(()=>{if(active&&!document.hidden&&reference!==T.today()){reference=T.today();render()}},60000);
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden){reference=T.today();render()}});
 route();
})();
