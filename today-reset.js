/* Reversible clean start using the existing version-checked archive RPC.
   Explicit review is required; nothing is archived on page load. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsTodayModel,$=id=>document.getElementById(id);
if(!cloud||!M||!$('today-reset-dialog'))return;
let data=null,snapshot=[],running=false,epoch=0;
const dialog=$('today-reset-dialog'),open=$('today-reset-open'),confirm=$('today-reset-confirm'),cancel=$('today-reset-cancel');
function available(){return !!cloud.user&&data?.canEdit&&data.tasks.length<1000&&M.classify(data.tasks).all.length>0}
function controls(){open.disabled=running||!available();confirm.disabled=running||!snapshot.length||!available();cancel.disabled=running;}
function clear(){epoch++;data=null;snapshot=[];running=false;if(dialog.open)dialog.close();$('today-reset-list').replaceChildren();$('today-reset-scope').textContent='';$('today-reset-status').textContent='';controls()}
function close(){if(running)return;if(dialog.open)dialog.close();snapshot=[];controls();open.focus()}
open.addEventListener('click',()=>{
 if(!available()||running)return;
 snapshot=M.classify(data.tasks).all.map(t=>({id:t.id,title:t.task_title||'Untitled task',version:t.updated_at}));
 $('today-reset-list').replaceChildren(...snapshot.map(t=>{const row=document.createElement('li');row.textContent=t.title;return row}));
 $('today-reset-scope').textContent=snapshot.length+' active task'+(snapshot.length===1?'':'s')+' will leave the active lists.';
 $('today-reset-status').textContent='';confirm.textContent='Archive '+snapshot.length+' task'+(snapshot.length===1?'':'s');cancel.textContent='Cancel';
 controls();
 if(snapshot.some(t=>!t.id||!t.version)){confirm.disabled=true;$('today-reset-status').textContent='A task version is missing. Close this window and refresh before clearing.';}
 dialog.showModal();cancel.focus();
});
cancel.addEventListener('click',close);
dialog.addEventListener('cancel',event=>{if(running)event.preventDefault();else{snapshot=[];controls()}});
confirm.addEventListener('click',async()=>{
 if(running||!snapshot.length||!available())return;
 const ticket=epoch,user=cloud.user.id,targets=snapshot.slice();
 if(targets.some(t=>!t.id||!t.version))return;
 running=true;controls();let saved=0;
 try{
  for(const task of targets){
   if(ticket!==epoch||cloud.user?.id!==user)return;
   $('today-reset-status').textContent='Archiving '+(saved+1)+' of '+targets.length+'…';
   const result=await cloud.api('/rest/v1/rpc/ops_task_set_archived',{method:'POST',body:JSON.stringify({p_task:task.id,p_expected_updated_at:task.version,p_archived:true})});
   if(ticket!==epoch||cloud.user?.id!==user)return;
   if(result?.task_id!==task.id||!result.archived_at)throw Error('The response was unclear; an update may already have saved');
   saved++;
  }
  if(ticket!==epoch)return;
  $('today-reset-status').textContent='Archived '+saved+' task'+(saved===1?'':'s')+'. History is kept. Refreshing the active lists.';
 }catch(error){
  if(ticket!==epoch)return;
  $('today-reset-status').textContent='Confirmed '+saved+' of '+targets.length+' archived. Stopped: '+(error.message||'Connection failed')+'. Refresh to check what remains before retrying; the last request may have saved.';
 }finally{
  if(ticket===epoch){
   running=false;snapshot=[];cancel.textContent='Done';controls();cancel.focus();
   window.dispatchEvent(new Event('ops-today-refresh'));
   window.dispatchEvent(new Event('ops-task-archive-change'));
  }
 }
});
window.addEventListener('ops-today-data',event=>{data=event.detail||null;if(!cloud.user||(data&&!data.canEdit))clear();else{if(!data&&!running)snapshot=[];controls()}});
window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user)clear()});
controls();
})();
