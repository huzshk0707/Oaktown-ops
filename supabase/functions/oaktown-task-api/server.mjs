import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {z} from 'zod';
import {createVerifier,RESOURCE} from './auth.mjs';

const nullableFields=['assigned_label','next_action','waiting_on','blocked_reason','completion_summary','due','follow_up'];
const date=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.null(),timezone:z.literal('America/New_York'),original_text:z.string().min(1).max(2000)}).strict();
const changes=z.object({task_title:z.string().min(1).max(200),status:z.enum(['pending','in_progress','waiting','blocked','completed','cancelled']),
 priority:z.enum(['low','normal','high','urgent']),assigned_label:z.string().min(1).max(120),next_action:z.string().min(1).max(2000),
 waiting_on:z.string().min(1).max(120),blocked_reason:z.string().min(1).max(1200),completion_summary:z.string().min(1).max(2000),
 work_level:z.string().min(1).max(90),due:date,follow_up:date}).partial().strict();
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const result=data=>({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
export function verifiedReceipt(receipt,task){
 return receipt?.schema_version==='oaktown.task-agent-receipt.v1'&&receipt.task_id===task?.id&&
  receipt.task?.id===task.id&&canonical(receipt.task)===canonical(task);
}
export function createHandler({supabaseUrl,publishableKey,resource=RESOURCE,fetchImpl=fetch,verifyToken=null}){
 const base=resource.replace(/\/mcp$/,'');
 const verify=verifyToken||createVerifier(supabaseUrl,resource);
 const origins=new Set(['https://chatgpt.com','https://chat.openai.com','https://huzshk0707.github.io']);
 const challenge='Bearer resource_metadata="'+base+'/.well-known/oauth-protected-resource", scope="openid"';
 function response(body,status=200,extra={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store',...extra}})}
 return async req=>{
  const origin=req.headers.get('origin'),url=new URL(req.url);
  if(origin&&!origins.has(origin))return response({error:'Origin not allowed'},403);
  const cors=origin?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'Authorization,Content-Type,MCP-Protocol-Version,Mcp-Session-Id','access-control-allow-methods':'GET,POST,OPTIONS','access-control-expose-headers':'WWW-Authenticate,MCP-Protocol-Version'}:{};
  const finish=r=>{for(const [k,v] of Object.entries(cors))r.headers.set(k,v);return r};
  if(req.method==='OPTIONS')return finish(new Response(null,{status:204}));
  if(url.pathname.endsWith('/.well-known/oauth-protected-resource')&&req.method==='GET')
   return finish(response({resource,authorization_servers:[supabaseUrl+'/auth/v1'],scopes_supported:['openid'],bearer_methods_supported:['header'],resource_name:'Oaktown Ops task connection'}));
  if(url.pathname.endsWith('/health')&&req.method==='GET')return finish(response({status:'ok',version:'1.0.0',authentication:'scoped-oauth-required',resource}));
  if(!url.pathname.endsWith('/oaktown-task-api/mcp'))return finish(response({error:'Not found'},404));
  if(req.method!=='POST')return finish(response({error:'Use stateless Streamable HTTP POST'},405,{'Allow':'POST,OPTIONS'}));
  let token=null,identity;
  async function authorize(){
   if(identity)return identity;
   const match=/^Bearer (\S+)$/i.exec(req.headers.get('authorization')||'');
   if(!match)throw Object.assign(Error('Sign in to your Oaktown task connection'),{auth:true});
   try{identity=await verify(match[1]);token=match[1];return identity;}
   catch{throw Object.assign(Error('Reconnect with a valid scoped Oaktown staff session'),{auth:true});}
  }
  async function rpc(action,payload){
   await authorize();
   const r=await fetchImpl(supabaseUrl+'/rest/v1/rpc/ops_task_agent',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,payload})});
   const data=await r.json();
   if(!r.ok){
    const safe=['22023','40001','42501','P0002'].includes(data.code);
    throw Object.assign(Error(safe?data.message:'Task operation could not be confirmed'),{code:data.code||'upstream_error'});
   }
   return data;
  }
  async function tool(fn){
   try{return result(await fn());}catch(e){
    return {...result({error:e.auth?'authentication_required':e.code||'request_failed',message:e.auth?e.message:(e.message||'Request could not be confirmed')}),isError:true,
     ...(e.auth?{_meta:{'mcp/www_authenticate':[challenge]}}:{})};
   }
  }
  const server=new McpServer({name:'oaktown-ops-tasks',version:'1.0.0'});
  const security={securitySchemes:[{type:'oauth2',scopes:['openid']}]};
  const read={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
  function register(name,title,description,inputSchema,annotations,fn){
   server.registerTool(name,{title,description,inputSchema,annotations,_meta:security},args=>tool(()=>fn(args)));
  }
  register('search_tasks','Find Oaktown tasks','Find exact saved tasks. task_code is an exact code; query searches titles. Returns at most 25 records and an explicit has_more flag. Never guess an ID or match when multiple tasks fit.',
   {query:z.string().max(120).optional(),task_code:z.string().regex(/^[MWA]\d{2}$/).optional()},read,async args=>{
    const items=await rpc('search',args);if(!Array.isArray(items))throw Error('Task search not confirmed');return {tasks:items.slice(0,25),has_more:items.length>25};
   });
  register('get_task','Read a saved task','Read the exact task and its current updated_at version before proposing any change. Archived records are readable but cannot be edited.',
   {task_id:z.string().uuid()},read,async args=>({task:await rpc('get',args)}));
  register('get_task_history','Read task history','Read the latest 50 task journal summaries. This does not expose the private intake ledger or fabricate work/time entries.',
   {task_id:z.string().uuid()},read,async args=>({events:await rpc('history',args),limit:50}));
  register('preview_task_change','Prepare a task change for review',
   'Prepare one create or update proposal. This stores a temporary review proposal, not a task change. Use a unique request_ref per intended change and reuse it unchanged on retry. For updates, use the exact saved task ID/version. Show before, after, all clears and source_note to the user; ask for approval before apply_task_change. New tasks are General operations; portfolio relationships stay unchanged. Dates must be explicitly reported date-only values. Never infer a completion, deadline, payment, signing or time spent.',
   {operation:z.enum(['create','update']),request_ref:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),task_id:z.string().uuid().optional(),
    expected_updated_at:z.string().datetime({offset:true}).optional(),changes,clear_fields:z.array(z.enum(nullableFields)).max(9),source_note:z.string().min(1).max(2000)},
   {readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},args=>rpc('preview',args));
  register('apply_task_change','Save an approved task change',
   'Call only after the user approves the exact preview. Supply the server-issued proposal_id, preview_token and confirmation unchanged, with reviewed=true. This writes the task and audit event once, then independently reads back every returned task field. Retry only the identical proposal if the response is lost; never create a second request to retry a save. An unverified outcome is not success.',
   {proposal_id:z.string().uuid(),preview_token:z.string().uuid(),reviewed:z.literal(true),confirmation:z.string().regex(/^APPLY [0-9a-f-]{36}$/)},
   {readOnlyHint:false,destructiveHint:true,idempotentHint:true,openWorldHint:false},async args=>{
    let receipt;
    try{receipt=await rpc('apply',args)}catch(e){
     if(e.auth||['22023','40001','42501','P0002'].includes(e.code))throw e;
     return {outcome:'unknown',verified:false,proposal_id:args.proposal_id,message:'Save outcome is unknown. Retry only this identical approved proposal or check the saved task; do not create a duplicate proposal.'};
    }
    if(receipt?.schema_version!=='oaktown.task-agent-receipt.v1'||receipt.proposal_id!==args.proposal_id||!receipt.task_id)
     return {outcome:'unknown',verified:false,proposal_id:args.proposal_id,message:'Receipt not confirmed. Retry this identical approved proposal.'};
    try{
     const saved=await rpc('get',{task_id:receipt.task_id});
     if(!verifiedReceipt(receipt,saved))throw Error('Saved record differs from the receipt');
     return {outcome:'saved',verified:true,receipt};
    }catch{
     return {outcome:'saved_unverified',verified:false,receipt,message:'The server returned a save receipt, but current record read-back did not match. Retrieve the task and check its history before any new change.'};
    }
   });
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true,maxRequestBodySize:32000});
  try{
   await server.connect(transport);
   // ChatGPT's registration probe currently sends Accept: */* rather than
   // listing both MCP response media types. A wildcard accepts both per HTTP,
   // but the upstream SDK checks for the literal media type strings and
   // rejects it with HTTP 406. Normalize wildcard negotiation *only* for the
   // MCP transport. Do not change authentication, request body or Origin.
   const accepts=(req.headers.get('accept')||'').split(',');
   const acceptsWildcard=accepts.some(value=>value.split(';')[0].trim().toLowerCase()==='*/*');
   let transportReq=req;
   if(!req.headers.has('accept')||acceptsWildcard){
    const headers=new Headers(req.headers);
    headers.set('Accept','application/json, text/event-stream');
    transportReq=new Request(req,{headers});
   }
   const r=await transport.handleRequest(transportReq);
   // JSON responses are complete before closure; no sessions or user state leak
   // between requests on the reused Edge Function worker.
   const body=await r.arrayBuffer();await server.close();
   return finish(new Response(body,{status:r.status,headers:r.headers}));
  }catch{
   await server.close().catch(()=>{});return finish(response({error:'Invalid MCP request'},400,{'WWW-Authenticate':challenge}));
  }
 };
}
