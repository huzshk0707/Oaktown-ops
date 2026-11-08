/* Reviewed Master Backlog import. All data stays in memory; no automatic writes. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsBacklogImportModel;
if(!cloud||!M||!$('backlog-import-form'))return;
let manifest=null,preview=null,busy=false,epoch=0;
const status=x=>{$('backlog-import-status').textContent=x};
const elem=(tag,val,cls)=>{const n=document.createElement(tag);if(val!=null)n.textContent=String(val);if(cls)n.className=cls;return n};
const editor=()=>!!cloud.user&&!!window.OpsToday?.getData()?.canEdit;
function controls(){
 $('backlog-import-preview').disabled=busy||!editor()||!manifest;
 $('backlog-import-save').disabled=busy||!editor()||!preview||!$('backlog-import-reviewed').checked||
   $('backlog-import-confirmation').value!=='IMPORT '+manifest?.batch_ref;
}
function reset(){
 epoch++;busy=false;manifest=null;preview=null;
 $('backlog-import-input').value='';$('backlog-import-reviewed').checked=false;
 $('backlog-import-confirmation').value='';
 $('backlog-import-summary').replaceChildren();status('No manifest previewed. No changes have been made.');
 controls();
}
function revokePreview(){preview=null;$('backlog-import-reviewed').checked=false;$('backlog-import-confirmation').value='';$('backlog-import-summary').replaceChildren();controls()}
function renderSummary(){
 const box=$('backlog-import-summary');box.replaceChildren();
 if(!manifest||!preview)return;
 const s=M.summarize(manifest);
 box.append(elem('p','Reviewed '+preview.rows+' rows · '+preview.to_create+' to create · '+preview.already_imported+' already imported · '+s.completed+' completed · '+s.verification+' require verification · '+s.parentLinks+' child links'));
 const table=elem('table',null,'backlog-import-table');
 const header=document.createElement('tr');
 for(const label of ['Code','Task','Status','Level','Parent'])header.append(elem('th',label));
 table.append(header);
 for(const row of manifest.entries){
  const tr=document.createElement('tr');
  for(const val of [row.task_code,row.task_title,row.status,row.work_level,row.parent_code||'—'])tr.append(elem('td',val));
  table.append(tr);
 }
 box.append(table);
}
async function request(mode,token,reviewed){
 return cloud.api('/rest/v1/rpc/ops_master_backlog_import',{
  method:'POST',body:JSON.stringify({p_mode:mode,p_manifest:manifest,p_preview_token:token||null,p_reviewed:!!reviewed})
 });
}
$('backlog-import-input').addEventListener('input',()=>{
 revokePreview();
 try{
  manifest=M.parse($('backlog-import-input').value);
  status('Manifest locally validated. Click Preview to compare with Supabase; nothing is saved yet.');
 }catch(e){manifest=null;status(e.message);}
 controls();
});
$('backlog-import-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!manifest||!editor())return;
 const ticket=epoch,account=cloud.user.id,approvedManifest=manifest;
 busy=true;controls();status('Comparing the reviewed manifest with Supabase…');
 try{
  const result=await request('preview');
  if(ticket!==epoch||cloud.user?.id!==account||manifest!==approvedManifest)return;
  if(result?.schema_version!=='oaktown.master-backlog-preview.v1'||!result.preview_token||
     result.rows!==manifest.entries.length)throw Error('Server preview was incomplete');
  preview=result;renderSummary();
  status('Preview ready. Check every row, then explicitly approve the save. No changes have been made.');
 }catch(e){
  if(ticket===epoch){revokePreview();status('Preview unavailable: '+(e.message||'Connection error')+
   '. Confirm the reviewed database migration has been deployed. No import was performed.');}
 }finally{if(ticket===epoch){busy=false;controls()}}
});
$('backlog-import-reviewed').addEventListener('change',controls);
$('backlog-import-confirmation').addEventListener('input',controls);
$('backlog-import-save').addEventListener('click',async()=>{
 if(busy||!editor()||!manifest||!preview||!$('backlog-import-reviewed').checked||
   $('backlog-import-confirmation').value!=='IMPORT '+manifest.batch_ref)return;
 const ticket=epoch,account=cloud.user.id,payload=manifest,token=preview.preview_token;
 busy=true;controls();status('Saving the approved batch once. Do not retry until the result is verified…');
 try{
  const receipt=await request('save',token,true);
  if(ticket!==epoch||cloud.user?.id!==account||payload!==manifest)return;
  if(receipt?.schema_version!=='oaktown.master-backlog-receipt.v1'||
     receipt.batch_ref!==manifest.batch_ref||!Array.isArray(receipt.rows)||
     receipt.rows.length!==manifest.entries.length)throw Error('Server receipt not confirmed');
  const codes=manifest.entries.map(r=>r.task_code);
  const saved=await cloud.api('/rest/v1/ops_tasks?select=id,task_code,status,parent_task_id&task_code=in.('+codes.join(',')+')&limit=1000');
  if(ticket!==epoch||cloud.user?.id!==account)return;
  if(!Array.isArray(saved)||saved.length!==codes.length)throw Error('Import may have saved, but record read-back did not match');
  const byCode=new Map(saved.map(t=>[t.task_code,t]));
  if(manifest.entries.some(r=>!byCode.has(r.task_code)||
    byCode.get(r.task_code).status!==r.status||
    (r.parent_code?byCode.get(r.task_code).parent_task_id!==byCode.get(r.parent_code)?.id:byCode.get(r.task_code).parent_task_id!==null)))
     throw Error('Imported task status or parent links failed verification');
  status('Verified '+saved.length+' task records after save. Receipt batch: '+receipt.batch_ref+
    (receipt.replayed?' (already imported; no new writes)':'')+'. Refresh Today to review them.');
  preview=null;$('backlog-import-reviewed').checked=false;$('backlog-import-confirmation').value='';
  window.dispatchEvent(new Event('ops-today-refresh'));
 }catch(e){
  if(ticket===epoch){preview=null;status('Save not verified: '+(e.message||'Connection error')+
    '. The request may have succeeded. Re-preview and check saved records before retrying.');}
 }finally{if(ticket===epoch){busy=false;controls()}}
});
window.addEventListener('ops-today-data',event=>{
 if(!event.detail||!cloud.user){reset();return}controls();
});
window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user)reset();else controls()});
controls();
})();