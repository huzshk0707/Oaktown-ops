/* Readback checks for staff-reviewed task edits; no writes or inferred links. */
(function(root,factory){
 'use strict';
 const W=typeof module==='object'&&module.exports?require('./reviewed-write-model.js'):root?.OpsReviewedWrite;
 const api=factory(W);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OpsTaskEditModel=api;
})(typeof window!=='undefined'?window:null,function(W){
 'use strict';
 const fields=Object.freeze(['task_title','status','priority','assigned_label','property_id','unit_id','lease_id','renewal_case_id','notes']);
 function verified(id,receipt,rows,changes){
  if(!id||receipt?.task_id!==id||!Array.isArray(rows)||rows.length!==1)return false;
  const row=rows[0];
  if(row?.id!==id||row.archived_at||!W.sameVersion(receipt.updated_at,row.updated_at))return false;
  if(fields.some(key=>(row[key]??null)!==(changes[key]??null)))return false;
  const details=row.intake_details;
  return (details?.next_action??null)===(changes.next_action??null)&&
   (details?.due?.date??null)===(changes.due_date??null)&&
   (details?.follow_up?.date??null)===(changes.follow_up_date??null);
 }
 return Object.freeze({verified});
});
