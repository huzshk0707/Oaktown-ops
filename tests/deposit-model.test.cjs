'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../deposit-model.js'),E=require('../deposit-export.js'),Zip=require('../vendor/jszip-3.10.1.min.js');
const base=()=>({address:'100 Fictional Road, Unit A, Louisville, KY 40000',greeting:'Example',sender:'Fictional Staff',security:'1000',rent:'1025',pets:'1',moveIn:'2027-02-20',approved:true,signers:[{name:'Example Applicant',email:'applicant@example.invalid'}]});
test('pet deposit is $150 per pet while holding and first-month rent stay separate',()=>{
 for(const pets of [0,1,2,5]){
  const x=M.review({...base(),pets:String(pets)});assert.equal(x.valid,true);assert.equal(x.report.petCents,pets*15000);assert.equal(x.report.holdingCents,100000+pets*15000);assert.equal(x.report.rentCents,102500);
  assert.equal(x.report.credit.includes('for a pet deposit'),pets>0);assert.match(x.report.credit,/credited to the tenants security deposit/);
 }
 const x=M.review({...base(),security:'2300',rent:'2300',pets:'0'});assert.equal(x.report.holdingCents,230000);assert.equal(x.report.rentCents,230000);
});
test('confirmed facts, distinct signers and recorded approval are required',()=>{
 for(const change of [{security:''},{rent:'-2'},{pets:''},{pets:'1.5'},{pets:'-1'},{moveIn:'2027-02-30'},{approved:false},{approved:'true'},{signers:[]},{signers:[{name:'Example',email:'invalid'}]},{signers:[...base().signers,...base().signers]}])assert.equal(M.review({...base(),...change}).valid,false,JSON.stringify(change));
});
test('email follows the supplied message and never includes a fabricated payment handle',()=>{
 const x=M.review(base()).report;assert.match(x.email,/^Hi Example,/);assert.match(x.email,/Move-In Vendors Sheet/);assert.match(x.email,/Venmo or Zelle/);assert.match(x.email,/Fictional Staff\nOaktown Rentals$/);assert.doesNotMatch(x.email,/@[a-z]|paid|signed successfully/);
});
test('clean blank DOCX merges approved fields, escapes XML and keeps all signatures blank',async()=>{
 const input={...base(),signers:[{name:'Example & Co <Tenant>',email:'first@example.invalid'},{name:'Second Example',email:'second@example.invalid'}]};
 const r=M.review(input);assert.equal(r.valid,true);
 const bytes=await E.documentBytes(Zip,fs.readFileSync('assets/deposit/holding-template.docx'),r.report),zip=await Zip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
 assert.match(xml,/Example &amp; Co &lt;Tenant&gt;/);assert.match(xml,/1,150.00/);assert.match(xml,/1,025.00/);assert.match(xml,/02\/20\/2027/);assert.match(xml,/first@example.invalid/);assert.match(xml,/second@example.invalid/);assert.equal((xml.match(/Signature /g)||[]).length,2);assert.doesNotMatch(xml,/\{\{[A-Z_]+\}\}/);assert.match(xml,/keepNext/);
 assert.equal(Object.keys(zip.files).some(n=>n.toLowerCase().startsWith('customxml/')),false);
});
test('no-pet form keeps the security-deposit credit and omits the pet exception',async()=>{
 const r=M.review({...base(),pets:'0'}).report,zip=await Zip.loadAsync(await E.documentBytes(Zip,fs.readFileSync('assets/deposit/holding-template.docx'),r));
 const xml=await zip.file('word/document.xml').async('string');assert.doesNotMatch(xml,/for a pet deposit/);assert.match(xml,/upon lease signing\.\*\*/);
});
