'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),R=require('../ops-task-reader.js');
test('shared reader reaches records beyond the first page in a stable ID order',async()=>{
 const tasks=Array.from({length:2001},(_,i)=>({id:String(i).padStart(6,'0')})),paths=[];
 const rows=await R.read(async path=>{paths.push(path);const u=new URL(path,'http://test');assert.equal(u.searchParams.get('order'),'id.asc');assert.equal(u.searchParams.has('offset'),false);const cursor=u.searchParams.get('id')?.slice(3);return tasks.filter(t=>!cursor||t.id>cursor).slice(0,1000)});
 assert.deepEqual(rows,tasks);assert.equal(paths.length,3);assert.match(paths[2],/id=gt.001999/);
});
test('deletion before page two cannot shift the cursor past a current task',async()=>{
 let tasks=Array.from({length:1002},(_,i)=>({id:String(i).padStart(6,'0')})),reads=0;
 const rows=await R.read(async path=>{const cursor=new URL(path,'http://test').searchParams.get('id')?.slice(3);if(++reads===2)tasks=tasks.slice(1);return tasks.filter(t=>!cursor||t.id>cursor).slice(0,1000)});
 const ids=new Set(rows.map(t=>t.id));assert.equal(reads,2);assert.equal(ids.size,rows.length);assert.ok(tasks.every(t=>ids.has(t.id)));assert.ok(ids.has('001000'));
 // Previously read rows may survive until refresh; keyset traversal is not a transactional snapshot.
});
test('insertions around the cursor do not duplicate or skip later existing records',async()=>{
 let tasks=Array.from({length:1002},(_,i)=>({id:String(i*2).padStart(6,'0')})),reads=0;const original=tasks.map(t=>t.id);
 const rows=await R.read(async path=>{const cursor=new URL(path,'http://test').searchParams.get('id')?.slice(3);if(++reads===2)tasks=[...tasks,{id:'000001'},{id:'001999'}].sort((a,b)=>a.id.localeCompare(b.id));return tasks.filter(t=>!cursor||t.id>cursor).slice(0,1000)});
 const ids=new Set(rows.map(t=>t.id));assert.equal(ids.size,rows.length);assert.ok(original.every(id=>ids.has(id)));assert.ok(ids.has('001999'));assert.equal(ids.has('000001'),false);
});
test('legacy schema restart resets the cursor and discards partial first attempts',async()=>{
 const tasks=Array.from({length:1001},(_,i)=>({id:String(i).padStart(6,'0')})),paths=[];
 const rows=await R.read(async path=>{paths.push(path);const q=new URL(path,'http://test').searchParams,cursor=q.get('id')?.slice(3);if(path.includes('task_code')&&cursor)throw Object.assign(Error('old schema'),{status:400});return tasks.filter(t=>!cursor||t.id>cursor).slice(0,1000)});
 assert.deepEqual(rows,tasks);assert.equal(paths.length,4);assert.equal(new URL(paths[2],'http://test').searchParams.has('id'),false);
});
test('nonadvancing/out-of-order pages and later denied reads fail without a partial ready result',async()=>{
 await assert.rejects(()=>R.read(async()=>[{id:'b'},{id:'a'}]),/pages changed/);
 await assert.rejects(()=>R.read(async()=>[{id:1}]),/Unexpected/);
 let reads=0;await assert.rejects(()=>R.read(async()=>{if(++reads===2)throw Object.assign(Error('Access revoked'),{status:403});return Array.from({length:1000},(_,i)=>({id:String(i).padStart(6,'0')}))}),/Access revoked/);
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
