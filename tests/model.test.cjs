const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
test('money uses exact cents for decimal inputs', () => {
  assert.equal(M.cents('0.10') + M.cents('0.20'), 30);
  assert.equal(M.cents('1250.5'), 125050);
  assert.equal(M.cents('0'), 0);
});
test('invalid money is rejected rather than silently treated as zero', () => {
  for (const input of ['', '-1', '1.234', '1e3', 'NaN', '1,000', 'Infinity', '100000000']) assert.equal(M.cents(input), null);
});
test('date-only inputs retain the calendar day and invalid dates are rejected', () => {
  assert.equal(M.displayDate('2026-10-25'), '10/25/2026');
  assert.equal(M.validDate('2024-02-29'), true);
  for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '', '10/25/2026']) assert.equal(M.validDate(value), false);
});
test('sample notices validate and total outstanding amounts', () => {
  const s = M.demoState();
  for (const n of s.notices) assert.deepEqual(M.errors(n, s.sender), []);
  assert.equal(s.notices.map(M.total).reduce((a,b) => a+b, 0), 330000);
});
test('partial payments preserve charge amount and reduce balance', () => {
  const n = M.demoState().notices[0];
  n.charges[0].due = '200.00';
  assert.equal(M.total(n), 25000);
  assert.equal(M.rowStatus(n.charges[0]), 'PARTIAL');
  n.charges[0].due = '0.00';
  assert.equal(M.rowStatus(n.charges[0]), 'PAID');
});
test('excess outstanding amount prevents a valid total and print-ready draft', () => {
  const s = M.demoState();
  s.notices[0].charges[0].due = '1300';
  assert.equal(M.total(s.notices[0]), null);
  assert.ok(M.errors(s.notices[0], s.sender).some(x => x.includes('cannot exceed')));
});
test('blank drafts require missing details and statement lines', () => {
  const n = M.blankNotice('test', '2026-10-25');
  assert.ok(M.errors(n, {name:'',address:''}).length >= 5);
  n.charges = [];
  assert.ok(M.errors(n, {name:'Sender',address:'Address'}).some(x => x.includes('at least one')));
});
test('mailing selection preserves order and does not fabricate tracking', () => {
  const s = M.demoState();
  s.notices[1].selected = false;
  const rows = M.mailingRows(s.notices);
  assert.deepEqual(rows.map(r => r.id), ['notice-1', 'notice-3']);
  assert.deepEqual(rows.map(r => r.number), [1, 2]);
  assert.equal(rows[0].tracking, '');
  assert.ok(rows[0].recipient.endsWith('& All Occupants'));
  s.notices.forEach(n => n.selected = false);
  assert.deepEqual(M.mailingRows(s.notices), []);
});
test('mailing list supports more than eight entries', () => {
  const notices = Array.from({length: 12}, (_, i) => ({ ...M.blankNotice('n'+i), recipient:'Example '+i, address:'Sample address', selected:true }));
  assert.equal(M.mailingRows(notices).length, 12);
  assert.equal(M.mailingRows(notices)[11].number, 12);
});
test('untrusted text is rendered as text', () => {
  assert.equal(M.escape('<script>"test" & \'x\'</script>'), '&lt;script&gt;&quot;test&quot; &amp; &#39;x&#39;&lt;/script&gt;');
});
test('confirmation requires a date and reference and time needs a timezone', () => {
  const f = M.blankNotice('test').filing;
  assert.deepEqual(M.filingErrors(f), []);
  f.confirmed = true;
  assert.equal(M.filingErrors(f).length, 2);
  f.confirmedDate = '2026-10-25'; f.reference = 'Example update';
  f.courtDate = '2026-11-10'; f.courtTime = '09:00';
  assert.equal(M.filingErrors(f).length, 1);
  f.timezone = 'America/New_York';
  assert.deepEqual(M.filingErrors(f), []);
});
test('reminder after court date is flagged without inventing a deadline', () => {
  const f = { ...M.blankNotice('test').filing, confirmed:true, confirmedDate:'2026-10-25', reference:'Example', courtDate:'2026-11-10', reminderDate:'2026-11-11' };
  assert.ok(M.filingErrors(f).some(x => x.includes('after the court date')));
});
