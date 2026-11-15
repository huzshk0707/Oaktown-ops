'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),R=require('../ops-task-reader.js');
test('shared reader reaches records beyond the first page in a stable ID order',async()=>{
 const tasks=Array.from({length:2001},(_,i)=>({id:String(i).padStart(6,'0')})),paths=[];
 const rows=await R.read(async path=>{paths.push(path);const u=new URL(path,'http://test');assert.equal(u.searchParams.get('order'),'id.asc');const offset=Number(u.searchParams.get('offset'));return tasks.slice(offset,offset+1000)});
 assert.deepEqual(rows,tasks);assert.equal(paths.length,3);assert.match(paths[2],/offset=2000/);
});
test('legacy fallback restarts the same task reader without hiding other failures',async()=>{
 let tries=0;const rows=await R.read(async path=>{tries++;if(path.includes('task_code'))throw Object.assign(Error('old schema'),{status:400});return [{id:'old'}]});assert.equal(tries,2);assert.equal(rows[0].id,'old');
 await assert.rejects(()=>R.read(async()=>{throw Object.assign(Error('Denied'),{status:403})}),/Denied/);
});
test('malformed, repeated pages and superseded sessions never return partial tasks',async()=>{
 await assert.rejects(()=>R.read(async()=>({error:true})),/Unexpected/);
 await assert.rejects(()=>R.read(async()=>Array.from({length:1000},(_,i)=>({id:String(i)}))),/pages changed/);
 let current=true;await assert.rejects(()=>R.read(async()=>{current=false;return [{id:'private'}]},()=>current),/superseded/);
});
