'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const base=path.resolve(__dirname,'../supabase/functions/oaktown-task-api');
const modules=Promise.all([import(pathToFileURL(path.join(base,'server.mjs'))),import(pathToFileURL(path.join(base,'auth.mjs'))),import(pathToFileURL(createRequire(path.join(base,'package.json')).resolve('jose')))]);
const SUPABASE='https://fictional.supabase.co',URL=SUPABASE+'/functions/v1/oaktown-task-api/mcp';
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',P='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',TOKEN='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function invoke(handler,name,args,token='fictional-token'){
 const r=await handler(new Request(URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));
 return r.json();
}
const saved={id:ID,task_code:'A03',task_title:'Fictional document collection',status:'in_progress',priority:'normal',updated_at:'2099-01-01T10:00:00Z',next_action:'Collect fictional documents',due:null};
const receipt={schema_version:'oaktown.task-agent-receipt.v1',proposal_id:P,task_id:ID,task:saved};
const approval={proposal_id:P,preview_token:TOKEN,confirmation:'APPLY '+P,reviewed:true};
test('MCP discovery has OAuth policies and explicit write confirmation annotations, without reading task data',async()=>{
 const [{createHandler}]=await modules;let reads=0;
 const h=createHandler({supabaseUrl:SUPABASE,publishableKey:'fictional',fetchImpl:async()=>{reads++;throw Error('Unexpected DB read')}});
 const meta=await h(new Request(URL.replace('/mcp','/.well-known/oauth-protected-resource')));
 const metadata=await meta.json();assert.equal(metadata.resource,URL.replace(SUPABASE,'https://wjdzaexhhjsjtdgxivyw.supabase.co'));
 for(const method of ['initialize','tools/list']){
  const r=await h(new Request(URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,...(method==='initialize'?{params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'fictional-ci',version:'1'}}}:{})})}));
  assert.equal(r.status,200);const d=await r.json();
  if(method==='tools/list'){
   assert.equal(d.result.tools.length,5);for(const t of d.result.tools)assert.equal(t._meta.securitySchemes[0].type,'oauth2');
   const apply=d.result.tools.find(t=>t.name==='apply_task_change');assert.equal(apply.annotations.readOnlyHint,false);assert.equal(apply.annotations.destructiveHint,true);assert.equal(apply.annotations.idempotentHint,true);
  }
 }
 assert.equal(reads,0);
 const noAuth=await invoke(h,'get_task',{task_id:ID},null);assert.equal(noAuth.result.isError,true);assert.ok(noAuth.result._meta['mcp/www_authenticate'][0].includes('resource_metadata'));assert.equal(reads,0);
});
test('JWT verification binds signature, issuer, audience, role and live-session identity; editable metadata grants no rights',async()=>{
 const [, {createVerifier,RESOURCE},jose]=await modules;
 const {publicKey,privateKey}=await jose.generateKeyPair('ES256');
 const jwk=await jose.exportJWK(publicKey);jwk.kid='fictional-ci';
 const verify=createVerifier(SUPABASE,RESOURCE,jose.createLocalJWKSet({keys:[jwk]}));
 const claims={role:'oaktown_task_agent',client_id:'fictional-chatgpt',session_id:ID,is_anonymous:false};
 const sign=(overrides={},options={})=>new jose.SignJWT({...claims,...overrides}).setProtectedHeader({alg:'ES256',kid:'fictional-ci'}).setIssuer(options.issuer||SUPABASE+'/auth/v1').setAudience(options.audience||RESOURCE).setSubject(ID).setIssuedAt().setExpirationTime(options.expires||'2m').sign(privateKey);
 assert.equal((await verify(await sign())).sub,ID);
 for(const [fields,opts] of [[{role:'authenticated',user_metadata:{role:'oaktown_task_agent'}},{}],[{is_anonymous:true},{}],[{client_id:''},{}],[{session_id:'not-a-session'},{}],[{}, {audience:'authenticated'}],[{}, {issuer:'https://attacker.invalid'}],[{}, {expires:1}]])
  await assert.rejects(()=>sign(fields,opts).then(verify));
 const secret=new Uint8Array(32);const hs=await new jose.SignJWT(claims).setProtectedHeader({alg:'HS256'}).setIssuer(SUPABASE+'/auth/v1').setAudience(RESOURCE).setSubject(ID).setIssuedAt().setExpirationTime('2m').sign(secret);
 await assert.rejects(()=>verify(hs));
});
test('Preview sends only a stored proposal and never applies it or accepts unsupported changes',async()=>{
 const [{createHandler}]=await modules,calls=[];
 const h=createHandler({supabaseUrl:SUPABASE,publishableKey:'fictional-public',verifyToken:async()=>({sub:ID}),fetchImpl:async(url,options)=>{
  assert.equal(url,SUPABASE+'/rest/v1/rpc/ops_task_agent');assert.equal(options.headers.apikey,'fictional-public');calls.push(JSON.parse(options.body));
  return Response.json({proposal_id:P,preview_token:TOKEN,confirmation:'APPLY '+P,saved:false});
 }});
 const args={operation:'create',request_ref:'fictional-create',source_note:'User requested collection',changes:{task_title:'Fictional task',next_action:'Collect documents'},clear_fields:[]};
 const r=await invoke(h,'preview_task_change',args);assert.equal(r.result.structuredContent.saved,false);assert.deepEqual(calls.map(c=>c.action),['preview']);assert.deepEqual(calls[0].payload,args);
 const bad=await invoke(h,'preview_task_change',{...args,changes:{...args.changes,actor_id:ID}});assert.ok(bad.result.isError);assert.equal(calls.length,1);
});
test('Save verifies every receipt field after an independent read; mismatch or read failure remains explicitly unverified',async()=>{
 const [{createHandler}]=await modules;
 for(const mode of ['ok','different-title','different-version','read-failed','save-lost']){
  const calls=[];const h=createHandler({supabaseUrl:SUPABASE,publishableKey:'fictional',verifyToken:async()=>({sub:ID}),fetchImpl:async(_url,options)=>{
   const b=JSON.parse(options.body);calls.push(b.action);
   if(b.action==='apply'){if(mode==='save-lost')throw Error('Fictional lost response');return Response.json(receipt)}
   if(mode==='read-failed')throw Error('Fictional read failure');
   return Response.json({...saved,...(mode==='different-title'?{task_title:'Different task data'}:{}),...(mode==='different-version'?{updated_at:'2099-01-02T00:00:00Z'}:{})});
  }});
  const r=await invoke(h,'apply_task_change',approval),d=r.result.structuredContent;
  assert.equal(d.verified,mode==='ok');assert.equal(d.outcome,mode==='ok'?'saved':mode==='save-lost'?'unknown':'saved_unverified');
  assert.deepEqual(calls,mode==='save-lost'?['apply']:['apply','get']);
 }
});
test('Concurrent requests forward their own verified JWTs without sharing user identity',async()=>{
 const [{createHandler}]=await modules;
 const h=createHandler({supabaseUrl:SUPABASE,publishableKey:'fictional',verifyToken:async token=>({sub:token}),fetchImpl:async(_url,options)=>{
  await new Promise(r=>setTimeout(r,options.headers.Authorization.endsWith('one')?20:1));return Response.json({id:ID,actor:options.headers.Authorization});
 }});
 const [a,b]=await Promise.all([invoke(h,'get_task',{task_id:ID},'one'),invoke(h,'get_task',{task_id:ID},'two')]);
 assert.equal(a.result.structuredContent.task.actor,'Bearer one');assert.equal(b.result.structuredContent.task.actor,'Bearer two');
});
test('MCP rejects untrusted origins and oversized request bodies before any data operation',async()=>{
 const [{createHandler}]=await modules;let calls=0;
 const h=createHandler({supabaseUrl:SUPABASE,publishableKey:'fictional',verifyToken:async()=>{calls++;return {}}});
 assert.equal((await h(new Request(URL,{method:'POST',headers:{Origin:'https://untrusted.invalid'}}))).status,403);
 assert.equal((await h(new Request(URL,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({padding:'x'.repeat(33000)})}))).status,413);
 assert.equal(calls,0);
});
