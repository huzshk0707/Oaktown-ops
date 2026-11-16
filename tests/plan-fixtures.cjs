'use strict';
// Fictional server proof for browser/model contract tests, not production authorization.
const {createHash}=require('node:crypto');
function attest(event,request='80000000-0000-4000-8000-000000000001',hash=null){
 event.event_metadata.approval_contract='oaktown.sod-review.v1';event.event_metadata.review_request_id=request;
 event.review_proof={schema_version:'oaktown.sod-review.v1',channel:'native_staff_review',event_id:event.id,request_id:request,reviewer_id:event.actor_id,reviewed_at:event.occurred_at,content_hash:hash||createHash('sha256').update(JSON.stringify(event)).digest('hex')};return event;
}
module.exports={attest};
