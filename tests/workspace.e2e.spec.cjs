'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});test.setTimeout(60000);
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',PROPERTY='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',BATCH='cccccccc-cccc-4ccc-8ccc-cccccccccccc',CREATED='dddddddd-dddd-4ddd-8ddd-dddddddddddd',UNIT='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const clone=x=>JSON.parse(JSON.stringify(x));
async function setup(page){
 const s={email:'',logins:0,refreshes:0,batch:null,writes:[],propertyWrites:[],conflict:false,offline:false,approved:true,resetRequests:[],passwordUpdates:[],
 properties:[{id:PROPERTY,street_address:'100 Fictional Lane',unit:'',city:'Example City',state:'KY',postal_code:'40201',landlord_entity:null,updated_at:'2026-10-01T00:00:00Z'}],
 people:[{property_id:PROPERTY,notice_addressee_text:'Example Resident & All Occupants'}],
 units:[{id:UNIT,property_id:PROPERTY,unit_code:'UNIT-1000',unit_label:'MAIN',unit_class:'residential',occupancy_status:'Leased'}],
 contacts:[{id:'11111111-1111-4111-8111-111111111111',display_name:'Alex Example',email:'alex@example.invalid',contact_verification:'unverified'}],
 leases:[{id:'22222222-2222-4222-8222-222222222222',unit_id:UNIT,tenancy_id:'33333333-3333-4333-8333-333333333333',term_start:'2026-01-01',term_end:'2026-12-31',lease_status:'imported',verification_status:'unverified'}],
 parties:[{tenancy_id:'33333333-3333-4333-8333-333333333333',person_id:'11111111-1111-4111-8111-111111111111',party_role:'tenant'}],
 tenancies:[{id:'33333333-3333-4333-8333-333333333333',unit_id:UNIT,status:'Current'}]};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===ORIGIN)return route.continue();if(url.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const p=url.pathname;
  if(p==='/auth/v1/token'){url.searchParams.get('grant_type')==='password'?s.logins++:s.refreshes++;return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:s.email}})}
  if(p==='/auth/v1/recover'){s.resetRequests.push(req.postDataJSON());return reply({})}
  if(p==='/auth/v1/user'&&req.method()==='PUT'){s.passwordUpdates.push(req.postDataJSON());return reply({id:USER,email:s.email})}
  if(p==='/auth/v1/user')return reply({id:USER,email:s.email});
  if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships'){if(s.holdMembership){s.membershipWaiting=true;await s.holdMembership;}return reply([{role:'admin',is_active:s.approved}]);}
  if(p==='/rest/v1/properties')return reply(s.properties);
  if(p==='/rest/v1/units')return reply(s.units);
  if(p==='/rest/v1/property_addressees')return reply(s.people);
  if(p==='/rest/v1/people')return reply(s.contacts);
  if(p==='/rest/v1/leases')return reply(s.leases);
  if(p==='/rest/v1/tenancy_people')return reply(s.parties);
  if(p==='/rest/v1/tenancies')return reply(s.tenancies);
  if(['/rest/v1/bookings','/rest/v1/renewal_cases','/rest/v1/ops_tasks','/rest/v1/ops_events'].includes(p))return reply([]);
  if(p==='/rest/v1/notice_batches'){if(!s.batch)return reply([]);if(url.searchParams.has('id'))return reply([s.batch]);const{id,title,version,updated_at}=s.batch;return reply([{id,title,version,updated_at}]);}
  if(p==='/rest/v1/rpc/save_notice_batch'){
   const b=req.postDataJSON();s.writes.push(clone(b));if(s.holdSave)await s.holdSave;
   if(s.conflict)return reply({code:'40001',message:'This batch changed elsewhere. Open the latest saved batch before saving again.'},409);
   s.batch={id:b.p_id||BATCH,title:b.p_title,payload:clone(b.p_payload),version:(s.batch?.version||0)+1,updated_at:'2026-10-26T10:00:00Z'};
   const{id,title,version,updated_at}=s.batch;return reply({id,title,version,updated_at});
  }
  if(p==='/rest/v1/rpc/save_property'){
   if(s.offline)return route.abort('internetdisconnected');
   const b=req.postDataJSON();s.propertyWrites.push(clone(b));if(s.holdProperty)await s.holdProperty;const d=b.p_data;
   const property={id:b.p_id||CREATED,...d,updated_at:'2026-10-26T10:00:00Z'};delete property.tenant;
   s.properties=s.properties.filter(p=>p.id!==property.id).concat(property);s.people=s.people.filter(p=>p.property_id!==property.id).concat({property_id:property.id,notice_addressee_text:d.tenant});
   return reply({property,notice_addressee_text:d.tenant});
  }
  return reply({message:'Unexpected mocked request: '+p},500);
 });
 page.on('dialog',d=>d.accept());
 await page.goto(ORIGIN+'/');await expect(page.locator('#staff-access')).toBeVisible();await page.locator('#staff-access-signin').click();await expect(page.locator('#account-dialog')).toBeVisible();
 s.email='tester@example.invalid';await page.locator('#pilot-email').fill(s.email);
 await page.locator('#pilot-password').fill('fictional-password-only');await page.locator('#pilot-login').click();
 await expect(page.locator('#account-dialog')).not.toBeVisible();await expect(page.locator('#account-button')).toContainText('Signed in');return s;
}
async function importProperty(page){
 await page.locator('[data-workspace="notices"]').click();
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await page.locator('#notice-picker-make').click();
 await expect(page.frameLocator('#studio-frame').locator('#tenant')).toHaveValue('Example Resident & All Occupants');
}
test('shared sign-in survives nested workflow navigation, reload and refresh',async({page})=>{
 const s=await setup(page);
 await expect(page.locator('.sidebar [data-workspace="message"],.sidebar [data-workspace="court"]')).toHaveCount(0);
 await page.locator('[data-workspace="properties"]').click();await expect(page.locator('#ops-portfolio-panel')).toBeVisible();
 await page.locator('[data-workspace="notices"]').click();await page.locator('[data-notice-tab="message"]').click();await expect(page.locator('#tenant-message-text')).toBeVisible();
 await expect(page.locator('[data-notice-tab="court"],#court-form')).toHaveCount(0);
 await page.reload();await expect(page.locator('#account-button')).toContainText('Signed in');expect(s.logins).toBe(1);
 await page.evaluate(()=>{const key='oaktown-session-v04',v=JSON.parse(localStorage.getItem(key));v.expires_at=1;localStorage.setItem(key,JSON.stringify(v))});
 await page.reload();await expect(page.locator('#account-button')).toContainText('Signed in');expect(s.refreshes).toBe(1);expect(s.logins).toBe(1);
 await page.locator('#account-button').click();await page.locator('#pilot-logout').click();await expect(page.locator('#staff-access-signin')).toBeVisible();
 await page.reload();await expect(page.locator('#staff-access-signin')).toBeVisible();expect(s.logins).toBe(1);
});
test('historical court details survive local JSON import and reload without cloud saving',async({page})=>{
 const state=await setup(page);await importProperty(page);
 const frame=page.frameLocator('#studio-frame');
 await expect(page.locator('[data-notice-tab="court"],#court-form,#cloud-open,#cloud-save,#batch-dialog')).toHaveCount(0);
 const legacy={authorized:true,confirmed:true,reference:'Historical fictional court note',courtDate:'2026-11-20',
  courtTime:'09:30',timezone:'America/New_York',reminderDate:'2026-11-18',owner:'Example Coordinator',notes:'Archived'};
 const payload=await page.evaluate(()=>new Promise(resolve=>{
  const child=document.getElementById('studio-frame').contentWindow,requestId='snapshot-test';
  function on(event){if(event.data?.requestId===requestId&&event.data.type==='oaktown-workspace-snapshot'){
   window.removeEventListener('message',on);resolve(event.data.payload);}}
  window.addEventListener('message',on);child.postMessage({type:'oaktown-workspace-request',requestId},location.origin);
 }));
 payload.notices.at(-1).court=legacy;
 await frame.locator('#fileInput').setInputFiles({name:'historical-notice-batch.json',
   mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
 await page.reload();
 const persisted=await frame.locator('#noticeList .chip').count();
 expect(persisted).toBeGreaterThan(0);
 const court=await frame.locator('#noticeList').evaluate(()=>{
  for(const key of Object.keys(localStorage)){
   try{const p=JSON.parse(localStorage.getItem(key));if(Array.isArray(p?.notices))
    return p.notices.at(-1).court;}catch{}
  }
 });
 expect(court).toEqual(legacy);
 expect(state.writes).toHaveLength(0);
});

test('Tenant message shows exact unit-linked email next to Copy message and clears it on sign-out',async({page})=>{
 await setup(page);await importProperty(page);
 const frame=page.frameLocator('#studio-frame');
 await expect.poll(()=>page.evaluate(()=>window.OpsPortfolio?.getData()?.people?.length||0)).toBe(1);
 await frame.locator('#tenant').fill('Alex Example');
 await page.locator('[data-notice-tab="message"]').click();
 await expect(page.locator('#tenant-email-value')).toHaveText('alex@example.invalid');
 await expect(page.locator('#tenant-email-note')).toContainText('verify');
 await expect(page.locator('#copy-message')).toBeVisible();
 await page.locator('[data-notice-tab="notices"]').click();
 await frame.locator('#tenant').fill('Other Example');
 await page.locator('[data-notice-tab="message"]').click();
 await expect(page.locator('#tenant-email-value')).toContainText('No matching tenant email');
 await page.locator('#account-button').click();await page.locator('#pilot-logout').click();
 await expect(page.locator('#tenant-email-value')).toContainText('Sign in to view tenant email');
 await expect(page.locator('#tenant-email-value')).not.toContainText('alex@example.invalid');
});
test('Notices remain local without cloud actions and retain edits after reload',async({page})=>{
 const state=await setup(page);await importProperty(page);
 await expect(page.locator('#cloud-save,#cloud-open,#cloud-status,#batch-title')).toHaveCount(0);
 const frame=page.frameLocator('#studio-frame');
 await frame.locator('#tenant').fill('Updated fictional resident');
 await page.reload();
 await expect(frame.locator('#tenant')).toHaveValue('Updated fictional resident');
 expect(state.writes).toHaveLength(0);
});

test('property writes validate fields and retain edits on network failure',async({page})=>{
 const s=await setup(page);await page.locator('[data-workspace="properties"]').click();await page.locator('#legacy-address-manager > summary').click();await page.locator('#property-new').click();await page.locator('#property-save').click();expect(s.propertyWrites).toHaveLength(0);
 for(const[k,v]of Object.entries({street_address:'200 Fictional Court',unit:'Unit B',city:'Example City',state:'KY',postal_code:'40202',landlord_entity:'Example Property Company',tenant:'Fictional Household & All Occupants'}))await page.locator('#prop-'+k).fill(v);
 await page.locator('#property-save').click();await expect(page.locator('#property-status')).toContainText('Saved to shared property records.');expect(s.propertyWrites).toHaveLength(1);
 await expect(page.locator('#pilot-property option')).toHaveCount(3);await page.locator('#pilot-property').selectOption('1');await page.locator('#property-edit').click();
 await page.locator('#prop-unit').fill('Unit C');s.offline=true;await page.locator('#property-save').click();await expect(page.locator('#property-status')).toContainText(/failed|fetch|network/i);
 await expect(page.locator('#prop-unit')).toHaveValue('Unit C');expect(s.properties.find(p=>p.id===CREATED).unit).toBe('Unit B');
});
test('revoked membership blocks a restored session',async({page})=>{
 const s=await setup(page);s.approved=false;await page.reload();await expect(page.locator('#staff-access-signin')).toBeVisible();
 await expect(page.locator('#pilot-auth-status')).toContainText('not approved');await expect(page.locator('#pilot-properties')).not.toBeVisible();
});
test('pending property saves lock actions that could switch their targets',async({page})=>{
 const s=await setup(page);
 await page.locator('[data-workspace="properties"]').click();await page.locator('#legacy-address-manager > summary').click();
 await page.locator('#pilot-property').selectOption('0');await page.locator('#property-edit').click();
 await page.locator('#prop-unit').fill('Test unit');
 let release;s.holdProperty=new Promise(resolve=>release=resolve);
 await page.locator('#property-save').click();
 await expect.poll(()=>s.propertyWrites.length).toBe(1);
 await expect(page.locator('#property-new')).toBeDisabled();
 await expect(page.locator('#property-edit')).toBeDisabled();
 await expect(page.locator('#prop-street_address')).toBeDisabled();
 release();await expect(page.locator('#property-status')).toContainText('Saved to shared property records.');
 await expect(page.locator('#property-new')).toBeEnabled();
});

test('a delayed account verification cannot restore a signed-out session',async({page})=>{
 const s=await setup(page);let release;s.holdMembership=new Promise(resolve=>release=resolve);
 await page.reload();await expect.poll(()=>s.membershipWaiting).toBe(true);
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#account-label')).toHaveText('Sign in');await expect(page.locator('#staff-access-signin')).toBeVisible();
 await page.reload();await expect(page.locator('#staff-access-signin')).toBeVisible();expect(s.logins).toBe(1);
});
test('workflow navigation fits a narrow screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 await page.locator('[data-notice-tab="message"]').click();await expect(page.locator('#tenant-email-value')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-workspace="properties"]').click();await page.locator('#legacy-address-manager > summary').click();await expect(page.locator('#property-form')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Make Notices supports multiple units at one address with missing recipients',async({page})=>{
 const data=await setup(page);
 data.properties[0].street_address='1106 Fictional Road';
 data.people=[];
 data.units=[
  {id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',property_id:PROPERTY,unit_code:'UNIT-A',unit_label:'1',unit_class:'residential',occupancy_status:'Leased'},
  {id:'ffffffff-ffff-4fff-8fff-ffffffffffff',property_id:PROPERTY,unit_code:'UNIT-B',unit_label:'8',unit_class:'residential',occupancy_status:'Vacant'}
 ];
 await page.locator('#notice-picker-refresh').click();
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(2);
 await page.locator('#notice-picker-search').fill('Unit 8');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await page.locator('#notice-picker-search').fill('Unit 1');
 await expect(page.locator('#notice-picker-selection-summary')).toContainText('1 selected');
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await page.locator('#notice-picker-make').click();
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 8');
 await expect(frame.locator('#tenant')).toHaveValue('');
 await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 await expect(frame.locator('#noticeList .chip')).toHaveCount(3);
 const unit1=frame.locator('#noticeList .chip').filter({hasText:/1106 Fictional Road Unit 1$/});
 const unit8=frame.locator('#noticeList .chip').filter({hasText:/1106 Fictional Road Unit 8$/});
 await unit1.evaluate(el=>{window.__unit1StableNode=el});
 await unit1.click();
 await expect(unit1).toHaveClass(/active/);
 await expect(unit1).toHaveAttribute('aria-pressed','true');
 expect(await unit1.evaluate(el=>el===window.__unit1StableNode),'selection must not destroy the clicked chip').toBe(true);
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 1');
 await unit8.click();
 await expect(unit8).toHaveAttribute('aria-pressed','true');
 await expect(unit1).toHaveAttribute('aria-pressed','false');
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 8');
 await unit1.click();
 await expect(unit1).toHaveClass(/active/);
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 1');
});


test('signed-out staff first sees a useful access panel while local drafts stay available',async({page})=>{
 await page.goto(ORIGIN+'/');
 await expect(page.locator('#staff-access')).toBeVisible();
 await expect(page.locator('#staff-access')).toContainText('Notice drafts remain on this browser');
 await expect(page.locator('#notice-picker')).toBeHidden();
 await expect(page.locator('#studio-frame')).toBeVisible();
 await expect(page.locator('#account-dialog')).not.toBeVisible();
 await expect(page.locator('[data-notice-tab="notices"]')).toContainText('Select & draft');
 await page.locator('#staff-access-signin').click();
 await expect(page.locator('#account-dialog')).toBeVisible();
});
test('staff password reset sends a link and can finish recovery without storing token',async({page})=>{
 const state=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-logout').click();
 await expect(page.locator('#account-dialog')).toBeVisible();
 await page.locator('#forgot-password').click();
 await expect(page.locator('#password-request')).toBeVisible();
 await page.locator('#recovery-email').fill('tester@example.invalid');
 await page.locator('#password-request button').click();
 await expect(page.locator('#recovery-status')).toContainText('If this is an approved account');
 expect(state.resetRequests).toHaveLength(1);
 await page.goto(ORIGIN+'/#access_token=example-recovery-token&type=recovery');
 await page.reload(); // Same-origin hash navigation may not reload the app; emailed links start a new page.
 await expect(page.locator('#password-change')).toBeVisible();
 await expect(page).not.toHaveURL(/access_token/);
 await page.locator('#recovery-new-password').fill('safe-fictional-password-123');
 await page.locator('#password-change button').click();
 await expect(page.locator('#recovery-status')).toContainText('Password updated');
 expect(state.passwordUpdates).toHaveLength(1);
 expect(state.passwordUpdates[0].password).toBe('safe-fictional-password-123');
 expect(await page.evaluate(()=>Object.keys(localStorage).some(x=>/recovery/i.test(x)))).toBe(false);
});
test('statement CSV paste previews grouped fees, applies only on confirmation, then clears raw source',async({page})=>{
 const state=await setup(page);await importProperty(page);
 const frame=page.frameLocator('#studio-frame');
 await frame.locator('#noticeDate').fill('2026-10-28');
 const csv='Due Date,Category,Description,Lease Title,Status,Amount,Amount Due\n'+
 '09/01/2026,RENT,Rent,100 Fictional Lane - Example,PAST DUE,$955.00,$614.50\n'+
 '10/01/2026,RENT,Rent,100 Fictional Lane - Example,PAST DUE,$955.00,$955.00\n'+
 '10/06/2026,LATE_FEE,One-time,100 Fictional Lane - Example,PAST DUE,$47.75,$47.75\n'+
 '10/11/2026,LATE_FEE,Daily,100 Fictional Lane - Example,PAST DUE,$5.00,$5.00\n'+
 '10/28/2026,LATE_FEE,Daily,100 Fictional Lane - Example,UNPAID,$5.00,$5.00\n'+
 '11/01/2026,RENT,Rent,100 Fictional Lane - Example,UNPAID,$955.00,$955.00';
 await frame.locator('#statement-csv-text').fill(csv);
 await frame.locator('#statement-preview-button').click();
 await expect(frame.locator('#statement-import-preview')).toContainText('October late fees');
 await expect(frame.locator('#statement-import-preview')).toContainText('$57.75');
 await expect(frame.locator('#statement-import-status')).toContainText('1 future entries excluded');
 await expect(frame.locator('#statement-apply-button')).toBeDisabled();
 await frame.locator('#statement-confirm').check();
 await frame.locator('#statement-apply-button').click();
 await expect(frame.locator('#statement-csv-text')).toHaveValue('');
 await expect(frame.locator('#charges [data-row]')).toHaveCount(3);
 await expect(frame.locator('#charges [data-key="description"]').last()).toHaveValue('October late fees');
 await expect(frame.locator('#printPages')).toContainText('September rent');
 expect(state.writes).toHaveLength(0);
});

test('later-imported properties prefill current tenancy names even without legacy notice addressees',async({page})=>{
 const state=await setup(page);
 const p='44444444-4444-4444-8444-444444444444';
 const unit='55555555-5555-4555-8555-555555555555';
 const tenancy='66666666-6666-4666-8666-666666666666';
 const person='77777777-7777-4777-8777-777777777777';
 state.properties.push({id:p,street_address:'507 Fictional Campbell Road',city:'Example City',state:'KY',postal_code:'40201',landlord_entity:null});
 state.units.push({id:unit,property_id:p,unit_code:'UNIT-CMP',unit_label:'MAIN',unit_class:'residential',occupancy_status:'Leased'});
 state.tenancies.push({id:tenancy,unit_id:unit,status:'Current'});
 state.leases.push({id:'88888888-8888-4888-8888-888888888888',unit_id:unit,tenancy_id:tenancy,lease_status:'Current'});
 state.parties.push({tenancy_id:tenancy,person_id:person,party_role:'tenant'});
 state.contacts.push({id:person,display_name:'Morgan Example',email:'morgan@example.invalid'});
 await page.locator('#notice-picker-refresh').click();
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(2);
 await page.locator('#notice-picker-search').fill('Fictional Campbell');
 const option=page.locator('#notice-picker-list .notice-picker-row');
 await expect(option).toContainText('Morgan Example');
 await option.locator('input').check();
 await page.locator('#notice-picker-make').click();
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#tenant')).toHaveValue('Morgan Example');
 await expect(frame.locator('#owner')).toHaveCount(0);
 await expect(frame.locator('#refNumber')).toHaveCount(0);
 await expect(frame.locator('.sender').first()).toContainText('Po Box 7');
 await page.locator('[data-notice-tab="message"]').click();
 await expect(page.locator('#tenant-email-value')).toContainText('morgan@example.invalid');
});


// UI polish regressions. All API calls use setup()'s fictional fixtures.
async function uiSnapshot(page,name){
 if(process.env.OAKTOWN_UI_SCREENSHOTS!=='1')return;
 const fs=require('node:fs');
 fs.mkdirSync('test-results/ui-review',{recursive:true});
 const png=await page.screenshot({path:'test-results/ui-review/'+name+'.png',animations:'disabled'});
 // Makes visual QA available through the GitHub log connector without local source copies.
 console.log('OAKTOWN_UI:'+name+':'+png.toString('base64'));
}
test('selection retains keyboard focus and reports selected units outside a search',async({page})=>{
 await setup(page);
 const check=page.locator('#notice-picker-list input').first();
 await check.focus();const original=await check.elementHandle();
 await check.press('Space');
 await expect(check).toBeChecked();await expect(check).toBeFocused();
 expect(await original.evaluate(el=>el.isConnected&&el===document.querySelector('#notice-picker-list input'))).toBe(true);
 await page.locator('#notice-picker-search').fill('no such fictional property');
 await expect(page.locator('.picker-empty')).toBeVisible();
 await expect(page.locator('#notice-picker-selection-summary')).toContainText('1 outside this search');
 await page.locator('#notice-picker-reset-search').click();
 await expect(page.locator('#notice-picker-search')).toBeFocused();
 await expect(check).toBeChecked();
 await expect(page.locator('#notice-picker-list')).toHaveAttribute('aria-busy','false');
});
test('draft creation and tenant-message return preserve the selected notice and focus its editor',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);await importProperty(page);
 await expect(page.locator('#notice-editor-title')).toBeFocused();
 await uiSnapshot(page,'editor-desktop');
 const studio=page.frameLocator('#studio-frame');
 await studio.locator('#tenant').fill('Alex Example');
 await page.locator('[data-notice-tab="message"]').click();
 await expect(page.locator('#message-recipient')).toContainText('Alex Example');
 await page.evaluate(()=>window.scrollTo(0,0));await uiSnapshot(page,'message-desktop');
 await page.locator('#message-edit-notice').click();
 await expect(page.locator('#notice-editor-title')).toBeFocused();
 await expect(studio.locator('#tenant')).toHaveValue('Alex Example');
 await expect(page.locator('#message-area')).toBeHidden();
 await page.locator('#notice-back-to-selection').click();
 await expect(page.locator('#notice-picker-search')).toBeFocused();
});
for(const width of [320,768,1440]){
 test('workspace controls and navigation fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await setup(page);
  const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await expect.poll(overflow).toBe(true);
  await expect(page.locator('#notice-picker-make')).toBeDisabled();
  const createBox=await page.locator('#notice-picker-make').boundingBox();
  expect(createBox.height).toBeGreaterThanOrEqual(44);
  await uiSnapshot(page,'notices-'+width);
  for(const workspace of ['properties','leases','listings','maintenance','notices']){
   await page.locator('[data-workspace="'+workspace+'"]').click();
   await expect(page.locator('#workspace-title')).toBeFocused();
   await expect.poll(overflow).toBe(true);
   if(width===1440&&workspace==='leases')await uiSnapshot(page,'renewals-desktop');
  }
  if(width===1440){
   await page.locator('[data-workspace="properties"]').click();
   await expect(page.locator('#ops-portfolio-list .property-record')).toHaveCount(1);
   await uiSnapshot(page,'properties-desktop');
  }
 });
}
test('small-screen account dialog keeps all actions reachable',async({page})=>{
 await page.setViewportSize({width:320,height:568});await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-logout').click();
 await page.locator('#forgot-password').click();
 await expect(page.locator('#password-request')).toBeVisible();
 await page.locator('#account-close').scrollIntoViewIfNeeded();
 await expect(page.locator('#account-close')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('#account-close').click();
 await expect(page.locator('#account-dialog')).toBeHidden();
});
