/* Reviewed task edits for Oaktown Today: no lease mutations or automatic reminders. */
(()=>{'use strict';
const cloud=window.OpsCloud,M=window.OpsTodayModel,W=window.OpsReviewedWrite,V=window.OpsTaskEditModel,$=id=>document.getElementById(id);
if(!cloud||!M||!W||!V||!$('today-edit-dialog'))return;
const flow=W.create(),dialog=$('today-edit-dialog'),form=$('today-edit-form');
const request=(path,options={})=>W.withTimeout(signal=>cloud.api(path,{...options,signal}));
let data=null,selected=null,owner=cloud.user?.id||null;
const reload=document.createElement('button');reload.type='button';reload.id='today-edit-reload';reload.className='button';reload.textContent='Reload saved version';reload.hidden=true;$('today-edit-save').after(reload);
function controls(){
 dialog.dataset.workflowState=flow.phase;
 form.setAttribute('aria-busy',String(flow.busy));
 for(const field of form.querySelectorAll('input,select,textarea'))field.disabled=flow.busy;
 $('today-edit-save').disabled=!flow.can('submit')||!selected||!data?.canEdit||!cloud.user;
 $('today-edit-cancel').disabled=flow.busy;$('today-edit-close').disabled=flow.busy;
 reload.hidden=!['needs_review','refreshing'].includes(flow.phase);reload.disabled=!flow.can('reload')||!cloud.user;
}
function reset(){
 flow.reset();selected=null;form.reset();
 for(const id of ['today-edit-property','today-edit-unit','today-edit-lease','today-edit-renewal'])$(id).replaceChildren();
 feedback('');clearRelated();controls();
}
const current=(ticket,account)=>flow.current(ticket)&&cloud.user?.id===account;

const input=id=>$(id).value;
const set=(id,value)=>{$(id).value=value??''};
const feedback=text=>{$('today-edit-feedback').textContent=text};
const option=(label,value)=>new Option(label,value);
const byId=(rows,id)=>rows.find(row=>row.id===id)||null;
const ordered=rows=>[...rows].sort((a,b)=>String(a.street_address||a.unit_label||a.oak_record_id||'').localeCompare(String(b.street_address||b.unit_label||b.oak_record_id||'')));
function clearRelated(){
 $('today-related-links').replaceChildren();
 $('today-related-notes').textContent='';
}
function renderRelated(task){
 clearRelated();
 const graph=window.OpsConnectionsModel?.build(data,task.id),host=$('today-related-links');
 if(!graph){$('today-related-notes').textContent='Saved record links unavailable. Refresh the dashboard.';return}
 const linked=graph.nodes.filter(node=>node.type!=='task');
 if(!linked.length){
  const empty=document.createElement('p');empty.className='today-muted';empty.textContent='No related records are saved for this task.';host.append(empty);
 }
 for(const node of linked){
  const button=document.createElement('button');button.type='button';button.className='today-related-link';
  const kind=document.createElement('span');kind.className='today-related-kind';kind.textContent=node.type;
  const name=document.createElement('strong');name.textContent=node.label;
  button.setAttribute('aria-label','Open saved '+node.type+': '+node.label);
  button.append(kind,name);
  if(node.detail&&node.detail!==node.type){
   const detail=document.createElement('span');detail.className='today-related-detail';detail.textContent=node.detail;button.append(detail);
  }
  button.addEventListener('click',()=>{
   if(flow.busy||!cloud.user||!data?.canEdit)return;
   const api=window.OpsOperations;
   if(!api?.openSource&&!api?.openProfile){feedback('Connected record view is unavailable.');return}
   close();
   Promise.resolve(api.openSource?api.openSource(node.type,node.id):api.openProfile(node.type,node.id))
    .catch(()=>{$('today-status').textContent='Could not open the saved record. Refresh and retry.'});
  });
  host.append(button);
 }
 if(graph.notes.length)$('today-related-notes').textContent=graph.notes.join(' ');
}
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
function open(task,suggestedStatus){
 if(flow.busy)return;
 if(!data?.canEdit||!cloud.user){feedback('Editor access is required.');return}
 const current=byId(data.tasks,task.id);
 if(!current||current.archived_at){feedback('This task is unavailable. Refresh first.');return}
 flow.reset();flow.open();selected=current;
 const dialog=$('today-edit-dialog');
 set('today-edit-title',current.task_title);
 set('today-edit-status',['completed','waiting','in_progress'].includes(suggestedStatus)?suggestedStatus:(current.status||'pending'));
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
 renderRelated(current);
 feedback(suggestedStatus?'Suggested status: '+suggestedStatus+'. Review details and click Save to confirm; no change has been made yet.':'');
 controls();
 if(!dialog.open)dialog.showModal();
 $('today-edit-title').focus();
}
function close(){
 if(flow.busy)return;
 if(dialog.open)dialog.close();reset();
}
$('today-edit-property-search').addEventListener('input',properties);
$('today-edit-property').addEventListener('change',()=>associations({resetUnit:true,resetLease:true,resetRenewal:true}));
$('today-edit-unit').addEventListener('change',()=>associations({resetLease:true,resetRenewal:true}));
$('today-edit-close').addEventListener('click',close);
$('today-edit-cancel').addEventListener('click',close);
dialog.addEventListener('cancel',event=>{if(flow.busy)event.preventDefault()});
dialog.addEventListener('close',()=>{if(!dialog.open)reset()});
window.addEventListener('ops-today-edit',event=>open(event.detail?.task||{},event.detail?.suggestedStatus));
window.addEventListener('ops-today-data',event=>{
 data=event.detail||null;
 if(!data||!data.canEdit||!cloud.user){if(dialog.open)dialog.close();reset()}
});
window.addEventListener('ops-auth-change',event=>{
 const next=event.detail?.user?.id||null;
 if(next!==owner||!next){if(dialog.open)dialog.close();data=null;reset()}
 owner=next;
});
reload.addEventListener('click',async()=>{
 if(!selected||!cloud.user)return;
 const id=selected.id,account=cloud.user.id,ticket=flow.start('reload');if(!ticket)return;
 controls();feedback('Loading the saved version. Your draft will be replaced after it is verified.');
 try{
  const [rows,memberships]=await Promise.all([
   request('/rest/v1/ops_tasks?id=eq.'+encodeURIComponent(id)+'&select=id,updated_at,task_title,status,priority,assigned_label,property_id,unit_id,lease_id,renewal_case_id,notes,intake_details,due_at,archived_at&limit=1'),
   request('/rest/v1/staff_memberships?select=user_id,role,is_active&user_id=eq.'+encodeURIComponent(account)+'&limit=1')
  ]);
  if(!current(ticket,account))return;
  const allowed=Array.isArray(memberships)&&memberships.length===1&&memberships[0].user_id===account&&memberships[0].is_active&&['admin','editor'].includes(memberships[0].role);
  const task=Array.isArray(rows)&&rows.length===1&&rows[0]?.id===id?rows[0]:null;
  if(!allowed||!task||task.archived_at)throw Object.assign(Error('Saved task or editor access is unavailable'),{status:403});
  if(!W.sameVersion(task.updated_at,task.updated_at))throw Error('Task version was incomplete.');
  data={...data,canEdit:true,tasks:data.tasks.map(row=>row.id===id?{...row,...task}:row)};
  flow.advance(ticket,'loaded');open(task);
  feedback('Saved version loaded. Review your changes before saving again.');
 }catch(error){
  if(!current(ticket,account))return;
  if([401,403].includes(error.status)){
   dialog.close();data=null;reset();window.dispatchEvent(new Event('ops-today-refresh'));return;
  }
  flow.advance(ticket,'failed');controls();feedback('Saved version unavailable. Your draft is kept; reload the saved version before retrying.');
 }
});
$('today-edit-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(!flow.can('submit')||!selected||!data?.canEdit||!cloud.user)return;
 if(!input('today-edit-title').trim()){feedback('Task title is required.');return}
 const task=selected,version=task.updated_at,account=cloud.user.id;
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
 const ticket=flow.start('submit');if(!ticket)return;
 flow.advance(ticket,'approved');controls();feedback('Saving reviewed task…');
 try{
  const result=await request('/rest/v1/rpc/ops_task_update_v1',{
   method:'POST',body:JSON.stringify({p_task:task.id,p_expected_updated_at:version,p_changes:changes})
  });
  if(!current(ticket,account))return;
  if(result?.task_id!==task.id||!result.updated_at)throw Error('Server receipt was incomplete.');
  flow.advance(ticket,'received');controls();feedback('Checking the saved task…');
  const rows=await request('/rest/v1/ops_tasks?id=eq.'+encodeURIComponent(task.id)+'&select=id,updated_at,task_title,status,priority,assigned_label,property_id,unit_id,lease_id,renewal_case_id,notes,intake_details,archived_at&limit=1');
  if(!current(ticket,account))return;
  if(!V.verified(task.id,result,rows,changes))throw Error('The saved version did not match your reviewed change.');
  flow.advance(ticket,'verified');controls();
  dialog.close();reset();
  window.dispatchEvent(new Event('ops-today-refresh'));
 }catch(error){
  if(!current(ticket,account))return;
  flow.advance(ticket,'failed');controls();
  feedback('Save not verified: '+(error.message||'Request failed')+'. The change may already have saved. Copy any unsaved text, then reload the saved version before trying again.');
  reload.focus();
 }
});

if(cloud.user)data=window.OpsToday?.getData()||null;
controls();
})();
