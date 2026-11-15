/* Opt-in Focus Board. View selection only; tasks belong to OpsToday. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),host=$('focus-workflow'),store=window.OpsToday,M=window.OpsFocusBoardModel,T=window.OpsTodayModel,W=window.OpsWorkstationModel;
 if(!host||!store||!M||!W)return;
 const deck=$('focus-deck'),track=$('focus-track'),topbar=document.querySelector('.topbar'),search=$('operations-search-open');
 const searchText=search.textContent;
 const searchHome=document.createComment('Shared search control');search.before(searchHome);
 const exit=document.createElement('button');exit.type='button';exit.id='focus-exit';exit.className='button';exit.textContent='Full workspace';exit.hidden=true;topbar.prepend(exit);
 let selectedId=null,active=false,previousRoute={workflow:'today',tab:null},pointer=null,suppressClick=false,reference=T.today();
 const rows=()=>M.order(store.getData()?.tasks||[],reference);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 const date=value=>value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Not recorded';
 function fact(list,label,value){list.append(node('dt',label),node('dd',value))}
 function card(task,index,total,offset){
  const item=node('article',null,'focus-card');item.dataset.offset=offset;item.dataset.taskId=task.id;item.style.setProperty('--slot',offset);
  const kind=M.lane(task,reference),schedule=T.scheduled(task),labels={overdue:schedule?.type==='Follow-up'?'Follow-up overdue':'Overdue',today:schedule?.type==='Follow-up'?'Follow-up today':'Due today',urgent:'Urgent',remaining:'Active work'};
  item.dataset.lane=kind;
  if(offset!==0)item.setAttribute('aria-hidden','true');
  else{item.setAttribute('role','group');item.setAttribute('aria-roledescription','slide');item.setAttribute('aria-label','Task '+(index+1)+' of '+total);}
  const top=node('div',null,'focus-card-top');top.append(node('span',task.task_code||task.id,'focus-task-code'),node('span',labels[kind],'focus-lane'));item.append(top);
  const title=node('h2',task.task_title||'Untitled task');item.append(title);
  const tags=node('div',null,'focus-card-tags');tags.append(node('span',task.priority||'Not recorded','focus-priority'),node('span',task.status||'Not recorded','focus-task-status'));item.append(tags);
  const facts=node('dl',null,'focus-facts');fact(facts,'Due date',date(M.due(task)));fact(facts,'Owner',task.assigned_label||task.assigned_user_id||'Unassigned');fact(facts,'Work level',W.level(task).label);fact(facts,'Follow-up',date(T.validDate(task.intake_details?.follow_up?.date)?task.intake_details.follow_up.date:null));item.append(facts);
  const bottom=node('div',null,'focus-card-bottom');bottom.append(node('span','TASK RECORD'),node('span',task.id,'focus-record-id'));item.append(bottom);
  return item;
 }
 function render(){
  if(!active)return;
  const phase=store.getState(),ready=!!window.OpsCloud.user&&phase==='ready',all=ready?rows():[];
  track.replaceChildren();deck.hidden=!all.length;$('focus-navigation').hidden=!all.length;$('focus-signin').hidden=!!window.OpsCloud.user;
  $('focus-refresh').disabled=!window.OpsCloud.user||phase==='loading';deck.setAttribute('aria-busy',String(phase==='loading'));
  $('focus-count').textContent=ready?all.length+' active '+(all.length===1?'task':'tasks'):'Active work';
  const state=!window.OpsCloud.user?'Sign in with your Oaktown staff account to open your active work.':phase==='error'?'Tasks could not be loaded. Refresh tasks to retry.':!ready?'Loading your active tasks…':!all.length?'No active tasks. Your completed and archived work is available in the full workspace.':'';
  $('focus-state').textContent=state;$('focus-state').hidden=!state;
  if(!ready){$('focus-position').textContent='';if(!window.OpsCloud.user||phase==='error')selectedId=null;return}
  if(!all.length){selectedId=null;$('focus-position').textContent='';return}
  let at=all.findIndex(t=>t.id===selectedId);if(at<0)at=0;selectedId=all[at].id;
  for(let i=Math.max(0,at-2);i<=Math.min(all.length-1,at+2);i++)track.append(card(all[i],i,all.length,i-at));
  $('focus-prev').disabled=at===0;$('focus-next').disabled=at===all.length-1;
  $('focus-position').textContent=(at+1)+' / '+all.length+' · '+(all[at].task_code||'Task')+' · '+(all[at].task_title||'Untitled task');
  $('focus-progress-fill').style.width=((at+1)/all.length*100)+'%';
 }
 function choose(where){
  if(!active||store.getState()!=='ready')return;
  const all=rows();if(!all.length)return;
  const at=Math.max(0,all.findIndex(t=>t.id===selectedId));
  const next=where==='first'?0:where==='last'?all.length-1:Math.max(0,Math.min(all.length-1,at+where));
  if(at===next)return;selectedId=all[next].id;render();
 }
 function route(){
  const next=window.OpsWorkspace.getRoute(),on=next.workflow==='focus';
  if(!on){previousRoute={workflow:next.workflow,tab:next.tab};if(active){searchHome.after(search);search.textContent=searchText;exit.hidden=true;document.body.classList.remove('focus-board-mode');active=false;pointer=null;$('workspace-title').focus({preventScroll:true});}return}
  if(active)return;
  active=true;reference=T.today();document.body.classList.add('focus-board-mode');exit.hidden=false;topbar.insertBefore(search,$('workspace-appearance-open'));search.textContent='Search';
  render();if(window.OpsCloud.user)store.refresh();
  (deck.hidden?$('focus-heading'):deck).focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
 }
 exit.onclick=()=>window.OpsWorkspace.navigate(previousRoute.workflow,previousRoute.tab);
 $('focus-signin').onclick=()=>$('account-button').click();
 $('focus-refresh').onclick=()=>{reference=T.today();store.refresh()};
 $('focus-prev').onclick=()=>choose(-1);$('focus-next').onclick=()=>choose(1);
 document.addEventListener('keydown',event=>{
  if(!active||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||document.querySelector('dialog[open]')||event.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  const moves={ArrowLeft:-1,ArrowRight:1,Home:'first',End:'last'};if(!Object.hasOwn(moves,event.key))return;event.preventDefault();choose(moves[event.key]);
 });
 deck.addEventListener('click',event=>{
  if(suppressClick){suppressClick=false;return}
  const item=event.target.closest('.focus-card');if(item&&Number(item.dataset.offset))choose(Number(item.dataset.offset));
 });
 deck.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY};suppressClick=false;
 });
 deck.addEventListener('pointermove',event=>{if(pointer?.id===event.pointerId&&Math.abs(event.clientX-pointer.x)>10&&Math.abs(event.clientX-pointer.x)>Math.abs(event.clientY-pointer.y)*1.4)deck.setPointerCapture(event.pointerId)});
 deck.addEventListener('pointerup',event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if(Math.abs(dx)>=56&&Math.abs(dx)>Math.abs(dy)*1.4){suppressClick=true;choose(dx<0?1:-1);}
 });
 deck.addEventListener('pointercancel',()=>{pointer=null});
 window.addEventListener('ops-workspace-change',route);
 window.addEventListener('ops-today-state',render);
 window.addEventListener('ops-auth-change',()=>{selectedId=null;render();if(active&&window.OpsCloud.user)store.refresh()});
 // Reclassify Eastern day boundaries only in the view. There is no background write.
 setInterval(()=>{if(active&&!document.hidden&&reference!==T.today()){reference=T.today();render()}},60000);
 document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden){reference=T.today();render()}});
 route();
})();
