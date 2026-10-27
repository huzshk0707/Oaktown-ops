'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});test.setTimeout(60000);
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',PROPERTY='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',BATCH='cccccccc-cccc-4ccc-8ccc-cccccccccccc',CREATED='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const clone=x=>JSON.parse(JSON.stringify(x));
async function setup(page){
 const s={email:'',logins:0,refreshes:0,batch:null,writes:[],propertyWrites:[],conflict:false,offline:false,approved:true,
 properties:[{id:PROPERTY,street_address:'100 Fictional Lane',unit:'',city:'Example City',state:'KY',postal_code:'40201',landlord_entity:null,updated_at:'2026-10-01T00:00:00Z'}],
 people:[{property_id:PROPERTY,notice_addressee_text:'Example Resident & All Occupants'}],
 units:[{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',property_id:PROPERTY,unit_code:'UNIT-1000',unit_label:'MAIN',unit_class:'residential',occupancy_status:'Leased'}]};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===ORIGIN)return route.continue();if(url.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const p=url.pathname;
  if(p==='/auth/v1/token'){url.searchParams.get('grant_type')==='password'?s.logins++:s.refreshes++;return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:s.email}})}
  if(p==='/auth/v1/user')return reply({id:USER,email:s.email});
  if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships'){if(s.holdMembership){s.membershipWaiting=true;await s.holdMembership;}return reply([{role:'admin',is_active:s.approved}]);}
  if(p==='/rest/v1/properties')return reply(s.properties);
  if(p==='/rest/v1/units')return reply(s.units);
  if(p==='/rest/v1/property_addressees')return reply(s.people);
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
 await page.goto(ORIGIN+'/');await expect(page.locator('#account-dialog')).toBeVisible();
 s.email=await page.locator('#pilot-email').inputValue();
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
 await page.locator('[data-notice-tab="court"]').click();await expect(page.locator('#court-form')).toBeVisible();
 await page.reload();await expect(page.locator('#account-button')).toContainText('Signed in');expect(s.logins).toBe(1);
 await page.evaluate(()=>{const key='oaktown-session-v04',v=JSON.parse(localStorage.getItem(key));v.expires_at=1;localStorage.setItem(key,JSON.stringify(v))});
 await page.reload();await expect(page.locator('#account-button')).toContainText('Signed in');expect(s.refreshes).toBe(1);expect(s.logins).toBe(1);
 await page.locator('#account-button').click();await page.locator('#pilot-logout').click();await expect(page.locator('#pilot-login')).toBeVisible();
 await page.reload();await expect(page.locator('#pilot-login')).toBeVisible();expect(s.logins).toBe(1);
});
test('court follow-up belongs to its notice and survives reload',async({page})=>{
 await setup(page);await importProperty(page);await page.locator('[data-notice-tab="court"]').click();
 await page.locator('#court-authorized').check();await page.locator('#court-confirmed').check();
 for(const[k,v]of Object.entries({reference:'Fictional attorney reference',courtDate:'2026-11-20',courtTime:'09:30',timezone:'America/New_York',reminderDate:'2026-11-18',owner:'Example Coordinator',notes:'Fictional test follow-up only.'}))await page.locator('#court-'+k).fill(v);
 await page.locator('#court-save').click();await expect(page.locator('#court-status')).toContainText(/saved/i);
 await page.locator('[data-notice-tab="notices"]').click();const frame=page.frameLocator('#studio-frame');await frame.locator('#noticeList .chip').first().click();
 await page.locator('[data-notice-tab="court"]').click();await expect(page.locator('#court-reference')).toHaveValue('');await expect(page.locator('#court-confirmed')).not.toBeChecked();
 await page.locator('[data-notice-tab="notices"]').click();await frame.locator('#noticeList .chip').last().click();await page.reload();
 await page.locator('[data-notice-tab="court"]').click();await expect(page.locator('#court-reference')).toHaveValue('Fictional attorney reference');
 await expect(page.locator('#court-confirmed')).toBeChecked();
});
test('explicit cloud save and open round-trip, conflict preserves local edits',async({page})=>{
 const s=await setup(page);await importProperty(page);await page.locator('#batch-title').fill('Fictional October batch');await page.locator('#cloud-save').click();
 await expect(page.locator('#cloud-status')).toContainText('Saved to Supabase');expect(s.writes).toHaveLength(1);
 const frame=page.frameLocator('#studio-frame');await frame.locator('#tenant').fill('Unsaved local edit');
 await page.locator('#cloud-open').click();await page.locator('#cloud-batches').selectOption(BATCH);await page.locator('#cloud-load').click();
 await expect(page.locator('#batch-dialog')).not.toBeVisible();await expect(frame.locator('#tenant')).toHaveValue('Example Resident & All Occupants');
 const saved=clone(s.batch);s.conflict=true;await frame.locator('#tenant').fill('Local edit retained');await page.locator('#cloud-save').click();
 await expect(page.locator('#cloud-status')).toContainText('changed elsewhere');await expect(frame.locator('#tenant')).toHaveValue('Local edit retained');
 expect(s.batch).toEqual(saved);expect(s.writes[1].p_expected_version).toBe(1);
});
test('property writes validate fields and retain edits on network failure',async({page})=>{
 const s=await setup(page);await page.locator('[data-workspace="properties"]').click();await page.locator('#legacy-address-manager > summary').click();await page.locator('#property-new').click();await page.locator('#property-save').click();expect(s.propertyWrites).toHaveLength(0);
 for(const[k,v]of Object.entries({street_address:'200 Fictional Court',unit:'Unit B',city:'Example City',state:'KY',postal_code:'40202',landlord_entity:'Example Property Company',tenant:'Fictional Household & All Occupants'}))await page.locator('#prop-'+k).fill(v);
 await page.locator('#property-save').click();await expect(page.locator('#property-status')).toContainText('Saved to Supabase');expect(s.propertyWrites).toHaveLength(1);
 await expect(page.locator('#pilot-property option')).toHaveCount(3);await page.locator('#pilot-property').selectOption('1');await page.locator('#property-edit').click();
 await page.locator('#prop-unit').fill('Unit C');s.offline=true;await page.locator('#property-save').click();await expect(page.locator('#property-status')).toContainText(/failed|fetch|network/i);
 await expect(page.locator('#prop-unit')).toHaveValue('Unit C');expect(s.properties.find(p=>p.id===CREATED).unit).toBe('Unit B');
});
test('revoked membership blocks a restored session',async({page})=>{
 const s=await setup(page);s.approved=false;await page.reload();await expect(page.locator('#pilot-login')).toBeVisible();
 await expect(page.locator('#pilot-auth-status')).toContainText('not approved');await expect(page.locator('#pilot-properties')).not.toBeVisible();
});
test('pending cloud and property saves lock actions that could switch their targets',async({page})=>{
 const s=await setup(page);await importProperty(page);let release;
 s.holdSave=new Promise(resolve=>release=resolve);await page.locator('#cloud-save').click();
 await expect.poll(()=>s.writes.length).toBe(1);await expect(page.locator('#cloud-open')).toBeDisabled();await expect(page.locator('#cloud-save')).toBeDisabled();
 release();await expect(page.locator('#cloud-status')).toContainText('Saved to Supabase');s.holdSave=null;
 await page.locator('[data-workspace="properties"]').click();await page.locator('#legacy-address-manager > summary').click();await page.locator('#pilot-property').selectOption('0');await page.locator('#property-edit').click();
 await page.locator('#prop-unit').fill('Test unit');s.holdProperty=new Promise(resolve=>release=resolve);await page.locator('#property-save').click();
 await expect.poll(()=>s.propertyWrites.length).toBe(1);await expect(page.locator('#property-new')).toBeDisabled();await expect(page.locator('#property-edit')).toBeDisabled();await expect(page.locator('#prop-street_address')).toBeDisabled();
 release();await expect(page.locator('#property-status')).toContainText('Saved to Supabase');await expect(page.locator('#property-new')).toBeEnabled();
});
test('a delayed account verification cannot restore a signed-out session',async({page})=>{
 const s=await setup(page);let release;s.holdMembership=new Promise(resolve=>release=resolve);
 await page.reload();await expect.poll(()=>s.membershipWaiting).toBe(true);
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#account-label')).toHaveText('Sign in');await expect(page.locator('#pilot-login')).toBeVisible();
 await page.reload();await expect(page.locator('#pilot-login')).toBeVisible();expect(s.logins).toBe(1);
});
test('workflow navigation fits a narrow screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);
 await page.locator('[data-notice-tab="court"]').click();await expect(page.locator('#court-form')).toBeVisible();
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
 await expect(page.locator('#notice-picker-count')).toContainText('1 selected');
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await page.locator('#notice-picker-make').click();
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 8');
 await expect(frame.locator('#tenant')).toHaveValue('');
 await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 await expect(frame.locator('#noticeList .chip')).toHaveCount(3);
 const selectedChip=frame.locator('#noticeList .chip').filter({hasText:/1106 Fictional Road Unit 1$/});
 await selectedChip.click();
 await expect(selectedChip).toHaveClass(/active/);
 await expect(frame.locator('#street')).toHaveValue('1106 Fictional Road Unit 1');
});
