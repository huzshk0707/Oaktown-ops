/* Reviewable archive/history inside Today. Version checked restore only; no deletion. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud;
if(!cloud||!$('today-history'))return;
let data=null,restoring=false,epoch=0;
const make=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=String(value);if(cls)n.className=cls;return n};
const status=text=>{$('today-history-status').textContent=text};
function applySearch(){
 for(const box of ['today-archived','today-completed'])
  for(const row of $(box).children)if(row.dataset.taskTitle)row.hidden=!row.dataset.taskTitle.includes($('today-history-search').value.trim().toLowerCase());
}
function clear(){
 epoch++;data=null;restoring=false;
 $('today-archived').replaceChildren();$('today-archived-count').textContent='';
 $('today-history-search').value='';status('');
}
async function restore(t){
 if(restoring||!data?.canEdit||!cloud.user||!t.updated_at||!t.archived_at)return;
 const id=cloud.user.id,ticket=epoch;
 if(!confirm('Restore "'+(t.task_title||'Untitled task')+'" from the archive? Its saved status and activity history will be preserved.'))return;
 restoring=true;status('Restoring the selected archived task…');
 try{
  const receipt=await cloud.api('/rest/v1/rpc/ops_task_set_archived',{
   method:'POST',body:JSON.stringify({p_task:t.id,p_expected_updated_at:t.updated_at,p_archived:false})
  });
  if(ticket!==epoch||cloud.user?.id!==id)return;
  if(receipt?.task_id!==t.id||receipt.archived_at!==null||!receipt.updated_at)
   throw Error('The server did not confirm the restore. Refresh before retrying');
  await window.OpsToday?.refresh();
  if(ticket!==epoch||cloud.user?.id!==id)return;
  const saved=window.OpsToday?.getData()?.tasks?.find(row=>row.id===t.id);
  if(!saved||saved.archived_at)throw Error('Restore may have saved, but the latest task state is not verified');
  status('Restored from archive and verified. The saved status and activity history were preserved.');
  window.dispatchEvent(new Event('ops-task-archive-change'));
 }catch(error){
  if(ticket===epoch)status('Restore not verified: '+(error.message||'Request failed')+'. Refresh saved records before retrying.');
 }finally{if(ticket===epoch){restoring=false;render()}}
}
function render(){
 const host=$('today-archived');host.replaceChildren();
 if(!data||!cloud.user){$('today-archived-count').textContent='';return}
 const all=data.tasks.filter(t=>!!t.archived_at).sort((a,b)=>String(b.archived_at).localeCompare(String(a.archived_at))||String(a.task_title||'').localeCompare(String(b.task_title||'')));
 $('today-archived-count').textContent='('+all.length+')';
 for(const t of all){
  const row=make('article',null,'today-archive-row');row.dataset.taskTitle=((t.task_code||'')+' '+(t.task_title||'Untitled task')).toLowerCase();
  const body=make('div');body.append(make('strong',t.task_title||'Untitled task'),make('p','Archived · '+String(t.status||'pending')));
  const actions=make('div',null,'today-archive-actions');
  const view=make('button','View history','button');view.type='button';view.addEventListener('click',()=>window.OpsOperations?.openProfile('task',t.id));
  actions.append(view);
  if(data.canEdit){const b=make('button','Restore','button');b.type='button';b.disabled=restoring||!t.updated_at;
   b.addEventListener('click',()=>restore(t));actions.append(b)}
  row.append(body,actions);host.append(row);
 }
 if(!all.length)host.append(make('p','No archived tasks recorded.','today-muted'));
 applySearch();
}
$('today-history-search').addEventListener('input',applySearch);
function receive(next){if(!next||!cloud.user){clear();return}data=next;render()}
window.addEventListener('ops-today-data',event=>receive(event.detail));
window.addEventListener('ops-today-rendered',applySearch);
window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user)clear()});
clear();
if(window.OpsToday?.getData())receive(window.OpsToday.getData());
})();
