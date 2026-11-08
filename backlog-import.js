/* Reviewed Master Backlog import. All data stays in memory; no automatic writes. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cloud=window.OpsCloud,M=window.OpsBacklogImportModel;
if(!cloud||!M||!$('backlog-import-form'))return;
let manifest=null,preview=null,busy=false,epoch=0,owner=cloud.user?.id||null;
const status=x=>{$('backlog-import-status').textContent=x};
const elem=(tag,val,cls)=>{const n=document.createElement(tag);if(val!=null)n.textContent=String(val);if(cls)n.className=cls;return n};
const editor=()=>!!cloud.user&&!!window.OpsToday?.getData()?.canEdit;
function controls(){
 for(const id of ['backlog-import-input','backlog-import-reviewed','backlog-import-confirmation'])$(id).disabled=busy||!editor();
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
 for(const label of ['Code','Task','Status','Level','Parent','Details'])header.append(elem('th',label));
 table.append(header);
 for(const row of manifest.entries){
  const tr=document.createElement('tr');
  for(const val of [row.task_code,row.task_title,row.status,row.work_level,row.parent_code||'—'])tr.append(elem('td',val));
  const td=elem('td'),details=elem('details');details.append(elem('summary','Review fields'));
  for(const key of ['priority','source_ref','needs_verification','next_action','waiting_on','blocked_reason','completion_summary','completed_on','original_status','original_priority'])
   if(row[key]!=null)details.append(elem('p',key.replaceAll('_',' ')+': '+row[key]));
  td.append(details);tr.append(td);
  table.append(tr);
 }
 box.append(table);
}
async function request(mode,payload,token,reviewed){
 return cloud.api('/rest/v1/rpc/ops_master_backlog_import',{
  method:'POST',body:JSON.stringify({p_mode:mode,p_manifest:payload,p_preview_token:token||null,p_reviewed:!!reviewed})
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
 revokePreview();
 busy=true;controls();status('Comparing the reviewed manifest with Supabase…');
 try{
  const result=await request('preview',approvedManifest);
  if(ticket!==epoch||cloud.user?.id!==account||manifest!==approvedManifest)return;
  if(result?.schema_version!=='oaktown.master-backlog-preview.v1'||!result.preview_token||
     result.batch_ref!==approvedManifest.batch_ref||result.rows!==approvedManifest.entries.length||
     !Number.isInteger(result.to_create)||!Number.isInteger(result.already_imported)||
     result.to_create<0||result.already_imported<0||result.to_create+result.already_imported!==result.rows||
     !Array.isArray(result.task_codes)||new Set(result.task_codes).size!==result.rows||
     approvedManifest.entries.some(r=>!result.task_codes.includes(r.task_code)))throw Error('Server preview was incomplete');
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
  const receipt=await request('save',payload,token,true);
  if(ticket!==epoch||cloud.user?.id!==account||payload!==manifest)return;
  if(receipt?.schema_version!=='oaktown.master-backlog-receipt.v1'||
     receipt.batch_ref!==payload.batch_ref||!Array.isArray(receipt.rows)||
     receipt.rows.length!==payload.entries.length)throw Error('Server receipt not confirmed');
  const codes=payload.entries.map(r=>r.task_code);
  const saved=await cloud.api('/rest/v1/ops_tasks?select=id,task_code,status,parent_task_id&task_code=in.('+codes.join(',')+')&limit=1000');
  if(ticket!==epoch||cloud.user?.id!==account||payload!==manifest)return;
  M.verifySaved(payload,receipt,saved);
  status('Verified '+saved.length+' task records after save. Receipt batch: '+receipt.batch_ref+
    (receipt.replayed?' (already imported; no new writes)':'')+'. Refresh Today to review them.');
  preview=null;$('backlog-import-reviewed').checked=false;$('backlog-import-confirmation').value='';
  window.dispatchEvent(new Event('ops-today-refresh'));
 }catch(e){
  if(ticket===epoch){revokePreview();status('Save not verified: '+(e.message||'Connection error')+
    '. The request may have succeeded. Re-preview and check saved records before retrying.');}
 }finally{if(ticket===epoch){busy=false;controls()}}
});
window.addEventListener('ops-today-data',event=>{
 if(!event.detail||!editor()){reset();return}controls();
});
window.addEventListener('ops-auth-change',event=>{
 const next=event.detail?.user?.id||null;
 if(next!==owner||!next){owner=next;reset()}else controls();
});
controls();
})();
