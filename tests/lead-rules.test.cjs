'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../lead-rules.js');

const base = { property:{ propertyId:'example-id', availability:'ready', askingRent:'', rentVerified:false, incomeMultiplier:3 }, answers:{} };
const complete = {
  income:'$6,000', incomeBasis:'gross_monthly_household',
  residence:'Renting for 2 years', pets:'None', adverse:'None', walkthrough:'Yes',
  assistanceAnimal:'no', voucher:'no'
};

test('initial Leslie script is unchanged and asks for ID only after questions', () => {
  const result=rules.assess(base);
  assert.equal(result.draft, 'Home is available and ready to go. '+rules.OPENING);
  assert.match(result.draft,/DO NOT SEND ME YOUR LICENSE BEFORE THE QUESTIONS ARE ANSWERED AND I ASK FOR IT!/);
  assert.equal(result.missing.length,5);
});

test('missing-question handling asks only for unanswered categories', () => {
  const result=rules.assess({...base,answers:{...complete, income:''}});
  assert.deepEqual(result.missing,['income']);
  assert.match(result.draft,/monthly income/);
  assert.doesNotMatch(result.draft,/animals/);
});

test('unknown rent does not yield an invented income threshold', () => {
  const result=rules.assess({...base,answers:complete});
  assert.equal(result.incomeMinimum,null);
  assert.ok(result.flags.some(f=>f.includes('unverified')));
});

test('verified asking rent yields illustrative math, never an approval decision', () => {
  const result=rules.assess({property:{...base.property,askingRent:'1850',rentVerified:true},answers:{...complete,income:'$5000'}});
  assert.equal(result.incomeMinimum,5550);
  assert.ok(result.flags.some(f=>f.includes('below')));
  assert.equal(result.step,'Leslie review required');
  assert.doesNotMatch(result.draft,/approved|denied|rejected/i);
});

test('housing voucher receives program-specific question rather than auto-denial', () => {
  const result=rules.assess({...base,answers:{...complete,voucher:'yes',voucherDetails:''}});
  assert.match(result.draft,/voucher bedroom size/);
  assert.ok(result.flags.some(f=>f.includes('Housing voucher')));
});

test('assistance animal cannot inherit ordinary pet charges', () => {
  const result=rules.assess({...base,answers:{...complete,pets:'Yes — dog',petDetails:'German shepherd ESA',assistanceAnimal:'yes'}});
  assert.ok(result.flags.some(f=>f.includes('Assistance-animal')));
  assert.doesNotMatch(result.draft,/\$25|deposit|pet fee/i);
});

test('adverse history triggers review, never automatic double deposit', () => {
  const result=rules.assess({...base,answers:{...complete,adverse:'Bankruptcy 2020'}});
  assert.ok(result.flags.some(f=>f.includes('Disclosed financial history')));
  assert.doesNotMatch(result.draft,/double deposit/);
});

test('holding deposit supersedes prequalification', () => {
  const result=rules.assess({property:{...base.property,availability:'holding'},answers:complete});
  assert.match(result.draft,/holding deposit/);
  assert.doesNotMatch(result.draft,/license/i);
});

test('occupied unit never receives viewing instruction', () => {
  const result=rules.assess({property:{...base.property,availability:'occupied'},answers:complete});
  assert.ok(result.flags.some(f=>f.includes('occupied')));
  assert.doesNotMatch(result.draft,/send.*license/i);
});

test('uncertain tenant phrasing creates suggestions, not confirmed facts', () => {
  const candidates=rules.extractCandidates('Our monthly income is $6,000. We have a dog, and we are currently renting.');
  assert.ok(candidates.some(x=>x.field==='income'));
  assert.ok(candidates.some(x=>x.field==='pets'));
  assert.ok(candidates.some(x=>x.field==='residence'));
  assert.ok(candidates.every(x=>x.reason));
});

test('monthly income utility supports annual, monthly, and weekly strings', () => {
  assert.equal(rules.parseMonthlyIncome('$72,000 annual'),6000);
  assert.equal(rules.parseMonthlyIncome('$5,550/month'),5550);
  assert.equal(rules.parseMonthlyIncome('$600 weekly'),2600);
});

test('missing candidate evidence remains blank and never infers a denial', () => {
  assert.deepEqual(rules.extractCandidates('I would like to schedule a tour.'),[]);
  assert.equal(rules.assess(base).missing.length,5);
});
