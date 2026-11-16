/* Plan transport uses the shared staff session. Never falls back to raw journal writes. */
(()=>{'use strict';
 const cloud=window.OpsCloud,W=window.OpsReviewedWrite,M=window.OpsMorningModel;
 const uuid=v=>typeof v==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
 async function call(action,payload={}){
  try{return await W.withTimeout(signal=>cloud.api('/rest/v1/rpc/ops_morning_plan',{method:'POST',body:JSON.stringify({action,payload}),signal}))}
  catch(error){if(error.status===404||error.code==='PGRST202')error.message='Server-reviewed plans are not enabled yet. The Phase 6 backend must be reviewed and installed first.';throw error}
 }
 function cleanPlan(plan){const value=JSON.parse(JSON.stringify(plan));delete value.dirty;return value}
 function validReview(r,original=null){const e=r?.event,p=e?.event_metadata?.plan;return r?.schema_version==='oaktown.plan-review.v1'&&uuid(r.proposal_id)&&uuid(r.review_token)&&r.confirmation==='APPROVE '+r.proposal_id&&/^[\da-f]{64}$/.test(r.content_hash)&&Number.isFinite(Date.parse(r.expires_at))&&uuid(e?.id)&&e.entity_type==='morning_plan'&&e.event_type==='morning_plan_approved_v1'&&e.event_metadata?.approval_contract==='oaktown.sod-review.v1'&&e.event_metadata.review_request_id===r.proposal_id&&p?.planId===e.entity_id&&(!original||M.canonical(p)===M.canonical(cleanPlan(original)))}
 function verified(review,row,user){return M.attested(row)&&row.actor_id===user&&row.review_proof.request_id===review.proposal_id&&row.review_proof.content_hash===review.content_hash&&M.verified(review.event,[row],user)}
 function receiptMatches(review,response,user){return verified(review,response?.event,user)&&response.receipt?.schema_version==='oaktown.plan-approval-receipt.v1'&&response.receipt.proposal_id===review.proposal_id&&response.receipt.event_id===response.event.id&&response.receipt.reviewer_id===user&&response.receipt.content_hash===review.content_hash}
 window.OpsPlanApi=Object.freeze({call,cleanPlan,validReview,verified,receiptMatches,approvalPayload(review){return {proposal_id:review.proposal_id,review_token:review.review_token,reviewed:true,confirmation:review.confirmation}}});
})();
