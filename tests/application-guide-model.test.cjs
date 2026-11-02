'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPrompt,stages,modes}=require('../application-guide-model.js');
test('application guide gives source-aware next administrative step and human review',()=>{
 const p=buildPrompt({stage:'landlord',property:'Sample St Unit 4',status:'Reference requested yesterday'});
 assert.match(p,/Current Stage/);
 assert.match(p,/Next Action/);
 assert.match(p,/Landlord reference and ownership verification/);
 assert.match(p,/Reference requested yesterday/);
 assert.match(p,/not automatically reject/i);
});
test('historical Leslie workflow is not presented as current approval rule',()=>{
 const p=buildPrompt();
 assert.match(p,/January 28, 2026/);
 assert.match(p,/historical observed tasks, NOT a currently verified/i);
 assert.match(p,/eviction-age\/deposit\/rejection thresholds/);
 assert.match(p,/Do not automatically reject, approve, impose additional deposits/);
});
test('draft mode keeps external messages under human control',()=>{
 const p=buildPrompt({mode:'draft',stage:'utility',request:'Draft note to water company'});
 assert.match(p,/Suggested Draft/);
 assert.match(p,/Internal Note/);
 assert.match(p,/Draft note to water company/);
 assert.match(p,/Do not send it/);
});
test('capture mode supports real SOP discovery and app versus AI split',()=>{
 const p=buildPrompt({mode:'capture',status:'I start by opening the emailed application'});
 assert.match(p,/What Staff Actually Does vs AI Could Assist vs Oaktown Ops Could Track/);
 assert.match(p,/Confirmed Steps/);
 assert.match(p,/PROPOSED ONLY/);
});
test('missing and privacy protections retained in all modes',()=>{
 assert.equal(Object.keys(stages).length,7);assert.equal(Object.keys(modes).length,3);
 for(const mode of Object.keys(modes)){
  const p=buildPrompt({mode,status:'Unverified progress'});
  assert.match(p,/Not supplied — do not infer/);
  assert.match(p,/no applicant identifiers/i);
  assert.match(p,/never request or reproduce SSNs/i);
  assert.match(p,/does NOT store applicant data/i);
 }
});
