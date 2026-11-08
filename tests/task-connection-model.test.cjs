'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../task-connection-model.js');
test('Consent accepts Supabase opaque authorization IDs and rejects path/size injection',()=>{
 const id='AbCdEfGhIjKlMnOpQrStUvWxYz012345';assert.equal(id.length,32);assert.equal(M.authorizationId(id),id);
 assert.equal(M.authorizationId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 for(const invalid of [null,'short','../authorizations/other','a'.repeat(129),'https://untrusted.invalid',id+'?approve=true'])assert.equal(M.authorizationId(invalid),null);
});
test('OAuth redirects accept only registered HTTPS ChatGPT callbacks and preserve the expected path',()=>{
 const callback='https://chatgpt.com/connector/oauth/fictional_callback';
 assert.equal(M.redirect(callback+'?code=fictional',callback),callback+'?code=fictional');
 assert.equal(M.redirect('https://chatgpt.com/connector_platform_oauth_redirect?code=fictional'),'https://chatgpt.com/connector_platform_oauth_redirect?code=fictional');
 for(const u of ['javascript:alert(1)','https://chatgpt.com.attacker.invalid/connector/oauth/x','http://chatgpt.com/connector/oauth/x','https://chatgpt.com:8443/connector/oauth/x','https://staff@chatgpt.com/connector/oauth/x','https://chatgpt.com/arbitrary','https://attacker.invalid/'])assert.throws(()=>M.redirect(u));
 assert.throws(()=>M.redirect('https://chatgpt.com/connector/oauth/other',callback));
});
test('Activity summaries require a coherent server receipt and do not claim present task state',()=>{
 const r={schema_version:'oaktown.task-agent-receipt.v1',task_id:'fictional-id',task:{id:'fictional-id',task_code:'A03',task_title:'Fictional task',status:'in_progress',next_action:'Collect fictional documents'},operation:'update',saved_at:'2099-01-01T10:00:00Z',client_label:'Fictional ChatGPT'};
 assert.deepEqual(M.differences(r),{id:'fictional-id',title:'A03 · Fictional task',status:'in_progress',action:'Collect fictional documents',operation:'update',when:r.saved_at,client:'Fictional ChatGPT'});
 assert.equal(M.differences({...r,task_id:'different'}),null);assert.equal(M.differences({}),null);
});
