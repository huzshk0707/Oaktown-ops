'use strict';
// Credential-free public metadata and denied read probes. Never submits a plan,
// approves a request, changes a task, signs in, or configures client permissions.
// Node 24 behind the Cloud proxy: NODE_USE_ENV_PROXY=1 node <this-file>
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const source=readFileSync(resolve(__dirname,'../../cloud.js'),'utf8');
const base='https://wjdzaexhhjsjtdgxivyw.supabase.co';
assert.equal(source.match(/const BASE='([^']+)'/)?.[1],base);
const key=source.match(/KEY='([^']+)'/)?.[1];
assert.ok(key?.startsWith('sb_publishable_'),'Expected the existing public app key');
const edge=base+'/functions/v1/oaktown-task-api',resource=edge+'/mcp';
const metadata=edge+'/.well-known/oauth-protected-resource';
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function get(url,options={}){
 const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
 const text=await response.text();let body;try{body=JSON.parse(text)}catch{}
 return {status:response.status,body,text};
}
const mcp=(method,params)=>get(resource,{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
function denied(result){
 assert.equal(result.status,200,'Expected MCP JSON-RPC response');
 assert.equal(result.body?.result?.isError,true,'Anonymous tool must fail');
 const error=JSON.parse(result.body.result.content[0].text);
 assert.equal(error.error,'authentication_required');
 const challenges=result.body.result._meta?.['mcp/www_authenticate'];
 assert.ok(challenges?.some(value=>value.includes('resource_metadata="'+metadata+'"')),'Expected OAuth resource challenge');
 return {http:result.status,error:error.error,oauthChallenge:true};
}
const checks=[
 ['health',async()=>{const r=await get(edge+'/health');assert.equal(r.status,200);assert.equal(r.body?.status,'ok');assert.equal(r.body.version,'1.1.0');assert.equal(r.body.authentication,'scoped-oauth-required');assert.equal(r.body.resource,resource);return {http:r.status,version:r.body.version,authentication:r.body.authentication};}],
 ['oauth_discovery',async()=>{const r=await get(metadata);assert.equal(r.status,200);assert.equal(r.body?.resource,resource);assert.deepEqual(r.body.authorization_servers,[base+'/auth/v1']);assert.ok(r.body.scopes_supported.includes('openid'));assert.ok(r.body.bearer_methods_supported.includes('header'));return {http:r.status,resource:r.body.resource,authorizationServer:r.body.authorization_servers[0]};}],
 ['tool_contract',async()=>{const r=await mcp('tools/list',{});assert.equal(r.status,200);const tools=r.body?.result?.tools;assert.ok(Array.isArray(tools));const names=tools.map(t=>t.name).sort();assert.deepEqual(names,['apply_task_change','get_plan_submission','get_task','get_task_history','preview_task_change','read_daily_plan','search_tasks','submit_daily_plan']);for(const tool of tools)assert.ok(tool._meta?.securitySchemes?.some(s=>s.type==='oauth2'&&s.scopes?.includes('openid')),'Missing OAuth declaration: '+tool.name);for(const name of ['read_daily_plan','get_plan_submission'])assert.equal(tools.find(t=>t.name===name).annotations?.readOnlyHint,true);assert.equal(tools.find(t=>t.name==='submit_daily_plan').annotations?.readOnlyHint,false);return {http:r.status,count:tools.length,names,allRequireOAuth:true};}],
 ['anonymous_task_tool',async()=>denied(await mcp('tools/call',{name:'get_task',arguments:{task_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}))],
 ['anonymous_plan_tool',async()=>denied(await mcp('tools/call',{name:'read_daily_plan',arguments:{work_date:day}}))],
 ['anonymous_task_rest',async()=>{const r=await get(base+'/rest/v1/ops_tasks?select=id&limit=1',{headers:{apikey:key}});assert.ok([401,403].includes(r.status),'Anonymous task read must be denied');assert.equal(r.body?.code,'42501');return {http:r.status,code:r.body.code};}],
 ['plan_rpc_route_and_anonymous_denial',async()=>{const params=new URLSearchParams({action:'head',payload:JSON.stringify({work_date:day})});const r=await get(base+'/rest/v1/rpc/ops_morning_plan?'+params,{headers:{apikey:key}});assert.ok([401,403].includes(r.status),'Expected existing RPC to deny anonymous execution');assert.equal(r.body?.code,'42501');return {http:r.status,code:r.body.code,missingRpc:false};}],
 ['published_frontend_hold',async()=>{const r=await get('https://huzshk0707.github.io/Oaktown-ops/');assert.equal(r.status,200);assert.ok(r.text.includes('Oaktown Ops'));assert.equal(r.text.includes('id="focus-deck"'),false,'Frontend release must remain unpublished during hold');return {http:r.status,focusDeckPublished:false};}]
];
(async()=>{
 const startedAt=new Date().toISOString();
 const results=await Promise.allSettled(checks.map(async([name,run])=>({name,passed:true,...await run()})));
 const output=results.map((r,i)=>r.status==='fulfilled'?r.value:{name:checks[i][0],passed:false,error:r.reason?.message||'Request failed'});
 console.log(JSON.stringify({startedAt,completedAt:new Date().toISOString(),mode:'public metadata and unauthenticated denied reads only',passed:output.filter(r=>r.passed).length,total:checks.length,checks:output},null,2));
 if(output.some(r=>!r.passed))process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1});
