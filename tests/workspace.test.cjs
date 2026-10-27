'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const gen=fs.readFileSync('generator.html','utf8'),shell=fs.readFileSync('index.html','utf8');
const start=gen.indexOf('function cleanCourt('),end=gen.indexOf('function makeInput(',start);
const clean=vm.runInNewContext(gen.slice(start,end)+'\ncleanWorkspace');
const batch=()=>({notices:[{id:'one',tenant:'Sample',charges:[{id:'charge',amount:'',amountDue:12.5}]}],properties:[],selected:'one'});
test('cloud payload validator preserves blanks and court records, rejects malformed batches before replacing state',()=>{
 const b=batch();b.notices[0].court={authorized:true,confirmed:true,reference:'Fixture',notes:'Remember this',unexpected:'ignored'};
 const v=clean(b);assert.equal(v.notices[0].charges[0].amount,'');assert.equal(v.notices[0].charges[0].amountDue,12.5);assert.equal(v.notices[0].court.reference,'Fixture');assert.equal(v.notices[0].court.unexpected,undefined);
 for(const bad of [{}, {...b,notices:[]},{...b,notices:[b.notices[0],b.notices[0]]},{...b,properties:[{id:''}]},{...b,notices:[{...b.notices[0],court:{notes:7}}]}])assert.throws(()=>clean(bad));
 assert.equal(b.notices[0].court.notes,'Remember this');
});
test('duplicating a notice clears filing history and property identity',()=>{
 const duplicate=gen.slice(gen.indexOf("$('duplicate').onclick"),gen.indexOf("$('removeNotice').onclick"));
 assert.ok(duplicate.includes('delete n.court'));assert.ok(duplicate.includes('delete n.sourcePropertyId'));
});
test('notice workflow has three inner stages and one shared account dialog',()=>{
 assert.equal((shell.match(/id="account-dialog"/g)||[]).length,1);
 for(const view of ['notices','message','court'])assert.ok(shell.includes('data-notice-tab="'+view+'"'));
 assert.ok(!shell.includes('data-workspace="court"'));assert.ok(!shell.includes('v0.1 preserved'));
});

test('main navigation only exposes currently maintained Oaktown workflows',()=>{
 const names=[...shell.matchAll(/data-workspace="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(names,['notices','properties','leases','listings','maintenance']);
 const localAssets=[...shell.matchAll(/<(?:script|link)\\b[^>]+(?:src|href)="([^"]+)"/g)].map(match=>match[1].split('?')[0]).filter(x=>!x.startsWith('http'));
 for(const asset of localAssets)assert.ok(fs.existsSync(asset),asset+' must exist');
});
