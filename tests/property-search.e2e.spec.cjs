'use strict';
const {navigate}=require('./ui-helpers.cjs');
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});

const properties=[
 {id:'11111111-1111-4111-8111-111111111111',street_address:'1111 Demo Avenue',unit:null,city:'Louisville',state:'KY',postal_code:'40272',landlord_entity:null},
 {id:'22222222-2222-4222-8222-222222222222',street_address:'2222 Sequoia Example Way',unit:'Apt 4',city:'Louisville',state:'KY',postal_code:'40214',landlord_entity:null},
 ...Array.from({length:53},(_,i)=>({
  id:'33333333-3333-4333-8333-'+String(i).padStart(12,'0'),
  street_address:(3000+i)+' Fictional Lane',unit:null,city:'Louisville',state:'KY',postal_code:'40229',landlord_entity:null
 }))
];
const addressees=properties.map(p=>({property_id:p.id,notice_addressee_text:'Example Tenant & All Occupants'}));
const units=properties.map((p,i)=>({
 id:'55555555-5555-4555-8555-'+String(i).padStart(12,'0'),
 property_id:p.id,unit_code:'UNIT-'+String(i).padStart(4,'0'),
 unit_label:p.unit||'MAIN',unit_class:'residential',occupancy_status:'Leased'
}));
async function mockSupabase(page){
 await page.route('https://wjdzaexhhjsjtdgxivyw.supabase.co/**',route=>{
  const req=route.request(),pathname=new URL(req.url()).pathname;
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'apikey,authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  let data;
  if(pathname==='/auth/v1/token')data={access_token:'fictional-test-token',refresh_token:'fictional-test-refresh-token'};
  else if(pathname==='/auth/v1/user')data={email:'huzaifashaikhmaths@gmail.com',id:'44444444-4444-4444-8444-444444444444'};
  else if(pathname==='/rest/v1/staff_memberships')data=[{role:'admin',is_active:true}];
  else if(pathname==='/rest/v1/properties')data=properties;
  else if(pathname==='/rest/v1/property_addressees')data=addressees;
  else if(pathname==='/rest/v1/units')data=units;
  else if(pathname==='/rest/v1/property_aliases'||pathname==='/rest/v1/unit_aliases')data=[];
  else if(['/rest/v1/leases','/rest/v1/bookings','/rest/v1/people','/rest/v1/tenancy_people','/rest/v1/tenancies','/rest/v1/renewal_cases','/rest/v1/ops_tasks','/rest/v1/ops_events','/rest/v1/rent_schedules','/rest/v1/lease_reference_documents'].includes(pathname))data=[];
  else if(pathname==='/auth/v1/logout')data={};
  else throw Error('Unmocked Supabase request: '+req.url());
  return route.fulfill({status:200,headers,body:JSON.stringify(data)});
 });
}
async function login(page){
 await mockSupabase(page);
 if(!page.url().includes('/preview-v03/')){await navigate(page,'notices');await page.locator('#staff-access-signin').click();}
 await page.locator('#pilot-email').fill(page.url().includes('/preview-v03/')?'huzaifashaikhmaths@gmail.com':'tester@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 if(!page.url().includes('/preview-v03/')){
  await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(55);
 }else{
  await expect(page.locator('#pilot-properties')).toBeVisible();
  await expect(page.locator('#pilot-results')).toContainText('55 of 55 properties shown');
 }
}
test('Notices search selects multiple of 55 portfolio records and creates editable notice drafts',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 await login(page);
 await expect(page.locator('#notices-load-all')).toBeHidden();
 const search=page.locator('#notice-picker-search');
 await search.fill('seQUOIA');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await expect(page.locator('#notice-picker-selection-summary')).toContainText('1 selected');
 await search.fill('no such address');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(0);
 await expect(page.locator('#notice-picker-selection-summary')).toContainText('1 selected');
 await search.fill('demo 40272');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await expect(page.locator('#notice-picker-selection-summary')).toContainText('2 selected');
 await page.locator('#notice-picker-make').click();
 await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#street')).toHaveValue('2222 Sequoia Example Way Apt 4');
 await expect(frame.locator('#tenant')).toHaveValue('Example Tenant & All Occupants');
 await expect(frame.locator('#owner, #refNumber')).toHaveCount(0);
 await expect(frame.locator('#noticeList .chip')).toHaveCount(3);
});
test('preview bulk selection searches matching addresses without losing checked items',async({page})=>{
 await page.goto('http://127.0.0.1:8765/preview-v03/');
 await login(page);
 await page.locator('#pilot-search').fill('Sequoia');
 await expect(page.locator('#pilot-results')).toContainText('1 of 55 properties shown');
 await expect(page.locator('#pilot-checklist label:visible')).toHaveCount(1);
 await page.locator('#pilot-select-all').click();
 await expect(page.locator('#pilot-count')).toHaveText('1 selected');
 await page.locator('#pilot-search').fill('Demo 40272');
 await expect(page.locator('#pilot-checklist label:visible')).toHaveCount(1);
 await page.locator('#pilot-select-all').click();
 await expect(page.locator('#pilot-count')).toHaveText('2 selected');
 await page.locator('#pilot-search').fill('');
 await expect(page.locator('#pilot-checklist label:visible')).toHaveCount(55);
 await page.locator('#pilot-clear-all').click();
 await expect(page.locator('#pilot-count')).toHaveText('0 selected');
});

test('pasted list matches in user order, reviews missing rows and creates ordered drafts',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 await login(page);
 await page.locator('#notice-bulk-input').fill('Sequoia\nDemo Avenue');
 await page.locator('#notice-bulk-match').click();
 await expect(page.locator('#notice-bulk-results .notice-bulk-result')).toHaveCount(2);
 await expect(page.locator('#notice-bulk-status')).toContainText('Ready to create ordered drafts');
 await page.locator('#notice-picker-make').click();
 await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 const chips=page.frameLocator('#studio-frame').locator('#noticeList .chip');
 await expect(chips.nth(0)).toContainText('Sequoia Example Way');
 await expect(chips.nth(1)).toContainText('Demo Avenue');
 const frame=page.frameLocator('#studio-frame');await frame.locator('#tenant').fill('Fictional reviewed recipient');
 await page.locator('#notice-bulk-input').fill('Demo Avenue\nSequoia');await page.locator('#notice-bulk-match').click();await page.locator('#notice-picker-make').click();
 await expect(page.locator('#notice-picker-status')).toContainText('2 existing');await expect(chips.nth(0)).toContainText('Demo Avenue');await expect(chips.nth(1)).toContainText('Sequoia');
 await frame.locator('#noticeList button[data-select]').nth(1).click();await expect(frame.locator('#tenant')).toHaveValue('Fictional reviewed recipient');
});
test('pasted list refuses missing matches until corrected',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 await login(page);
 await page.locator('#notice-bulk-input').fill('Sequoia\nUnknown Fictional Address');
 await page.locator('#notice-bulk-match').click();
 await expect(page.locator('#notice-bulk-status')).toContainText('1 need a choice');
 await expect(page.locator('#notice-picker-make')).toBeDisabled();
 await page.locator('#notice-bulk-input').fill('Sequoia\nDemo Avenue');
 await page.locator('#notice-bulk-match').click();
 await expect(page.locator('#notice-picker-make')).toBeEnabled();
});

test('editing a matched notice list invalidates its selections and sign-out clears private matches',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');await login(page);
 await page.locator('#notice-bulk-input').fill('Sequoia\nDemo Avenue');await page.locator('#notice-bulk-match').click();
 await expect(page.locator('#notice-picker-make')).toBeEnabled();
 await page.locator('#notice-bulk-input').fill('Sequoia');
 await expect(page.locator('#notice-bulk-results')).toBeEmpty();await expect(page.locator('#notice-picker-make')).toBeDisabled();
 await page.locator('#notice-bulk-match').click();await expect(page.locator('#notice-picker-make')).toBeEnabled();
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#notice-bulk-input')).toHaveValue('');await expect(page.locator('#notice-bulk-results')).toBeEmpty();
 await expect(page.locator('#notice-picker-list')).toBeEmpty();await expect(page.locator('#notice-bulk-match')).toBeDisabled();
});
test('unavailable optional aliases retain normal notice address search and draft creation',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');await login(page);
 await page.route('**/rest/v1/*_aliases?*',route=>route.fulfill({status:403,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({message:'Optional alias lookup unavailable'})}));
 await page.locator('#notice-picker-refresh').click();
 await expect(page.locator('#notice-picker-status')).toContainText('55 units and lots ready');
 await page.locator('#notice-picker-search').fill('1111 Demo');await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input').check();await page.locator('#notice-picker-make').click();
 await expect(page.locator('#notice-picker-status')).toContainText('1 created');
 await expect(page.frameLocator('#studio-frame').locator('#street')).toHaveValue('1111 Demo Avenue');
});

test('ambiguous pasted properties require unit choices and duplicate units block creation',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');await login(page);
 const extra={id:'66666666-6666-4666-8666-666666666666',property_id:properties[0].id,unit_code:'DEMO-B',unit_label:'Unit B',unit_class:'residential',occupancy_status:'Leased'};
 const headers={'access-control-allow-origin':'*','content-type':'application/json'};
 await page.route('**/rest/v1/units?*',route=>route.fulfill({headers,body:JSON.stringify([...units,extra])}));
 await page.locator('#notice-picker-refresh').click();await expect(page.locator('#notice-picker-status')).toContainText('56 units and lots ready');
 await page.locator('#notice-bulk-input').fill('Demo Avenue\nDemo Avenue');await page.locator('#notice-bulk-match').click();
 const choices=page.locator('#notice-bulk-results select');await expect(choices).toHaveCount(2);await expect(page.locator('#notice-picker-make')).toBeDisabled();
 await choices.nth(0).selectOption(units[0].id);await choices.nth(1).selectOption(units[0].id);
 await expect(page.locator('#notice-bulk-status')).toContainText('duplicate unit');await expect(page.locator('#notice-picker-make')).toBeDisabled();
 await choices.nth(1).selectOption(extra.id);await expect(page.locator('#notice-picker-make')).toBeEnabled();
 await page.locator('#notice-picker-make').click();await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 await expect(page.frameLocator('#studio-frame').locator('#noticeList .chip').nth(1)).toContainText('Unit B');
});
