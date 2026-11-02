'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPrompt,calculateIncome,stages,modes}=require('../application-guide-model.js');
test('application guide follows staff-confirmed Fillout and Dropbox sequence',()=>{
 const p=buildPrompt({stage:'signature',property:'Fictional unit 4',status:'Fillout received; unsigned'});
 assert.match(p,/Fillout application notification email/);
 assert.match(p,/Dropbox e-signature/);
 assert.match(p,/SAME applicant/);
 assert.match(p,/tracks completed signature\/authorization/);
 assert.match(p,/Fictional unit 4/);
 assert.match(p,/unsigned/);
});
test('public-record workflow is jurisdiction-aware, preserving source limits',()=>{
 const p=buildPrompt({stage:'records',status:'Current residence is outside KY'});
 assert.match(p,/state AND county\/jurisdiction/);
 assert.match(p,/prior residences/);
 assert.match(p,/A civil process match alone is not proof of eviction/);
 assert.match(p,/Historical eviction-age rules\/deposit amounts do NOT establish current lawful policy/);
});
test('historical Leslie instruction is not active eligibility policy',()=>{
 const p=buildPrompt();
 assert.match(p,/January 28, 2026/);
 assert.match(p,/Historical eviction-age rules\/deposit amounts do NOT establish current lawful policy/);
 assert.match(p,/never impose universal 3×-full-rent eligibility/);
 assert.match(p,/human/i);
});
test('income calculation converts standard pay frequencies without making a decision',()=>{
 const bi=calculateIncome({rent:'$1,000',grossPay:'1,500.00',payFrequency:'biweekly'});
 assert.equal(bi.valid,true);
 assert.equal(bi.monthlyGross,3250);
 assert.equal(bi.benchmark,3000);
 assert.equal(bi.ratio,3.25);
 assert.equal(bi.atOrAboveBenchmark,true);
 assert.match(bi.message,/not an application decision/);
 const weekly=calculateIncome({rent:1200,grossPay:600,payFrequency:'weekly'});
 assert.equal(weekly.monthlyGross,2600);
 assert.equal(weekly.benchmark,3600);
 assert.equal(weekly.atOrAboveBenchmark,false);
 assert.equal(calculateIncome({rent:1000,grossPay:2000,payFrequency:'semimonthly'}).monthlyGross,4000);
 assert.equal(calculateIncome({rent:1000,grossPay:3100,payFrequency:'monthly'}).monthlyGross,3100);
 for(const bad of [{},{rent:'',grossPay:2000,payFrequency:'monthly'},{rent:-1,grossPay:2000,payFrequency:'monthly'},{rent:'1000abc',grossPay:2000,payFrequency:'monthly'},{rent:1000,grossPay:2000,payFrequency:'unknown'}]){
  assert.equal(calculateIncome(bad).valid,false);
 }
});
test('income mode asks for gross pay evidence and document privacy',()=>{
 const p=buildPrompt({mode:'income',stage:'income',rent:1000,grossPay:1500,payFrequency:'biweekly'});
 assert.match(p,/Income Worksheet/);
 assert.match(p,/Gross\/month 3250.00/);
 assert.match(p,/Arithmetic Comparison \(NOT Eligibility\)/);
 assert.match(p,/NO protected file upload/);
 assert.match(p,/distinguish gross from net/);
});
test('summary mode and message drafting preserve uncertain stages',()=>{
 const summary=buildPrompt({mode:'summary',stage:'summary',status:'water pending; landlord requested'});
 assert.match(summary,/APPLICATION REVIEW SUMMARY/);
 assert.match(summary,/Water Verification/);
 assert.match(summary,/landlord/i);
 assert.match(summary,/Leslie Decision/);
 const draft=buildPrompt({mode:'draft',stage:'landlord',request:'Draft reference request'});
 assert.match(draft,/Suggested Draft/);
 assert.match(draft,/Internal Verification Note/);
 assert.match(draft,/Do not send/);
});
test('staff process capture separates app work, AI and approval gates',()=>{
 const p=buildPrompt({mode:'capture',status:'I get emailed by Fillout'});
 assert.match(p,/Confirmed Step Sequence/);
 assert.match(p,/Staff vs Oaktown Ops vs AI/);
 assert.match(p,/Missing Forms\/Examples/);
 assert.match(p,/Do not invent policy/);
});
test('no automatic decisions and no applicant data persistence',()=>{
 assert.equal(Object.keys(stages).length,11);assert.equal(Object.keys(modes).length,5);
 for(const mode of Object.keys(modes)){
  const p=buildPrompt({mode});
  assert.match(p,/Not supplied — do not infer/);
  assert.match(p,/not the decision-maker/);
  assert.match(p,/has not saved this case/);
  assert.match(p,/automatic approval\/rejection/i);
 }
});
