'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const shell=fs.readFileSync('index.html','utf8')+'\n'+fs.readFileSync('workspace.js','utf8')+'\n'+fs.readFileSync('cloud.js','utf8');
const generator=fs.readFileSync('generator.html','utf8');
test('main release uses Oaktown Ops shell and Supabase-backed property selector',()=>{
 for(const tag of ['id="pilot-login"','id="pilot-property"','id="pilot-load"','id="studio-frame"','id="tenant-message-text"'])assert.ok(shell.includes(tag),tag);
 for(const ref of ['/auth/v1/user','/rest/v1/staff_memberships','/rest/v1/properties','/rest/v1/property_addressees'])assert.ok(shell.includes(ref),ref);
 assert.ok(shell.includes("['admin','editor'].includes(rows[0].role)"));
 assert.ok(shell.includes("event.origin!==location.origin"));
 assert.ok(shell.includes('generator.html?embedded=1'));
 assert.ok(shell.includes('id="court-form"'));
});
test('local vendor dependencies and v0.1 rollback exist in main root',()=>{
 for(const script of ['html2canvas-1.4.1.min.js','jspdf-2.5.1.umd.min.js','jszip-3.10.1.min.js']){
   assert.ok(fs.existsSync('vendor/'+script),script);
   assert.ok(generator.includes('src="vendor/'+script+'"'),script);
 }
 assert.ok(fs.existsSync('legacy.html'));
 assert.ok(fs.existsSync('styles.css'));
});
test('embedded generator handles property import without mutating original notice',()=>{
 assert.ok(generator.includes("event.data.type==='oaktown-import-property'"));
 assert.ok(generator.includes("data.notices.push(notice)"));
 assert.ok(generator.includes("type:'oaktown-import-confirmed'"));
 assert.ok(generator.includes('notice.charges=[{id:uid()'));
});
test('v0.3 inline scripts compile and never contain Supabase service secrets',()=>{
 for(const path of ['cloud.js','workspace.js'])assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path,'utf8')));
 for(const text of [shell,generator]){
   assert.ok(!/sb_secret_|service_role/i.test(text),'no database service secrets');
 }
});
