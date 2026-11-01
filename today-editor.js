/* Reviewed task edits for Oaktown Today: no lease mutations or automatic reminders. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsTodayModel,$=id=>document.getElementById(id);
if(!cloud||!M||!$('today-edit-dialog'))return;
let data=null,selected=null,saving=false,nonce=0;
const input=id=>$(id).value;
const set=(id,value)=>{$(id).value=value??''};
const feedback=text=>{$('today-edit-feedback').textContent=text};
const option=(label,value)=>new Option(label,value);
const byId=(rows,id)=>rows.find(row=>row.id===id)||null;
const ordered=rows=>[...rows].sort((a,b)=>String(a.street_address||a.unit_label||a.oak_record_id||'').localeCompare(String(b.street_address||b.unit_label||b.oak_record_id||'')));
function fillSelect(id,rows,blank,chosen,label){
 const select=$(id);select.replaceChildren(option(blank,''));
 for(const row of rows)select.add(option(label(row),row.id));
 select.value=rows.some(row=>row.id===chosen)?chosen:'';
}
function properties(){
 const search=input('today-edit-property-search').trim().toLowerCase();
 const chosen=input('today-edit-property');
 const list=ordered(data?.properties||[]).filter(p=>!search||p.street_address?.toLowerCase().includes(search)||p.id===chosen);
 fillSelect('today-edit-property',list,'General operations — no property',chosen,p=>[p.street_address,p.city].filter(Boolean).join(' · '));
}
function associations({resetUnit=false,resetLease=false,resetRenewal=false}={}){
 if(!data)return;
 const p=input('today-edit-property');
 if(resetUnit)set('today-edit-unit','');
 const oldUnit=resetUnit?'':input('today-edit-unit');
 fillSelect('today-edit-unit',data.units.filter(u=>u.property_id===p),'Entire property / not linked',oldUnit,
  u=>(u.unit_label||u.unit_code||'Unit')+(u.unit_code&&u.unit_label!==u.unit_code?' · '+u.unit_code:''));
 const u=input('today-edit-unit');
 if(resetLease||resetUnit)set('today-edit-lease','');
 const oldLease=resetLease||resetUnit?'':input('today-edit-lease');
 fillSelect('today-edit-lease',data.leases.filter(l=>u&&l.unit_id===u),'No specific lease',oldLease,
  l=>[l.lease_label||l.lease_status||'Lease',l.term_start&&l.term_end?l.term_start+' – '+l.term_end:null].filter(Boolean).join(' · '));
 if(resetRenewal||resetUnit)set('today-edit-renewal','');
 const oldRenewal=resetRenewal||resetUnit?'':input('today-edit-renewal');
 fillSelect('today-edit-renewal',data.renewals.filter(r=>{
  if(!p)return false;
  if(r.property_id&&r.property_id!==p)return false;
  if(r.unit_id)return !!u&&r.unit_id===u;
  return !u || r.property_id===p;
 }), 'No specific renewal case',oldRenewal,r=>[r.oak_record_id||'Renewal case',r.recorded_end?'ends '+r.recorded_end:null].filter(Boolean).join(' · '));
 $('today-edit-link-note').textContent=p?
  'Choose only links for the selected property. Saved records will be validated together.':
  'General operations is allowed without a property link.';
}
function open(task){
 if(!data?.canEdit||!cloud.user){feedback('Editor access is required.');return}
 const current=byId(data.tasks,task.id);
 if(!current||current.archived_at){feedback('This task is unavailable. Refresh first.');return}
 selected=current;nonce++;
 const dialog=$('today-edit-dialog');
 set('today-edit-title',current.task_title);
 set('today-edit-status',current.status||'pending');
 set('today-edit-priority',current.priority||'normal');
 set('today-edit-assignee',current.assigned_label||'');
 set('today-edit-action',current.intake_details?.next_action||'');
 set('today-edit-notes',current.notes||'');
 set('today-edit-due',current.intake_details?.due?.date|| (current.due_at?M.scheduled({due_at:current.due_at})?.date:'')||'');
 set('today-edit-followup',current.intake_details?.follow_up?.date||'');
 const unit=byId(data.units,current.unit_id);
 set('today-edit-property-search','');
 properties();
 set('today-edit-property',current.property_id||unit?.property_id||'');
 associations();
 set('today-edit-unit',current.unit_id||'');associations();
 set('today-edit-lease',current.lease_id||'');
 set('today-edit-renewal',current.renewal_case_id||'');
 associations();
 feedback('');
 if(!dialog.open)dialog.showModal();
 $('today-edit-title').focus();
}
function close(){
 if(saving)return;
 const d=$('today-edit-dialog');if(d.open)d.close();
 selected=null;feedback('');
}
$('today-edit-property-search').addEventListener('input',properties);
$('today-edit-property').addEventListener('change',()=>associations({resetUnit:true,resetLease:true,resetRenewal:true}));
$('today-edit-unit').addEventListener('change',()=>associations({resetLease:true,resetRenewal:true}));
$('today-edit-close').addEventListener('click',close);
$('today-edit-cancel').addEventListener('click',close);
$('today-edit-dialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();else selected=null});
window.addEventListener('ops-today-edit',event=>open(event.detail?.task||{}));
window.addEventListener('ops-today-data',event=>{
 data=event.detail||null;
 if(!data||!data.canEdit||!cloud.user){const d=$('today-edit-dialog');if(d.open)d.close();selected=null;nonce++;}
});
window.addEventListener('ops-auth-change',event=>{if(!event.detail?.user){const d=$('today-edit-dialog');if(d.open)d.close();selected=null;data=null;nonce++;}});
$('today-edit-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(saving||!selected||!data?.canEdit||!cloud.user)return;
 if(!input('today-edit-title').trim()){feedback('Task title is required.');return}
 const task=selected,version=task.updated_at,ticket=nonce;
 if(!version){feedback('Task version missing. Refresh the dashboard first.');return}
 const changes={
  task_title:input('today-edit-title').trim(),
  property_id:input('today-edit-property')||null,
  unit_id:input('today-edit-unit')||null,
  lease_id:input('today-edit-lease')||null,
  renewal_case_id:input('today-edit-renewal')||null,
  status:input('today-edit-status'),
  priority:input('today-edit-priority'),
  assigned_label:input('today-edit-assignee').trim()||null,
  due_date:input('today-edit-due')||null,
  follow_up_date:input('today-edit-followup')||null,
  next_action:input('today-edit-action').trim()||null,
  notes:input('today-edit-notes').trim()||null
 };
 const unit=byId(data.units,changes.unit_id);
 const lease=byId(data.leases,changes.lease_id);
 const renewal=byId(data.renewals,changes.renewal_case_id);
 if(unit&&unit.property_id!==changes.property_id||
    lease&&lease.unit_id!==changes.unit_id||
    renewal&&((renewal.unit_id&&renewal.unit_id!==changes.unit_id)||(renewal.property_id&&renewal.property_id!==changes.property_id)||
    (renewal.lease_id&&changes.lease_id&&renewal.lease_id!==changes.lease_id))){
  feedback('Your property, unit, lease and renewal must match. Review the links.');return;
 }
 saving=true;$('today-edit-save').disabled=true;feedback('Saving reviewed task…');
 try{
  const result=await cloud.api('/rest/v1/rpc/ops_task_update_v1',{
   method:'POST',body:JSON.stringify({p_task:task.id,p_expected_updated_at:version,p_changes:changes})
  });
  if(ticket!==nonce||!cloud.user)return;
  if(!result||result.task_id!==task.id||!result.updated_at)throw Error('Server did not confirm an updated task. Refresh before trying again.');
  feedback('Saved successfully. Refreshing task list…');
  const d=$('today-edit-dialog');if(d.open)d.close();
  selected=null;
  window.dispatchEvent(new Event('ops-today-refresh'));
 }catch(error){
  if(ticket===nonce){
   feedback('Not saved: '+(error.message||'Request failed')+'. Refresh to load the latest saved version.');
  }
 }finally{saving=false;$('today-edit-save').disabled=false;}
});
})();