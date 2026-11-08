'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../backlog-import-model.js');
const make=()=>({schema_version:M.VERSION,batch_ref:'master-backlog-20991231',entries:[
 {task_code:'W03',task_title:'Fictional parent',status:'pending',priority:'normal',work_level:'Renewals',source_ref:'Active Tasks!A9:L9'},
 {task_code:'M12',task_title:'Fictional follow-up',status:'waiting',priority:'high',work_level:'Renewals',parent_code:'W03',waiting_on:'Fictional person',source_ref:'Active Tasks!A10:L10'},
 {task_code:'M13',task_title:'Fictional historical completion',status:'completed',priority:'normal',work_level:'Renewals',parent_code:'W03',completion_summary:'Reported complete',source_ref:'Active Tasks!A11:L11',needs_verification:true}
]});
test('Import model preserves real hierarchy and completion count without inventing dates',()=>{
 const d=make(),s=M.summarize(d);
 assert.deepEqual(s,{rows:3,completed:1,verification:1,parentLinks:2,codes:['W03','M12','M13']});
 assert.equal(d.entries[2].completed_on,undefined);
});
test('Invalid codes, unknown fields and duplicate IDs are blocked',()=>{
 for(const invalid of [
  d=>{d.entries[1].task_code='W03'},
  d=>{d.entries[1].task_code='OAK-002'},
  d=>{d.entries[0].property_id='made-up'},
  d=>{d.entries[1].parent_code='M12'},
  d=>{d.entries[1].parent_code='W99'},
  d=>{d.entries[2].completion_summary=''},
  d=>{d.entries[2].completed_on='invalid'},
  d=>{d.entries[0].due_at='2026-11-08'},
  d=>{d.entries[1].waiting_on=''}
 ]){const d=make();invalid(d);assert.throws(()=>M.parse(d));}
});
test('Requires exact stable batch and workbook row provenance',()=>{
 for(const invalid of [d=>{d.batch_ref='other'},d=>{d.entries[0].source_ref='Some other file'},d=>{d.entries=[]}]){
  const d=make();invalid(d);assert.throws(()=>M.parse(d));
 }
});
