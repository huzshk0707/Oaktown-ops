'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../renewal-tracking-rules.js');
const id='00000000-0000-4000-8000-000000000006',actor='00000000-0000-4000-8000-000000000009';
test('sending a lease suggests sent, not signed or completed',()=>{
 assert.equal(R.infer('I just sent a lease to sign').status,'sent_for_signature');
 assert.equal(R.infer('Emailed renewal agreement for signature').status,'sent_for_signature');
 assert.equal(R.infer('waiting for signatures').status,'awaiting_signatures');
 assert.equal(R.infer('one tenant signed, second still needs to sign').status,'partially_signed');
});
test('negation or uncertainty must not advance the tracker',()=>{
 for(const statement of ['Have not sent the lease yet','The lease was not signed','Maybe the tenant signed','We have not completed the lease'])
  assert.equal(R.infer(statement),null,statement);
 assert.equal(R.infer('We need to send the lease').status,'ready_to_send');
 assert.equal(R.infer('Tenant declined renewal').status,'declined');
 assert.equal(R.infer('Follow up with tenant on Thursday').status,'follow_up_needed');
 assert.equal(R.infer('We are preparing the new lease').status,'preparing');
});
test('status history uses latest event and does not mutate import fields',()=>{
 const first={id:'a',entity_type:'renewal_case',entity_id:id,event_type:'renewal_progress_updated',occurred_at:'2026-10-01T00:00:00Z',event_metadata:{status:'preparing',next_action:'Prepare'}};
 const second={id:'b',entity_type:'renewal_case',entity_id:id,event_type:'renewal_progress_updated',occurred_at:'2026-10-02T00:00:00Z',event_metadata:{status:'sent_for_signature',next_action:'Follow up',note:'Waiting on two tenants'}};
 assert.equal(R.latest([first,second],id).id,'b');
 assert.equal(R.snapshot(second).note,'Waiting on two tenants');
 assert.equal(R.eventsFor([{...second,entity_id:actor},first],id).length,1);
});
test('journal payload is limited and links staff user to one specific renewal case',()=>{
 const p=R.eventPayload(id,actor,{status:'sent_for_signature',message:'Sent lease for signing',nextAction:'Follow up',note:'Tenant will check email'},null);
 assert.equal(p.entity_type,'renewal_case');assert.equal(p.entity_id,id);assert.equal(p.actor_id,actor);assert.equal(p.event_metadata.status,'sent_for_signature');
 assert.equal(p.event_metadata.note,'Tenant will check email');assert.equal(p.event_metadata.previous_event_id,null);
 assert.equal(Object.hasOwn(p,'pdf'),false); // no document storage field
 assert.throws(()=>R.eventPayload(id,actor,{status:'unknown',message:'Bad'},null));
 assert.throws(()=>R.eventPayload(id,actor,{status:'signed',message:'x'.repeat(501)},null));
});
