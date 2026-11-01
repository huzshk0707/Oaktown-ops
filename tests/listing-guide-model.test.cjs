const test=require('node:test');
const assert=require('node:assert/strict');
const {buildPrompt}=require('../listing-guide-model.js');

test('two-version prompt tells AI to wait for approval before bullets',()=>{
 const p=buildPrompt({address:'Example Street Unit 7',rent:'1799',facts:'New rent overrides old listing',previous:'Old rent 1850'});
 assert.match(p,/TWO complete alternative/i);
 assert.match(p,/VERSION 1/);
 assert.match(p,/VERSION 2/);
 assert.match(p,/Do NOT generate website feature bullets yet/i);
 assert.match(p,/New rent overrides old listing/);
 assert.match(p,/Old rent 1850/);
 assert.match(p,/historical reference/i);
});
test('website features prompt is separate and requires approval',()=>{
 const p=buildPrompt({stage:'features',approved:'Approved apartment description'});
 assert.match(p,/WEBSITE FEATURES ONLY/);
 assert.match(p,/Approved apartment description/);
 assert.match(p,/ALL-CAPS/);
 assert.match(p,/NO literal bullet characters/);
 assert.doesNotMatch(p,/TASK — FIRST REVIEW/);
});
test('missing approved description explicitly blocks feature output',()=>{
 const p=buildPrompt({stage:'features'});
 assert.match(p,/If it is empty, DO NOT generate features/);
 assert.match(p,/Please paste Leslie’s approved description first/);
});
test('no facts guessed; fictional example labelled',()=>{
 const p=buildPrompt({});
 assert.match(p,/Not provided — do not assume/);
 assert.match(p,/FICTIONAL EXAMPLE/);
 assert.match(p,/never copy its facts/i);
 assert.match(p,/Do not infer amenities/i);
});
