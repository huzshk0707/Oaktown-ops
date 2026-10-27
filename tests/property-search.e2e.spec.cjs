'use strict';
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
  else if(['/rest/v1/leases','/rest/v1/bookings','/rest/v1/people','/rest/v1/tenancy_people','/rest/v1/renewal_cases','/rest/v1/ops_tasks','/rest/v1/ops_events'].includes(pathname))data=[];
  else if(pathname==='/auth/v1/logout')data={};
  else throw Error('Unmocked Supabase request: '+req.url());
  return route.fulfill({status:200,headers,body:JSON.stringify(data)});
 });
}
async function login(page){
 await mockSupabase(page);
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('tester@example.invalid');
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
 await expect(page.locator('#notice-picker-count')).toContainText('1 selected');
 await search.fill('no such address');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(0);
 await expect(page.locator('#notice-picker-count')).toContainText('1 selected');
 await search.fill('demo 40272');
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await expect(page.locator('#notice-picker-count')).toContainText('2 selected');
 await page.locator('#notice-picker-make').click();
 await expect(page.locator('#notice-picker-status')).toContainText('2 created');
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#street')).toHaveValue('2222 Sequoia Example Way Apt 4');
 await expect(frame.locator('#tenant')).toHaveValue('Example Tenant & All Occupants');
 await expect(frame.locator('#owner')).toHaveValue('');
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
