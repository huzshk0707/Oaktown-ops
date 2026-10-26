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
  else if(pathname==='/auth/v1/logout')data={};
  else throw Error('Unmocked Supabase request: '+req.url());
  return route.fulfill({status:200,headers,body:JSON.stringify(data)});
 });
}
async function login(page){
 await mockSupabase(page);
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 if(!page.url().includes('/preview-v03/'))await page.locator('[data-workspace="properties"]').click();
 await expect(page.locator('#pilot-properties')).toBeVisible();
 await expect(page.locator('#pilot-results')).toContainText('55 of 55 properties shown');
}
test('main property search filters 55 properties and loads selected address into notice studio',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 await login(page);
 const search=page.locator('#pilot-search');
 await search.fill('seQUOIA');
 await expect(page.locator('#pilot-results')).toContainText('1 of 55 properties shown');
 await expect(page.locator('#pilot-property option')).toHaveCount(2);
 await page.locator('#pilot-property').selectOption('1');
 await search.fill('no such address');
 await expect(page.locator('#pilot-property')).toHaveValue('');
 await expect(page.locator('#pilot-results')).toContainText('0 of 55 properties shown');
 await search.fill('demo 40272');
 await expect(page.locator('#pilot-results')).toContainText('1 of 55 properties shown');
 await page.locator('#pilot-property').selectOption('0');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#pilot-load').click();
 await expect(page.frameLocator('#studio-frame').locator('#street')).toHaveValue('1111 Demo Avenue');
 await expect(page.frameLocator('#studio-frame').locator('#tenant')).toHaveValue('Example Tenant & All Occupants');
 await expect(page.frameLocator('#studio-frame').locator('#owner')).toHaveValue('');
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
