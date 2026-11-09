/* Staff-only reminders. Recording a confirmation never sends or pays anything. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsBillRemindersModel,T=window.OpsTodayModel;
 if(!cloud||!M||!T||!$('bill-reminders'))return;
 const node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n};
 const button=(label,fn)=>{const b=node('button',label,'button');b.type='button';b.onclick=fn;return b};
 const status=s=>{$('bill-status').textContent=s};
 let data=null,busy=false,generation=0,owner=null,selected=null,needsRefresh=false,workDate=T.today();
 function controls(){
  $('bill-signin').hidden=!!cloud.user;$('bill-refresh').disabled=busy||!cloud.user;$('bill-calendar').disabled=busy||!cloud.user||!data?.rules.some(r=>r.active);
  $('bill-save').disabled=busy||needsRefresh||!cloud.user||!selected;$('bill-action').disabled=busy;$('bill-note').disabled=busy;
  $('bill-reminders').querySelectorAll('[data-bill-action]').forEach(b=>b.disabled=busy||!cloud.user);
 }
 function clear(){generation++;data=null;busy=false;selected=null;needsRefresh=false;owner=cloud.user?.id||null;
  $('bill-attention').replaceChildren();$('bill-month-list').replaceChildren();$('bill-count').textContent='';$('bill-month-summary').textContent='This month’s schedule';
  $('bill-note').value='';$('bill-copy-text').value='';$('bill-copy-text').hidden=true;$('bill-dialog-title').textContent='Update reminder';$('bill-dialog-status').textContent='';if($('bill-dialog').open)$('bill-dialog').close();
  status(cloud.user?'Loading monthly reminders…':'Sign in to view private monthly reminders.');controls();
 }
 function row(item){
  const article=node('article',null,'bill-item');article.dataset.phase=item.phase;
  const info=node('div',null,'bill-item-info'),heading=node('h4',item.rule.label),meta=node('p',M.range(item)+' · '+M.periodLabel(item.period),'bill-meta');
  const badge=node('span',item.verified?'Confirmed':item.phase==='check'?'Confirmation needed':item.phase==='window'?'Reminder window':'Coming up','bill-badge');
  meta.append(' ',badge);info.append(heading,meta,node('p',item.rule.instructions,'bill-instructions'));
  if(item.state?.reminded_at)info.append(node('p','Reminder recorded · '+T.today(new Date(item.state.reminded_at)),'bill-meta'));
  if(item.verified)info.append(node('p',item.state.note,'bill-meta'));
  const actions=node('div',null,'bill-actions');
  if(!item.verified){
   const copy=button('Copy reminder',async()=>{
    const account=cloud.user?.id,ticket=generation;if(!account||owner!==account)return;
    try{await navigator.clipboard.writeText(M.message(item));if(ticket===generation&&cloud.user?.id===account)status('Reminder copied. Send it yourself, then record that it was sent.');}
    catch{if(ticket===generation&&cloud.user?.id===account){$('bill-copy-text').value=M.message(item);$('bill-copy-text').hidden=false;$('bill-copy-text').focus();$('bill-copy-text').select();status('Reminder selected for manual copying.');}}
   });copy.dataset.billAction='copy';
   const sod=button('Add to SOD',()=>{if(cloud.user?.id!==owner)return;if(window.OpsSod?.addPriority(M.priority(item)))status('Added to your morning plan. Review and generate the SOD email.');else status('Refresh Today to load your morning plan, then try again.');});sod.dataset.billAction='sod';actions.append(copy,sod);
  }
  if(data.can_edit){const update=button(item.verified?'Reopen':'Record update',()=>open(item));update.dataset.billAction='update';actions.append(update)}
  article.append(info,actions);return article;
 }
 function render(){
  $('bill-attention').replaceChildren();$('bill-month-list').replaceChildren();if(!data){$('bill-count').textContent='';$('bill-month-summary').textContent='This month’s schedule';controls();return}
  const view=M.project(data);workDate=view.today;$('bill-count').textContent=view.attention.length?view.attention.length+' need attention':'No reminders need attention';
  if(!data.rules.some(r=>r.active))$('bill-attention').append(node('p','No monthly reminders are configured.','bill-meta'));
  else if(!view.attention.length)$('bill-attention').append(node('p','You’re clear for now. The monthly schedule shows what is next.','bill-meta'));
  for(const item of view.attention)$('bill-attention').append(row(item));
  $('bill-month-summary').textContent=M.periodLabel(view.current)+' · '+view.schedule.filter(i=>i.verified).length+' of '+view.schedule.length+' confirmed';
  for(const item of view.schedule)$('bill-month-list').append(row(item));controls();
 }
 const snapshot=()=>cloud.api('/rest/v1/rpc/ops_bill_reminders');
 async function refresh(){
  if(!cloud.user){clear();return}if(busy)return;
  const account=cloud.user.id,ticket=++generation;busy=true;data=null;$('bill-copy-text').value='';$('bill-copy-text').hidden=true;render();status('Loading monthly reminders…');controls();
  try{const next=M.validate(await snapshot());if(ticket!==generation||cloud.user?.id!==account)return;data=next;owner=account;needsRefresh=false;render();status('Reminders are up to date · Eastern dates.');}
  catch{if(ticket!==generation)return;data=null;render();status('Could not load monthly reminders. Refresh to try again; no confirmation is assumed.');}
  finally{if(ticket===generation){busy=false;controls()}}
 }
 function noteRequirement(){const required=$('bill-action').value!=='reminded';$('bill-note').required=required;$('bill-note').minLength=required?5:0;$('bill-note-label').textContent=required?'How was this confirmed? · required':'Reminder note · optional';}
 function open(item){
  if(busy||!cloud.user||cloud.user.id!==owner||!data?.can_edit)return;
  selected=item;needsRefresh=false;$('bill-dialog-title').textContent=item.rule.label+' · '+M.periodLabel(item.period);
  const actions=item.verified?[['reopened','Reopen for follow-up']]:[['reminded','Reminder sent to '+item.rule.recipient],['verified',item.rule.kind==='autopay_check'?'Autopay payment verified':'Payment confirmed']];
  $('bill-action').replaceChildren(...actions.map(([value,label])=>new Option(label,value)));$('bill-note').value='';$('bill-dialog-status').textContent='';noteRequirement();controls();$('bill-dialog').showModal();$('bill-action').focus();
 }
 $('bill-form').onsubmit=async event=>{
  event.preventDefault();if(busy||needsRefresh||!selected||!data?.can_edit||cloud.user?.id!==owner)return;
  const request={p_rule:selected.rule.id,p_period:selected.period,p_action:$('bill-action').value,p_expected_revision:selected.revision,p_note:$('bill-note').value.trim()||null};
  if(request.p_action!=='reminded'&&(!request.p_note||request.p_note.length<5)){ $('bill-dialog-status').textContent='Add a short confirmation or reopening note.';return}
  const ticket=++generation,account=owner;busy=true;controls();$('bill-dialog-status').textContent='Saving and checking the shared record…';
  try{
   const receipt=await cloud.api('/rest/v1/rpc/ops_bill_reminder_record',{method:'POST',body:JSON.stringify(request)});
   if(ticket!==generation||cloud.user?.id!==account)return;
   const next=await snapshot();if(ticket!==generation||cloud.user?.id!==account)return;
   if(!M.matches(receipt,next,request))throw Error('Readback mismatch');
   data=next;selected=null;$('bill-note').value='';$('bill-dialog').close();render();status('Update saved and verified. Other months are unchanged.');
  }catch{if(ticket===generation){needsRefresh=true;data=null;render();$('bill-dialog-status').textContent='Save not verified. Close this dialog and refresh to check the latest record before trying again.';status('A reminder update needs verification. Refresh before making another change.');}}
  finally{if(ticket===generation){busy=false;controls()}}
 };
 $('bill-action').onchange=noteRequirement;$('bill-cancel').onclick=()=>{if(!busy)$('bill-dialog').close()};
 $('bill-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 $('bill-dialog').addEventListener('close',()=>{selected=null;$('bill-note').value='';$('bill-dialog-title').textContent='Update reminder';$('bill-dialog-status').textContent=''});
 $('bill-refresh').onclick=refresh;$('bill-signin').onclick=()=>$('account-button').click();
 $('bill-calendar').onclick=()=>{
  if(busy||!data||cloud.user?.id!==owner)return;
  const url=URL.createObjectURL(new Blob([M.calendar(data)],{type:'text/calendar;charset=utf-8'})),link=node('a');link.href=url;link.download='Oaktown monthly reminders.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  status('Calendar downloaded. Import it once to enable calendar alerts. Imported events do not sync later changes or confirmations.');
 };
 window.addEventListener('ops-auth-change',()=>{clear();if(cloud.user)refresh()});
 window.addEventListener('ops-today-show',()=>{if(cloud.user)refresh()});
 $('today-refresh').addEventListener('click',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloud.user&&!$('today-workflow').hidden)refresh()});
 setInterval(()=>{if(cloud.user&&!$('today-workflow').hidden&&T.today()!==workDate)refresh()},60000);
 clear();if(cloud.user)refresh();
})();
