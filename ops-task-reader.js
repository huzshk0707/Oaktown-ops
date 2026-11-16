/* Shared task read contract. No cache, task state, credentials or writes. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsTaskReader=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fields='id,task_code,parent_task_id,task_title,status,priority,due_at,intake_details,assigned_label,assigned_user_id,property_id,unit_id,lease_id,renewal_case_id,notes,workflow_key,updated_at,completed_at,archived_at';
 async function read(api,current=()=>true){
  let select=fields;
  for(;;){
   const rows=[],seen=new Set();let legacy=false;
   for(let after=null;;){
    if(!current())throw Error('Task read superseded');
    let page;
    try{page=await api('/rest/v1/ops_tasks?select='+select+'&order=id.asc&limit=1000'+(after?'&id=gt.'+encodeURIComponent(after):''))}
    catch(error){if(select===fields&&[400,404].includes(error.status)){select=fields.replace('id,task_code,parent_task_id,','id,');legacy=true;break}throw error}
    if(!current())throw Error('Task read superseded');
    if(!Array.isArray(page)||page.some(row=>!row||typeof row.id!=='string'||!row.id))throw Error('Unexpected task records');
    for(const row of page){if(seen.has(row.id)||after!==null&&row.id<=after)throw Error('Task pages changed while loading. Refresh to retry');seen.add(row.id);rows.push(row);after=row.id}
    if(page.length<1000)return rows;
   }
   if(!legacy)return rows;
  }
 }
 return Object.freeze({read});
});
