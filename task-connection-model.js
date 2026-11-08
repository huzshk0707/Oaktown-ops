/* Public connection metadata and strict consent redirects. No sessions stored. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsTaskConnectionModel=api})(typeof window!=='undefined'?window:null,()=>{
 'use strict';
 const server='https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp';
 function authorizationId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(value)?value:null}
 function redirect(value,expected){
  let u;try{u=new URL(value)}catch{throw Error('Invalid OAuth return address')}
  if(u.protocol!=='https:'||u.hostname!=='chatgpt.com'||u.port||u.username||u.password||
    !(u.pathname==='/connector_platform_oauth_redirect'||/^\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(u.pathname)))
   throw Error('OAuth return address must be the registered ChatGPT callback');
  if(expected){const e=new URL(expected);if(e.origin!==u.origin||e.pathname!==u.pathname)throw Error('OAuth return address changed')}
  return u.href;
 }
 function differences(receipt){
  const t=receipt?.task;if(!t||receipt.schema_version!=='oaktown.task-agent-receipt.v1'||receipt.task_id!==t.id)return null;
  return {id:t.id,title:(t.task_code?t.task_code+' · ':'')+(t.task_title||'Task'),status:t.status,
   action:t.next_action||'',operation:receipt.operation,when:receipt.saved_at,client:receipt.client_label||'ChatGPT'};
 }
 return Object.freeze({server,authorizationId,redirect,differences});
});
