'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const shell=fs.readFileSync('index.html','utf8');
const preview=fs.readFileSync('preview-v03/index.html','utf8');

function matcherFrom(html){
 const start=html.indexOf('function propertySearchMatches(');
 const end=html.indexOf('function filterProperties()',start);
 assert.ok(start>=0&&end>start,'Search helper is present');
 return vm.runInNewContext(html.slice(start,end)+'\npropertySearchMatches');
}

test('address search is displayed in main and v0.3 preview and updates property list',()=>{
 for(const page of [shell,preview]){
  assert.ok(page.includes('id="pilot-search" type="search"'));
  assert.ok(page.includes('placeholder="Search address..."'));
  assert.ok(page.includes('id="pilot-results" role="status" aria-live="polite"'));
  assert.ok(page.includes("$('pilot-search').addEventListener('input',filterProperties)"));
  assert.ok(page.includes('function filterProperties()'));
  assert.ok(page.includes('matches.length+\' of \'+records.length'));
 }
});

test('property search handles partial street, ZIP, unit, city and multiple terms',()=>{
 const match=matcherFrom(shell);
 const p={street_address:'5413 Wintergreen Road',unit:'Apt 2B',city:'Louisville',state:'KY',postal_code:'40272'};
 for(const query of ['','winter','WINTERGREEN','  5413  ','40272','louisville',' KY ','apt 2b','  WINTER  40272  ']){
  assert.equal(match(p,query),true,'should match '+JSON.stringify(query));
 }
 for(const query of ['afterglow','40214','5413 old ironside','KY 40000']){
  assert.equal(match(p,query),false,'should not match '+JSON.stringify(query));
 }
});

test('filter scales to 50+ records without relying on seed or hardcoded property count',()=>{
 const match=matcherFrom(shell);
 const properties=Array.from({length:75},(_,i)=>({street_address:(1000+i)+' Sample Street',city:'Louisville',state:'KY',postal_code:String(40000+i)}));
 assert.equal(properties.filter(x=>match(x,'sample')).length,75);
 assert.equal(properties.filter(x=>match(x,'1051')).length,1);
 assert.equal(properties.filter(x=>match(x,'40051')).length,1);
 assert.equal(properties.filter(x=>match(x,'missing')).length,0);
});

test('preview retains checked selections when filtering and select-matching excludes hidden records',()=>{
 assert.ok(preview.includes("row.style.display=ids.has(Number(check.dataset.propertyIndex))?'flex':'none'"));
 assert.ok(preview.includes('id="pilot-select-all">Select matching</button>'));
 assert.ok(preview.includes("x.closest('label')?.style.display!=='none'"));
 assert.ok(preview.includes('Previously checked properties stay selected'));
});
