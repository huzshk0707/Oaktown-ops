'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});
test.setTimeout(60000);
const ORIGIN='http://127.0.0.1:8765';
const CLOUD_HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROPERTY='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LEAD_A='11111111-1111-4111-8111-111111111111';
const LEAD_B='22222222-2222-4222-8222-222222222222';
const clone=value=>JSON.parse(JSON.stringify(value));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};}
function gate(){return {started:deferred(),release:deferred()};}
function isHistory(response,id){const u=new URL(response.url());return u.hostname===CLOUD_HOST&&u.pathname==='/rest/v1/lead_messages'&&u.searchParams.get('lead_id')==='eq.'+id;}
async function settleResponse(response){
 await response.finished();
 // Allow the fetch continuation and resulting UI update to run before checking a stale-response absence.
 await response.request().frame().evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function setup(page,{signedIn=false,futureCloud=false}={}){
 const state={
  email:'',passwordLogins:0,leadCalls:[],nextDialog:'accept',dialogs:[],
  testSwitchApplied:false,writeGate:null,historyGates:new Map(),writeNumber:0,
  properties:[{id:PROPERTY,street_address:'100 Fictional Lane',unit:'',city:'Example City',state:'KY',postal_code:'40201',landlord_entity:null,updated_at:'2026-10-01T00:00:00Z'}],
  leads:[
   {id:LEAD_A,full_name:'Fictional Prospect A',source:'Zillow',status:'new',primary_property_id:PROPERTY,screening:{income:'6000',incomeBasis:'gross_monthly_household',residence:'Renting for two years',pets:'None',adverse:'None',walkthrough:'Yes',assistanceAnimal:'no',voucher:'no',availability:'ready',askingRent:'1850',rentVerified:true},updated_at:'2026-10-01T00:00:00Z'},
   {id:LEAD_B,full_name:'Fictional Prospect B',source:'Email',status:'waiting',primary_property_id:PROPERTY,screening:{income:'7000'},updated_at:'2026-10-02T00:00:00Z'}
  ],
  histories:{
   [LEAD_A]:[{direction:'tenant',body:'Fictional private message for prospect A only.',created_at:'2026-10-01T10:00:00Z'}],
   [LEAD_B]:[{direction:'tenant',body:'Fictional private message for prospect B only.',created_at:'2026-10-02T10:00:00Z'}]
  }
 };
 page.on('dialog',async dialog=>{
  state.dialogs.push({type:dialog.type(),message:dialog.message()});
  const action=state.nextDialog;state.nextDialog='accept';
  if(action==='dismiss')await dialog.dismiss();else await dialog.accept();
 });
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===ORIGIN){
   if(futureCloud&&url.pathname==='/leads.js'){
    const response=await route.fetch(),original=await response.text();
    const disabled='const CLOUD_LEADS_ENABLED = false;';
    expect(original).toContain(disabled);
    state.testSwitchApplied=true;
    return route.fulfill({response,body:original.replace(disabled,'const CLOUD_LEADS_ENABLED = true;')});
   }
   return route.continue();
  }
  // No request may reach the real Supabase service or another remote host.
  if(url.hostname!==CLOUD_HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const path=url.pathname;
  if(path==='/auth/v1/token'){
   if(url.searchParams.get('grant_type')==='password')state.passwordLogins++;
   return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:state.email}});
  }
  if(path==='/auth/v1/user')return reply({id:USER,email:state.email});
  if(path==='/auth/v1/logout')return reply({});
  if(path==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:'admin',is_active:true}]);
  if(path==='/rest/v1/properties')return reply(state.properties);
  if(path==='/rest/v1/property_addressees')return reply([{property_id:PROPERTY,notice_addressee_text:'Fictional Resident & All Occupants'}]);
  if(path==='/rest/v1/leads'||path==='/rest/v1/lead_messages'){
   const call={path,method:req.method(),query:url.search,body:req.method()==='GET'?null:req.postDataJSON()};
   state.leadCalls.push(call);
   if(path==='/rest/v1/leads'){
    if(req.method()==='GET')return reply(clone(state.leads));
    const waiting=state.writeGate;
    if(waiting){state.writeGate=null;waiting.started.resolve();await waiting.release.promise;}
    const id=(url.searchParams.get('id')||'').replace(/^eq\./,'')||'33333333-3333-4333-8333-333333333333';
    const prior=state.leads.find(l=>l.id===id)||{};
    const saved={...prior,...call.body,id,updated_at:'2026-10-26T10:00:'+String(++state.writeNumber).padStart(2,'0')+'Z'};
    state.leads=state.leads.filter(l=>l.id!==id);state.leads.push(saved);
    return reply([saved]);
   }
   if(req.method()==='GET'){
    const id=(url.searchParams.get('lead_id')||'').replace(/^eq\./,'');
    const waiting=state.historyGates.get(id);
    if(waiting){state.historyGates.delete(id);waiting.started.resolve();await waiting.release.promise;}
    return reply(state.histories[id]||[]);
   }
   const message={direction:call.body.direction,body:call.body.body,created_at:'2026-10-26T10:00:00Z'};
   (state.histories[call.body.lead_id] ||= []).unshift(message);
   return reply({});
  }
  return reply({message:'Unexpected mocked endpoint: '+path},500);
 });
 await page.goto(ORIGIN+'/');
 await expect(page.locator('#account-dialog')).toBeVisible();
 if(signedIn){
  state.email=await page.locator('#pilot-email').inputValue();
  await page.locator('#pilot-password').fill('fictional-test-password');
  await page.locator('#pilot-login').click();
  await expect(page.locator('#account-dialog')).not.toBeVisible();
  await expect(page.locator('#account-button')).toContainText('Signed in');
 }else await page.locator('#account-close').click();
 await page.locator('[data-workspace="leads"]').click();
 await expect(page.locator('#leads-workflow')).toBeVisible();
 if(signedIn)await expect(page.locator('#lead-property option[value="'+PROPERTY+'"]')).toHaveCount(1);
 if(futureCloud){
  expect(state.testSwitchApplied).toBe(true);
  await expect(page.locator('#lead-saved-list option[value="'+LEAD_B+'"]')).toHaveCount(1);
 }
 return state;
}
async function openLead(page,id){
 await page.locator('#lead-saved-list').selectOption(id);
 await expect(page.locator('#lead-name')).toHaveValue(id===LEAD_A?'Fictional Prospect A':'Fictional Prospect B');
}

test('production sandbox makes no lead or message requests even after shared sign-in',async({page})=>{
 const state=await setup(page,{signedIn:true});
 await page.locator('#lead-property').selectOption(PROPERTY);
 await page.locator('#lead-name').fill('Fictional sandbox prospect');
 await page.locator('#lead-incoming').fill('Fictional test message only.');
 for(const id of ['lead-save','lead-save-message','lead-refresh']){
  await page.locator('#'+id).click();
  await expect(page.locator('#lead-save-status')).toContainText(/disabled|test-only/i);
 }
 expect(state.testSwitchApplied).toBe(false);
 expect(state.leadCalls).toEqual([]);
 await expect(page.locator('#account-dialog')).not.toBeVisible();
});

test('test draft requests no identity document and suggestions require confirmation',async({page})=>{
 await setup(page);
 await page.locator('#lead-draft').click();
 await expect(page.locator('#lead-response')).toHaveValue(/^\[TEST DRAFT/);
 await expect(page.locator('#lead-response')).not.toHaveValue(/license|lock\s?box|Home is available and ready/i);
 await expect(page.locator('#lead-flags')).toContainText('availability has not been verified');
 await page.locator('#lead-incoming').fill('Our monthly income is $6,000 and we have one dog. We rent now.');
 await page.locator('#lead-detect').click();
 const income=page.locator('.lead-candidate').filter({hasText:'income →'});
 await expect(income).toHaveCount(1);
 await expect(page.locator('#lead-income')).toHaveValue('');
 await income.getByRole('button',{name:'Confirm & apply'}).click();
 await expect(page.locator('#lead-income')).toHaveValue(/^6,?000$/);
 await expect(page.locator('#lead-incomeBasis')).toHaveValue('unknown');
});

test('reviewed reply survives unrelated edits and cancelled regeneration',async({page})=>{
 const state=await setup(page);
 const reviewed='My fictional reviewed reply. Preserve this exact wording.';
 await page.locator('#lead-response').fill(reviewed);
 await page.locator('#lead-name').fill('Fictional Draft');
 await page.locator('#lead-source').selectOption('Email');
 await page.locator('#lead-status').selectOption('waiting');
 await expect(page.locator('#lead-response')).toHaveValue(reviewed);
 state.nextDialog='dismiss';
 await page.locator('#lead-draft').click();
 await expect(page.locator('#lead-response')).toHaveValue(reviewed);
 state.nextDialog='accept';
 await page.locator('#lead-draft').click();
 await expect(page.locator('#lead-response')).toHaveValue(/^\[TEST DRAFT/);
 await expect(page.locator('#lead-response')).not.toHaveValue(reviewed);
});

test('mobile layout fits 390px and existing v0.4 workflows still navigate',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const state=await setup(page,{signedIn:true});
 await expect(page.locator('#lead-incoming')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const box=await page.locator('#lead-incoming').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(391);
 await page.locator('[data-workspace="notices"]').click();
 await expect(page.locator('#notices-workflow')).toBeVisible();
 await expect(page.locator('#leads-workflow')).not.toBeVisible();
 await page.locator('[data-notice-tab="message"]').click();
 await expect(page.locator('#tenant-message-text')).toBeVisible();
 await page.locator('[data-notice-tab="court"]').click();
 await expect(page.locator('#court-form')).toBeVisible();
 await page.locator('[data-workspace="properties"]').click();
 await expect(page.locator('#ops-portfolio-panel')).toBeVisible();
 expect(state.passwordLogins).toBe(1);
 expect(state.leadCalls).toEqual([]);
});

test('future mocked records reset stale listing facts; New cancel retains work and history',async({page})=>{
 const state=await setup(page,{signedIn:true,futureCloud:true});
 await openLead(page,LEAD_A);
 await expect(page.locator('#lead-message-history')).toContainText('prospect A only');
 await expect(page.locator('#lead-income')).toHaveValue('6000');
 await expect(page.locator('#lead-availability')).toHaveValue('unknown');
 await expect(page.locator('#lead-rent')).toHaveValue('');
 await expect(page.locator('#lead-rent-verified')).not.toBeChecked();
 await page.locator('#lead-incoming').fill('Unsaved fictional follow-up.');
 state.nextDialog='dismiss';
 await page.locator('#lead-clear').click();
 await expect(page.locator('#lead-name')).toHaveValue('Fictional Prospect A');
 await expect(page.locator('#lead-incoming')).toHaveValue('Unsaved fictional follow-up.');
 await expect(page.locator('#lead-message-history')).toContainText('prospect A only');
 state.nextDialog='accept';
 await page.locator('#lead-clear').click();
 await expect(page.locator('#lead-name')).toHaveValue('');
 await expect(page.locator('#lead-incoming')).toHaveValue('');
 await expect(page.locator('#lead-message-history')).toBeEmpty();
});

test('future mocked write locks record switching and keeps its original identity',async({page})=>{
 const state=await setup(page,{signedIn:true,futureCloud:true});
 await openLead(page,LEAD_A);
 await page.locator('#lead-income').fill('6500');
 const waiting=gate();state.writeGate=waiting;
 await page.locator('#lead-save').click();
 await waiting.started.promise;
 try{
  await expect(page.locator('#lead-save')).toBeDisabled();
  await expect(page.locator('#lead-clear')).toBeDisabled();
  await expect(page.locator('#lead-saved-list')).toBeDisabled();
  await expect(page.locator('#lead-name')).toBeDisabled();
  await expect(page.locator('#lead-save-message')).toBeDisabled();
 }finally{waiting.release.resolve();}
 await expect(page.locator('#lead-save')).toBeEnabled();
 await expect(page.locator('#lead-save-status')).toContainText('Lead saved privately');
 const writes=state.leadCalls.filter(c=>c.path==='/rest/v1/leads'&&c.method!=='GET');
 expect(writes).toHaveLength(1);
 expect(writes[0].query).toContain('id=eq.'+LEAD_A);
 expect(writes[0].body.screening.income).toBe('6500');
 await openLead(page,LEAD_B);
 await expect(page.locator('#lead-income')).toHaveValue('7000');
});

test('future mocked history ignores delayed replies after selection changes and logout',async({page})=>{
 const state=await setup(page,{signedIn:true,futureCloud:true});
 const old=gate();state.historyGates.set(LEAD_A,old);
 await openLead(page,LEAD_A);
 await old.started.promise;
 await openLead(page,LEAD_B);
 await expect(page.locator('#lead-message-history')).toContainText('prospect B only');
 const staleResponse=page.waitForResponse(r=>isHistory(r,LEAD_A));
 old.release.resolve();
 await settleResponse(await staleResponse);
 await expect(page.locator('#lead-message-history')).toContainText('prospect B only');
 await expect(page.locator('#lead-message-history')).not.toContainText('prospect A only');

 const afterLogout=gate();state.historyGates.set(LEAD_A,afterLogout);
 await openLead(page,LEAD_A);
 await afterLogout.started.promise;
 await page.locator('#account-button').click();
 await page.locator('#pilot-logout').click();
 await expect(page.locator('#pilot-login')).toBeVisible();
 await expect(page.locator('#lead-name')).toHaveValue('');
 const lateResponse=page.waitForResponse(r=>isHistory(r,LEAD_A));
 afterLogout.release.resolve();
 await settleResponse(await lateResponse);
 await expect(page.locator('#lead-message-history')).toBeEmpty();
 await expect(page.locator('#lead-saved-list option')).toHaveCount(1);
});
