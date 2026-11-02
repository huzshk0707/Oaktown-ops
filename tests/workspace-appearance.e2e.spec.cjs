'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765';
async function open(page){
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');
}
test('motion preference persists, follows device changes and syncs between windows',async({page,context})=>{
 await open(page);
 const toggle=page.getByRole('button',{name:'Reduce interface motion'});
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');
 await page.reload();await expect(toggle).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.instrument-arc').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
 const second=await context.newPage();await open(second);
 await second.getByRole('button',{name:'Reduce interface motion'}).click();
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(toggle).toHaveText('Motion off');
 expect(await page.locator('.instrument-arc').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(toggle).toHaveText('Motion on');
 await second.getByLabel('Workspace theme').selectOption('pearl');
 await expect(page.getByLabel('Workspace theme')).toHaveValue('pearl');
});
test('raised workflow tabs preserve keyboard selection and fields on small screens',async({page})=>{
 await open(page);await page.getByLabel('Workspace theme').selectOption('ember');
 await page.locator('[data-workspace="applications"]').click();
 await page.locator('#application-property').fill('Fictional unit 8');
 await page.locator('[data-workspace="leases"]').click();
 const tracking=page.locator('[data-lease-tab="track"]'),prepare=page.locator('[data-lease-tab="prepare"]');
 await tracking.focus();await page.keyboard.press('ArrowRight');
 await expect(prepare).toBeFocused();await expect(prepare).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Home');await expect(tracking).toHaveAttribute('aria-selected','true');
 for(const width of [320,375,768,1440]){
  await page.setViewportSize({width,height:900});
  await page.locator('[data-workspace="notices"]').click();
  await page.locator('[data-notice-tab="message"]').click();
  await expect(page.locator('#message-area')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('[data-workspace="applications"]').click();await expect(page.locator('#application-property')).toHaveValue('Fictional unit 8');
});
test('appearance works with blocked storage and leaves document rendering unthemed',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('Blocked')}});
  Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('Blocked')}});
 });
 await open(page);await page.getByLabel('Workspace theme').selectOption('verdant');
 await page.getByRole('button',{name:'Reduce interface motion'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');
 await expect(page.locator('html')).toHaveAttribute('data-ops-theme','verdant');
 await page.locator('[data-workspace="notices"]').click();
 const editor=page.frameLocator('#studio-frame');
 await expect(editor.locator('link[href*="workspace-depth"],script[src*="workspace-theme"]')).toHaveCount(0);
});
