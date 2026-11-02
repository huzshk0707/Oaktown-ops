'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
async function setup(page,signin=true){
 const writes=[];await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  let data=[];
  if(u.pathname==='/auth/v1/token')data={access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,user:{id:'fictional-staff',email:'staff@example.invalid'}};
  else if(u.pathname==='/auth/v1/user')data={id:'fictional-staff',email:'staff@example.invalid'};
  else if(u.pathname==='/rest/v1/staff_memberships')data=[{role:'admin',is_active:true}];
  else if(u.pathname==='/rest/v1/properties')data=[{id:'p1',street_address:'111 Fictional Road',city:'Example City',state:'KY',postal_code:'40201'},{id:'p2',street_address:'222 Fictional Road',city:'Example City',state:'KY',postal_code:'40201'}];
  else if(u.pathname==='/rest/v1/units')data=[{id:'u1',property_id:'p1',unit_label:'Unit 1'},{id:'u2',property_id:'p2',unit_label:'Unit 2'}];
  if(u.pathname.startsWith('/rest/')&&req.method()!=='GET')writes.push({path:u.pathname,body:req.postData()});
  return route.fulfill({status:200,headers,body:JSON.stringify(data)});
 });
 await page.goto(ORIGIN+'/');
 if(signin){await page.locator('#account-button').click();await page.locator('#pilot-email').fill('staff@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#account-label')).toHaveText('Signed in')}
 await page.locator('[data-workspace="leases"]').click();await page.locator('#lease-tab-new').click();return writes;
}
async function step(page,i){await page.locator('#new-lease-panel .guide-form-jump').nth(i).click()}
test('new lease has its own staff-only tab and opens from the application handoff',async({page})=>{
 await setup(page,false);await expect(page.locator('.lease-draft-lock')).toBeVisible();await expect(page.locator('#newlease-form')).toBeHidden();await expect(page.locator('#newlease-tenantName')).toBeDisabled();
 await page.locator('[data-workspace="applications"]').click();await page.locator('#applications-workflow .guide-step-button').last().click();await page.getByRole('button',{name:'Open new lease preparation'}).click();
 await expect(page.locator('#lease-tab-new')).toHaveAttribute('aria-selected','true');await expect(page.locator('#new-lease-panel')).toBeVisible();await expect(page.locator('#newlease-approvalReviewed')).not.toBeChecked();
 await page.locator('#lease-tab-track').focus();await page.keyboard.press('End');await expect(page.locator('#lease-tab-new')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.locator('#lease-tab-track')).toBeFocused();
});
test('late-fee overrides survive rent changes, reset explicitly, and match both pages without saving',async({page})=>{
 const writes=await setup(page);await step(page,1);await page.locator('#newlease-rent').fill('1000');await step(page,4);
 await expect(page.locator('#newlease-five')).toHaveValue('50.00');await expect(page.locator('#newlease-ten')).toHaveValue('100.00');
 await page.locator('#newlease-five').fill('25');await page.locator('#newlease-ten').fill('80');await step(page,1);await page.locator('#newlease-rent').fill('2000');await step(page,4);
 await expect(page.locator('#newlease-five')).toHaveValue('25');await expect(page.locator('#newlease-ten')).toHaveValue('80');
 await page.locator('#newlease-review').click();await expect(page.locator('#newlease-output')).toContainText('5% · pages 1 and 10');await expect(page.locator('#newlease-output')).toContainText('$25.00');await expect(page.locator('#newlease-download')).toBeDisabled();
 await page.getByRole('button',{name:'Use 5% / 10% rent calculation'}).click();await expect(page.locator('#newlease-five')).toHaveValue('100.00');await expect(page.locator('#newlease-ten')).toHaveValue('200.00');await expect(page.locator('#newlease-output')).toBeHidden();expect(writes).toEqual([]);
});
test('conditions are blank, editable, independent by room and retained only for the current draft',async({page})=>{
 await setup(page);await step(page,3);await expect(page.locator('#newlease-satisfactory')).toHaveValue('');await page.locator('#newlease-bedrooms').selectOption('5');await page.locator('#newlease-bathrooms').selectOption('2');
 await expect(page.locator('#newlease-condition-0')).toHaveValue('');await page.locator('#newlease-condition-0').fill('Good & Fresh Paint');await page.locator('#newlease-room').selectOption('bedroom-5');await expect(page.locator('#newlease-condition-0')).toHaveValue('');await page.locator('#newlease-condition-0').fill('Fictional bedroom five note');
 await page.locator('#newlease-bedrooms').selectOption('2');await expect(page.locator('#newlease-room option[value="bedroom-5"]')).toHaveCount(0);
 await page.locator('#newlease-bedrooms').selectOption('5');await page.locator('#newlease-room').selectOption('bedroom-5');await expect(page.locator('#newlease-condition-0')).toHaveValue('Fictional bedroom five note');await page.locator('#newlease-room').selectOption('kitchen');await expect(page.locator('#newlease-condition-0')).toHaveValue('Good & Fresh Paint');
 await page.getByRole('button',{name:'Clear draft',exact:true}).click();await step(page,3);await expect(page.locator('#newlease-condition-0')).toHaveValue('');await expect(page.locator('#newlease-bedrooms')).toHaveValue('');
});
test('sign-out clears names, conditions and reviews; changing a protected unit cannot carry prior details',async({page})=>{
 const writes=await setup(page);await step(page,1);await page.locator('#newlease-unit').selectOption('u1');await step(page,2);await page.locator('#newlease-tenantName').fill('Fictional new resident');
 await step(page,1);page.once('dialog',d=>d.accept());await page.locator('#newlease-unit').selectOption('u2');await expect(page.locator('#newlease-address')).toHaveValue('222 Fictional Road Unit 2');await expect(page.locator('#newlease-tenantName')).toHaveValue('');
 await step(page,2);await page.locator('#newlease-tenantName').fill('Another fictional resident');await page.locator('#newlease-tenantName').press('Enter');await expect(page.locator('#newlease-tenantName')).toHaveValue('Another fictional resident\n');
 await step(page,4);await page.locator('#newlease-review').click();await expect(page.locator('#newlease-output')).toBeVisible();await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#newlease-output')).toBeHidden();await expect(page.locator('#newlease-tenantName')).toHaveValue('');await expect(page.locator('.lease-draft-lock')).toBeVisible();expect(writes).toEqual([]);
});
test('all six themes and mobile layouts retain the renewal tool and disabled new-lease export',async({page})=>{
 await setup(page);for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.getByLabel('Workspace theme').selectOption(theme);
  for(const width of [320,768,1440]){
   await page.setViewportSize({width,height:950});await page.locator('#lease-tab-new').click();await step(page,3);await page.locator('#newlease-bedrooms').selectOption('5');await page.locator('#newlease-bathrooms').selectOption('3');await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.locator('#new-lease-panel').getByRole('button',{name:'View all',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#newlease-download')).toBeDisabled();await page.locator('#new-lease-panel').getByRole('button',{name:'One step',exact:true}).click();
   await page.locator('#lease-tab-prepare').click();await expect(page.locator('#ops-renewal-generator')).toBeVisible();await expect(page.locator('#new-lease-panel')).toBeHidden();
  }
 }
});
