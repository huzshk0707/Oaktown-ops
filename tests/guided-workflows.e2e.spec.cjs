'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765';
async function setup(page,workspace,theme='ember'){
 const calls=[];
 await page.route('**/*',route=>{if(new URL(route.request().url()).origin===ORIGIN)return route.continue();calls.push(route.request().url());return route.abort()});
 await page.goto(ORIGIN+'/');await page.getByLabel('Workspace theme').selectOption(theme);
 await page.locator('[data-workspace="'+workspace+'"]').click();
 return {root:page.locator('#'+workspace+'-workflow'),calls};
}
for(const [workspace,key,count,field,theme] of [['listings','listing',5,'listing-address','ember'],['leads','lead',5,'lead-thread','nilo'],['applications','application',7,'application-property','verdant']]){
 test(workspace+' offers freely navigable steps, all-at-once reading and session-only progress',async({page})=>{
  const {root,calls}=await setup(page,workspace,theme);
  await expect(root.locator('.guide-step-card:visible')).toHaveCount(1);
  await expect(root.locator('.guide-prompt')).toBeHidden();
  await expect(root.locator('.guide-resources')).not.toHaveAttribute('open','');
  await root.getByRole('button',{name:'Reviewed · next',exact:true}).click();
  await expect(root.locator('.guide-step-card:visible')).toHaveAttribute('data-workflow-step','1');
  await expect(root.locator('.guide-progress-row')).toContainText('1 of '+count);
  await root.locator('.guide-step-button').last().click();
  await expect(root.locator('.guide-step-card:visible')).toHaveAttribute('data-workflow-step',String(count-1));
  await root.getByRole('button',{name:'View all',exact:true}).click();
  await expect(root.locator('.guide-step-card:visible')).toHaveCount(count);
  await root.getByRole('button',{name:'One step',exact:true}).click();
  await expect(root.locator('.guide-step-card:visible')).toHaveCount(1);
  await page.locator('[data-workspace="today"]').click();await page.locator('[data-workspace="'+workspace+'"]').click();
  await expect(root.locator('.guide-progress-row')).toContainText('1 of '+count);
  await page.reload();await page.locator('[data-workspace="'+workspace+'"]').click();
  await expect(root.locator('.guide-progress-row')).toContainText('0 of '+count);
  expect(calls).toEqual([]);
 });
 test(workspace+' groups prompt inputs and keeps them through back, all view and manual editing',async({page})=>{
  const {root,calls}=await setup(page,workspace,theme);
  await root.getByRole('button',{name:'Build prompt',exact:true}).click();
  await expect(root.locator('.guide-form-step:visible')).toHaveCount(1);
  await page.locator('#'+field).fill('Fictional test context only');
  await root.getByRole('button',{name:'Continue',exact:true}).click();
  await root.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('#'+field)).toHaveValue('Fictional test context only');
  await root.locator('.guide-form-jump').last().click();
  await expect(root.locator('.guide-output')).toBeVisible();
  await expect(root.locator('.guide-prompt-preview')).not.toHaveAttribute('open','');
  await root.locator('.guide-prompt-preview>summary').click();
  const output=page.locator('#'+key+'-guide-prompt');await expect(output).toHaveValue(/Fictional test context only/);
  await output.fill('Manually reviewed fictional prompt');
  await root.getByRole('button',{name:'Workflow',exact:true}).click();
  await root.getByRole('button',{name:'Build prompt',exact:true}).click();
  await expect(output).toHaveValue('Manually reviewed fictional prompt');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#'+key+'-guide-copy').click();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('Manually reviewed fictional prompt');
  await root.getByRole('button',{name:'View all',exact:true}).click();
  await expect(page.locator('#'+field)).toHaveValue('Fictional test context only');
  await page.locator('#'+key+'-guide-clear').click();
  await expect(page.locator('#'+field)).toHaveValue('');
  await expect(page.locator('#'+field)).toBeFocused();
  await root.getByRole('button',{name:'One step',exact:true}).click();
  await expect(root.locator('.guide-form-step:visible')).toHaveAttribute('data-prompt-step','0');
  expect(calls).toEqual([]);
 });
}
test('parallel application reviews can be completed out of order without advancing or changing the current case stage',async({page})=>{
 const {root}=await setup(page,'applications');
 await root.locator('.guide-step-button').nth(1).click();
 const branches=root.locator('.guide-step-card:visible .guide-review');await expect(branches).toHaveCount(3);
 await branches.nth(2).click();await branches.nth(0).click();
 await expect(root.locator('.guide-step-card:visible')).toHaveAttribute('data-workflow-step','1');
 await expect(root.locator('.guide-progress-row')).toContainText('0 of 7');
 await branches.nth(1).click();await expect(root.locator('.guide-progress-row')).toContainText('1 of 7');
 await branches.nth(0).click();await expect(root.locator('.guide-progress-row')).toContainText('0 of 7');
 await root.getByRole('button',{name:'Next step',exact:true}).click();
 await expect(root.locator('.guide-step-card:visible')).toContainText('Confirm required permission');
 await expect(page.locator('#application-stage')).toHaveValue('intake');
});
test('all six themes fit phone, landscape and desktop without hiding source guidance',async({page})=>{
 const {root}=await setup(page,'applications');
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.getByLabel('Workspace theme').selectOption(theme);
  for(const size of [{width:320,height:850},{width:844,height:390},{width:1440,height:950}]){
   await page.setViewportSize(size);await root.locator('.guide-step-button').nth(1).click();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await root.getByRole('button',{name:'Build prompt',exact:true}).click();
   await root.getByRole('button',{name:'View all',exact:true}).click();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await root.getByRole('button',{name:'One step',exact:true}).click();
   await root.getByRole('button',{name:'Workflow',exact:true}).click();
  }
 }
 await root.locator('.guide-resources>summary').click();await expect(root.locator('.guide-resources')).toContainText('January 28');
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await root.locator('.guide-step-card:visible').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
 await expect(page.locator('#ops-motion-help')).toContainText('Device reduced motion is on');
});
