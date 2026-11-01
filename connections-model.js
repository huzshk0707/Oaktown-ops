/* A bounded view of recorded foreign-key relationships, never text matching. */
(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;if(root)root.OpsConnectionsModel=value;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function build(data,taskId){
  const rows=key=>Array.isArray(data?.[key])?data[key]:[],find=(key,id)=>rows(key).find(r=>r.id===id),task=find('tasks',taskId);
  if(!task||task.archived_at)return {nodes:[],edges:[],notes:['Choose an available task.']};
  const notes=[],nodes=[],edges=[];
  function lookup(type,id){if(!id)return null;const record=find(type,id);if(!record)notes.push('The saved '+type+' reference is unavailable in this snapshot.');return record;}
  const lease=lookup('leases',task.lease_id),renewal=lookup('renewals',task.renewal_case_id);
  const unit=lookup('units',task.unit_id||lease?.unit_id||renewal?.unit_id);
  const property=lookup('properties',task.property_id||unit?.property_id||renewal?.property_id);
  function node(type,record,label,detail){if(record)nodes.push({key:type,id:record.id,label:String(label||type),detail:String(detail||''),type});}
  node('task',task,task.task_title,task.status);
  node('property',property,property?.street_address,'Property');node('unit',unit,unit?.unit_label||unit?.unit_code,'Unit');
  node('lease',lease,lease?.lease_label||'Lease',[lease?.lease_status,lease?.term_start,lease?.term_end].filter(Boolean).join(' · '));
  node('renewal',renewal,renewal?.oak_record_id||'Renewal case','Renewal case');
  function link(from,to,condition){if(condition&&nodes.some(n=>n.key===from)&&nodes.some(n=>n.key===to))edges.push({from,to});}
  link('task','property',task.property_id===property?.id&&!!task.property_id);link('task','unit',task.unit_id===unit?.id&&!!task.unit_id);
  link('task','lease',!!lease&&task.lease_id===lease.id);link('task','renewal',!!renewal&&task.renewal_case_id===renewal.id);
  link('unit','property',!!unit&&unit.property_id===property?.id);link('lease','unit',!!lease&&lease.unit_id===unit?.id);
  link('renewal','property',!!renewal&&renewal.property_id===property?.id);link('renewal','unit',!!renewal&&renewal.unit_id===unit?.id);link('renewal','lease',!!renewal&&renewal.lease_id===lease?.id);
  if(task.unit_id&&unit&&task.property_id&&unit.property_id!==task.property_id)notes.push('The saved property and unit disagree. Review the task links.');
  if(!task.property_id&&!task.unit_id&&!task.lease_id&&!task.renewal_case_id)notes.push('General operations: names in the task summary are not saved property or lease links.');
  return {nodes,edges,notes};
 }
 return {build};
});
