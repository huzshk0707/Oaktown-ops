'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Supabase generates a public opaque ID, not its internal UUID primary key.
const AUTH='AbCdEfGhIjKlMnOpQrStUvWxYz012345';
async function setup(page,{admin=true,authorization=false,callback='https://chatgpt.com/connector/oauth/fictional_callback'}={}){
 const state={calls:[],fail:false,hold:null,decision:null,clients:[{client_id:'fictional-chatgpt',label:'Fictional ChatGPT',enabled:true,can_write:true}],
  activity:[{schema_version:'oaktown.task-agent-receipt.v1',proposal_id:'fictional-proposal',task_id:'fictional-task',client_label:'Fictional ChatGPT',operation:'update',saved_at:'2099-01-01T10:00:00Z',task:{id:'fictional-task',task_code:'A03',task_title:'Fictional document collection',status:'in_progress',next_action:'Collect fictional documents'}}]};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();
  if(u.hostname==='chatgpt.com')return route.fulfill({status:200,body:'Fictional OAuth callback'});
  if(u.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(body,status=200)=>route.fulfill({status,headers,body:JSON.stringify(body)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:'example@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'example@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:admin?'admin':'editor',is_active:true}]);
  if(u.pathname==='/rest/v1/rpc/ops_task_agent'){
   const b=req.postDataJSON();state.calls.push(b);if(state.hold)await state.hold;
   if(state.fail)return reply({message:'Fictional API not deployed'},404);
   if(b.action==='connections')return reply({schema_version:'oaktown.task-connection.v1',clients:admin?state.clients:[],can_manage:admin});
   if(b.action==='activity')return reply(state.activity);
   if(b.action==='configure'){state.clients=state.clients.map(c=>c.client_id===b.payload.client_id?b.payload:c);return reply({saved:true})}
   if(b.action==='consent_client')return reply({label:'Fictional ChatGPT',can_write:true});
  }
  if(u.pathname==='/auth/v1/oauth/authorizations/'+AUTH)return reply({authorization_id:AUTH,client:{id:'fictional-chatgpt',name:'Untrusted name <img src=x>'},redirect_uri:callback,scope:'openid email'});
  if(u.pathname==='/auth/v1/oauth/authorizations/'+AUTH+'/consent'){state.decision=req.postDataJSON();return reply({redirect_url:callback+(state.decision.action==='approve'?'?code=fictional-code&state=fictional-state':'?error=access_denied')})}
  return reply([]);
 });
 await page.goto(ORIGIN+'/'+(authorization?'?authorization_id='+AUTH:''));return state;
}
async function signIn(page,consent=false){
 await page.locator(consent?'#task-consent-signin':'#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password-only');await page.locator('#pilot-login').click();
 await expect(page.locator('#today-status')).toContainText('Updated');
}
test('Task connection shows saved receipts without claiming a live ChatGPT link and fits all six themes',async({page})=>{
 const s=await setup(page);await signIn(page);await page.locator('#task-connection>summary').click();
 await expect(page.locator('#task-connection-state')).toHaveText('Client registered');
 await expect(page.locator('#task-connection-status')).toContainText('does not confirm');
 await expect(page.locator('#task-connection-activity')).toContainText('A03 · Fictional document collection');
 await expect(page.locator('#task-connection-activity')).toContainText('Collect fictional documents');
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.getByLabel('Workspace theme').selectOption(theme);
  for(const width of [1440,320]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   if(process.env.OAKTOWN_UI_SCREENSHOTS==='1')await page.locator('#task-connection').screenshot({path:test.info().outputPath(theme+'-'+width+'-workspace.png')});}
 }
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#task-connection-activity')).toBeEmpty();await expect(page.locator('#task-connection-admin')).toBeHidden();
 expect(s.calls.every(c=>['connections','activity'].includes(c.action))).toBe(true);
});
test('Administrator disables a client and verifies saved settings; editor cannot manage connections',async({page})=>{
 const s=await setup(page);await signIn(page);await page.locator('#task-connection>summary').click();
 await expect(page.locator('#task-connection-state')).toHaveText('Client registered');
 await page.locator('#task-connection-admin>summary').click();await page.getByRole('button',{name:'Disable access'}).click();
 await expect(page.locator('#task-connection-status')).toContainText('disabled and verified');expect(s.clients[0].enabled).toBe(false);
 expect(s.calls.filter(c=>c.action==='configure')).toHaveLength(1);
 await page.evaluate(()=>window.OpsCloud.signOut());
});
test('An undeployed task API or failed refresh clears receipts while normal Today remains available',async({page})=>{
 const s=await setup(page,{admin:false});await signIn(page);await page.locator('#task-connection>summary').click();
 await expect(page.locator('#task-connection-activity')).toContainText('Fictional document collection');
 await expect(page.locator('#task-connection-admin')).toBeHidden();s.fail=true;
 await page.locator('#task-connection-refresh').click();await expect(page.locator('#task-connection-state')).toHaveText('Setup required');
 await expect(page.locator('#task-connection-activity')).toBeEmpty();await expect(page.locator('#today-status')).toContainText('Updated');
});
test('A late task-connection response cannot restore private receipts after sign-out',async({page})=>{
 const s=await setup(page);await signIn(page);let release;s.hold=new Promise(r=>{release=r});
 await page.locator('#task-connection>summary').click();await expect(page.locator('#task-connection-status')).toContainText('Checking');
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#task-connection-activity')).toBeEmpty();await expect(page.locator('#task-connection-state')).toHaveText('Sign in');
 await expect(page.locator('#task-connection-clients')).toBeEmpty();await expect(page.locator('#task-connection-refresh')).toBeDisabled();
});
test('OAuth uses the shared staff session, displays scoped consent and honors denial',async({page})=>{
 const s=await setup(page,{authorization:true});await expect(page.locator('#task-consent-dialog')).toBeVisible();
 await expect(page.locator('#task-consent-approve')).toBeDisabled();await signIn(page,true);
 await expect(page.locator('#task-consent-details')).toContainText('Fictional ChatGPT');
 await expect(page.locator('#task-consent-details')).toContainText('save approved task changes');
 await expect(page.locator('#task-consent-details')).toContainText('openid email');
 await page.locator('#task-consent-deny').click();await page.waitForURL('https://chatgpt.com/connector/oauth/fictional_callback?error=access_denied');
 expect(s.decision).toEqual({action:'deny'});expect(s.calls.filter(c=>c.action==='configure'||c.action==='apply')).toHaveLength(0);
});
test('OAuth refuses an untrusted redirect before enabling approval',async({page})=>{
 await setup(page,{authorization:true,callback:'https://untrusted.invalid/callback'});await signIn(page,true);
 await expect(page.locator('#task-consent-message')).toContainText('registered ChatGPT callback');
 await expect(page.locator('#task-consent-approve')).toBeDisabled();await expect(page).toHaveURL(new RegExp('127.0.0.1'));
});
test('OAuth approval requires the user decision and returns only to the registered ChatGPT callback',async({page})=>{
 const s=await setup(page,{authorization:true});await signIn(page,true);
 await expect(page.locator('#task-consent-approve')).toBeEnabled();expect(s.decision).toBeNull();
 await page.locator('#task-consent-approve').click();
 await page.waitForURL('https://chatgpt.com/connector/oauth/fictional_callback?code=fictional-code&state=fictional-state');
 expect(s.decision).toEqual({action:'approve'});expect(s.calls.filter(c=>c.action==='apply')).toHaveLength(0);
});
