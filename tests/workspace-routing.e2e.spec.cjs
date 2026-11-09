'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function mock(page){
 const state={reads:0,writes:0};
 const fixtures={properties:[{id:'p1',street_address:'100 Fictional Route',city:'Example City',state:'KY'}],units:[{id:'u1',property_id:'p1',unit_label:'Unit A',unit_code:'EX-A'}],leases:[{id:'l1',unit_id:'u1',lease_label:'Fictional reference lease',lease_status:'historical',verification_status:'unverified'}]};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=data=>route.fulfill({headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-token',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'routes@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'routes@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{role:'admin',is_active:true}]);
  if(req.method()!=='GET'){state.writes++;return reply([])}
  state.reads++;return reply(fixtures[u.pathname.split('/').pop()]||[]);
 });return state;
}
async function signIn(page){
 await page.locator('#account-button').click();await page.locator('#pilot-email').fill('routes@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#account-dialog')).not.toBeVisible();
}
test('workflow and subtab URLs survive refresh and browser history',async({page})=>{
 await mock(page);await page.goto(ORIGIN+'/#/leases/new');await expect(page.locator('#new-lease-panel')).toBeVisible();
 await page.reload();await expect(page.locator('[data-lease-tab="new"]')).toHaveAttribute('aria-selected','true');
 await page.locator('[data-lease-tab="prepare"]').click();await expect(page).toHaveURL(/#\/leases\/prepare$/);
 await page.locator('.sidebar [data-workspace="properties"]').click();await expect(page).toHaveURL(/#\/properties$/);
 await page.goBack();await expect(page.locator('#lease-prepare-panel')).toBeVisible();await expect(page).toHaveURL(/#\/leases\/prepare$/);
 await page.goBack();await expect(page.locator('#new-lease-panel')).toBeVisible();await page.goForward();await expect(page.locator('#lease-prepare-panel')).toBeVisible();
 await page.evaluate(()=>window.OpsWorkspace.navigate('notices','message'));await expect(page).toHaveURL(/#\/notices\/message$/);await page.reload();await expect(page.locator('#message-area')).toBeVisible();
 await page.goto(ORIGIN+'/#/invalid-workflow');await expect(page).toHaveURL(/#\/today$/);await expect(page.locator('#today-workflow')).toBeVisible();
});
test('protected record deep links wait for verified sign-in and survive refresh',async({page})=>{
 const s=await mock(page);await page.goto(ORIGIN+'/#/properties/record/unit/u1');await expect(page.locator('#workspace-title')).toHaveText('Properties');expect(s.reads).toBe(0);
 await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();await signIn(page);
 await expect(page.locator('#operations-profile-title')).toHaveText('100 Fictional Route · Unit A');await expect(page.locator('#operations-profile-content')).toContainText('Fictional reference lease');
 await page.reload();await expect(page.locator('#operations-profile-title')).toHaveText('100 Fictional Route · Unit A');expect(s.writes).toBe(0);
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();await expect(page.locator('#operations-profile-content')).toBeEmpty();await expect(page).toHaveURL(/#\/properties$/);
});
test('record profile history opens exact related records and clears on navigation',async({page})=>{
 const s=await mock(page);await page.goto(ORIGIN+'/');await signIn(page);
 await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));await expect(page).toHaveURL(/#\/today\/record\/unit\/u1$/);await expect(page.locator('#operations-profile-title')).toHaveText('100 Fictional Route · Unit A');
 await page.locator('#operations-profile-content').getByRole('button',{name:'Fictional reference lease',exact:true}).click();await expect(page).toHaveURL(/#\/today\/record\/lease\/l1$/);await expect(page.locator('#operations-profile-title')).toHaveText('Fictional reference lease');
 await page.goBack();await expect(page.locator('#operations-profile-title')).toHaveText('100 Fictional Route · Unit A');
 await page.keyboard.press('Escape');await expect(page).toHaveURL(/#\/today$/);await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();
 await page.evaluate(()=>window.OpsWorkspace.navigate('properties'));await expect(page).toHaveURL(/#\/properties$/);expect(s.writes).toBe(0);
});
