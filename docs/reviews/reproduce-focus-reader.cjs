'use strict';
// Review evidence only. Reads an exported source module; all task IDs are fictional.
// Usage: node docs/reviews/reproduce-focus-reader.cjs /path/to/exact-head-export
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.argv[2];if(!root)throw Error('Supply the exact reviewed source export');
const R=require(path.resolve(root,'ops-task-reader.js'));
(async()=>{
 let tasks=Array.from({length:1002},(_,i)=>({id:String(i).padStart(6,'0')})),reads=0;
 const rows=await R.read(async url=>{
  const q=new URL(url,'https://fictional.invalid'),offset=Number(q.searchParams.get('offset')||0);
  const page=tasks.slice(offset,offset+1000);reads++;
  if(reads===1)tasks=tasks.slice(1); // Another authorized operation deletes an earlier record between pages.
  return page;
 });
 const ids=new Set(rows.map(r=>r.id)),missing=tasks.filter(t=>!ids.has(t.id)).map(t=>t.id);
 assert.deepEqual(missing,['001000']);assert.equal(ids.has('000000'),true);assert.equal(rows.length,1001);
 console.log(JSON.stringify({outcome:'reproduced',reads,returned:rows.length,current:tasks.length,missingCurrentIDs:missing,returnedDeletedID:'000000',writes:0},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
