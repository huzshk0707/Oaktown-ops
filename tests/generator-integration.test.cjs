'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const generator = fs.readFileSync('generator.html', 'utf8');
const shell = fs.readFileSync('index.html','utf8')+'\n'+fs.readFileSync('workspace.js','utf8');

test('standalone generator script is syntactically valid', () => {
  const match = generator.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'embedded generator script should exist');
  assert.doesNotThrow(() => new vm.Script(match[1]));
});
test('integrated shell script is syntactically valid', () => {
  for(const path of ['cloud.js','workspace.js'])assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path,'utf8')));
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
test('shell retains the integrated generator and notice-linked court notes', () => {
  assert.ok(shell.includes('generator.html?embedded=1'));
  assert.ok(shell.includes('id="court-form"'));
  assert.ok(shell.includes('oaktown-court-save'));
  assert.ok(shell.includes('oaktown-view'));
  assert.ok(generator.includes("event.origin!==location.origin"));
});
test('document data is not fetched from or posted to an external service', () => {
  assert.ok(!/<script[^>]+src=["']https?:/i.test(generator), 'no remote JavaScript dependencies');
  assert.ok(!/\bfetch\s*\(/.test(generator));
  assert.ok(!/XMLHttpRequest/.test(generator));
});

test('tenant message uses live printed notice blocks and excludes the return address and statement', () => {
  const fn = generator.slice(generator.indexOf('function tenantMessageFromNotice('), generator.indexOf('function tenantMessageIssues('));
  assert.ok(fn.startsWith('function tenantMessageFromNotice('));
  for(const selector of ["'.recipient'","'.overdue'","'.notice-date'","'.greeting'","'.headline'","'.letter p'"])
    assert.ok(fn.includes(selector),selector);
  assert.ok(fn.includes('noticePages(n)[0]'), 'must read the printed notice HTML');
  assert.ok(!fn.includes('.sender'), 'must exclude owner return address');
  assert.ok(!fn.includes('.statement'), 'must exclude current statement table');
  assert.ok(fn.includes('return parts.filter(Boolean).join('), 'must preserve paragraph breaks');
});
test('tenant message has one working copy button and no duplicate Firm Book tab', () => {
  assert.ok(shell.includes('data-notice-tab="message"'));
  assert.ok(shell.includes('id="copy-message"'));
  assert.ok(shell.includes('navigator.clipboard.writeText'));
  assert.ok(shell.includes('tenant-message-text'));
  assert.ok(!shell.includes('data-workspace="firm"'));
  assert.ok(!shell.includes('id="fullscreen-link"'));
  assert.ok(generator.includes("event.data.type==='oaktown-tenant-message-request'"));
  assert.ok(generator.includes("type:'oaktown-tenant-message'"));
});


test('single and batch download controls are connected to local PDF and ZIP generation', () => {
  for(const name of ['downloadOne','downloadBatch','downloadStatus'])assert.ok(generator.includes('id="'+name+'"'));
  for(const localFile of ['vendor/html2canvas-1.4.1.min.js','vendor/jspdf-2.5.1.umd.min.js','vendor/jszip-3.10.1.min.js']){
    assert.ok(generator.includes('src="'+localFile+'"'), 'script is loaded locally: '+localFile);
    assert.ok(fs.existsSync(localFile), 'vendored script exists: '+localFile);
  }
  assert.ok(generator.includes("zip.file(filename,pdf"), 'each property notice is a separate PDF entry');
  assert.ok(generator.includes("Oaktown_7_Day_Notices_"), 'batch ZIP has a predictable name');
  assert.ok(generator.includes("safePropertyFilename(notices[0])+'.pdf'"), 'single PDF is property named');
  assert.ok(generator.includes("const pages=noticePages(notice)"), 'download uses the same layout as the print preview');
});
test('property PDF filename is sanitized for Windows without using tenant identity', () => {
  const beginning=generator.indexOf('function safePropertyFilename(notice) {');
  const ending=generator.indexOf('function saveDownloadedBlob(',beginning);
  assert.ok(beginning>=0&&ending>beginning);
  const snippet=generator.slice(beginning,ending);
  const filename=vm.runInNewContext(snippet+'\nsafePropertyFilename', {});
  assert.equal(filename({street:'11 Edmonia Ave',tenant:'Private Tenant'}),'11 Edmonia Ave');
  assert.equal(filename({street:'1715 Baird Ave.'}),'1715 Baird Ave');
  assert.equal(filename({street:'A/B: C*?\\ D|E'}),'A B C D E');
  assert.equal(filename({street:'CON'}),'Property CON');
  assert.equal(filename({street:''}),'Property');
});
