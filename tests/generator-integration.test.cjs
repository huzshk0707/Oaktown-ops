'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const generator = fs.readFileSync('generator.html', 'utf8');
const shell = fs.readFileSync('index.html','utf8');

test('standalone generator script is syntactically valid', () => {
  const match = generator.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'embedded generator script should exist');
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
test('integrated shell script is syntactically valid', () => {
  const match = shell.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match);
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
test('notice uses six original statement columns and yellow-highlighted amount', () => {
  for(const text of ['Due Date','Category','Description','Status','Amount','Amount Due']) assert.ok(generator.includes('<th>'+text+'</th>'),text);
  assert.ok(generator.includes('class="highlight"'));
  assert.ok(generator.includes('7 DAY NOTICE PAY OR DELIVER POSSESSION'));
  assert.ok(generator.includes('rows.slice(0,1)'), 'first page and continuation behavior stays intact');
});
test('Firm Book uses original embedded form with eight entries per sheet', () => {
  assert.ok(generator.includes('FIRM_BACKGROUND_DATA'));
  assert.ok(generator.includes('i+=8'));
  assert.ok(generator.includes('formEntry(n,j)'));
  assert.ok(generator.includes('11in 8.5in'));
});
test('shell preserves full screen generator and separate legacy court notes', () => {
  assert.ok(shell.includes('generator.html?embedded=1'));
  assert.ok(shell.includes('legacy.html'));
  assert.ok(shell.includes('oaktown-view'));
  assert.ok(generator.includes("event.origin!==location.origin"));
});
test('document data is not fetched from or posted to an external service', () => {
  assert.ok(!/<script[^>]+src=/i.test(generator));
  assert.ok(!/\bfetch\s*\(/.test(generator));
  assert.ok(!/XMLHttpRequest/.test(generator));
});
