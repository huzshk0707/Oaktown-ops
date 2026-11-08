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
 d.entries[0].owner_label='Leslie';d.entries[0].origin='Meeting';d.entries[0].cluster_level='Renewals';
 d.entries[0].property_target='Unverified fictional location';d.entries[0].source_caution='Check evidence';
 d.entries[0].update_notes='Fictional note';assert.doesNotThrow(()=>M.parse(d));
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
  d=>{d.entries[1].waiting_on=''},
  d=>{d.entries[0].owner_label=123},
  d=>{d.entries[0].origin={untrusted:true}},
  d=>{d.entries[0].owner_label='X'.repeat(121)}
 ]){const d=make();invalid(d);assert.throws(()=>M.parse(d));}
});
test('Requires exact stable batch and workbook row provenance',()=>{
 for(const invalid of [d=>{d.batch_ref='other'},d=>{d.entries[0].source_ref='Some other file'},d=>{d.entries=[]}]){
  const d=make();invalid(d);assert.throws(()=>M.parse(d));
 }
});
test('Read-back must match receipt identities, statuses and exact parent links',()=>{
 const d=make(),saved=d.entries.map(r=>({task_code:r.task_code,id:'fictional-'+r.task_code,status:r.status,parent_task_id:r.parent_code?'fictional-'+r.parent_code:null}));
 const receipt={schema_version:'oaktown.master-backlog-receipt.v1',batch_ref:d.batch_ref,rows:d.entries.map(r=>({task_code:r.task_code,id:'fictional-'+r.task_code,status:r.status,parent_code:r.parent_code||null}))};
 assert.equal(M.verifySaved(d,receipt,saved),3);
 for(const change of [
  (r,s)=>{r.rows[1].id='different-saved-record'},
  (r,s)=>{s[1].task_code='W03'},
  (r,s)=>{s[1].parent_task_id=null},
  (r,s)=>{s[2].status='pending'},
  (r,s)=>{r.rows[1].parent_code='M13'},
  (r,s)=>{r.batch_ref='master-backlog-20990101'},
  (r,s)=>{r.rows[1]=r.rows[0]}
 ]){const r=structuredClone(receipt),s=structuredClone(saved);change(r,s);assert.throws(()=>M.verifySaved(d,r,s));}
});

test('Full fictional 37-row manifest validates with 4 historical completions and 9 verification tasks',()=>{
 const entries=[{task_code:'W03',task_title:'Fictional workstream',status:'pending',priority:'normal',work_level:'Renewals',source_ref:'Active Tasks!A5:L5'}];
 for(let i=1;i<=36;i++){
  const code='M'+String(i).padStart(2,'0');
  entries.push({task_code:code,task_title:'Fictional task '+code,
    status:i>=33?'completed':'pending',priority:'normal',work_level:'Renewals',
    ...(i>=12&&i<=21?{parent_code:'W03'}:{}),
    ...(i<=9?{needs_verification:true}:{}),
    ...(i>=33?{completion_summary:'Fictional history confirmation'}:{}),
    source_ref:'Active Tasks!A'+(i+5)+':L'+(i+5)});
 }
 const summary=M.summarize({schema_version:M.VERSION,batch_ref:'master-backlog-20991231',entries});
 assert.equal(summary.rows,37);assert.equal(summary.completed,4);
 assert.equal(summary.verification,9);assert.equal(summary.parentLinks,10);
});
