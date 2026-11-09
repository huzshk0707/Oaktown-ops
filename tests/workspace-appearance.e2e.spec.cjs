'use strict';
const {chooseTheme,navigate,openAppearance,closeAppearance}=require('./ui-helpers.cjs');
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765';
async function open(page){
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');
}
test('motion preference persists, follows device changes and syncs between windows',async({page,context})=>{
 await open(page);await openAppearance(page);
 const toggle=page.getByRole('button',{name:'Reduce interface motion'});
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');
 await page.reload();await openAppearance(page);await expect(toggle).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.instrument-arc').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
 const second=await context.newPage();await open(second);await openAppearance(second);
 await second.getByRole('button',{name:'Reduce interface motion'}).click();
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(toggle).toHaveText('Motion off');
 expect(await page.locator('.instrument-arc').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(toggle).toHaveText('Motion on');
 await chooseTheme(second,'pearl');
 await expect(page.getByLabel('Workspace theme')).toHaveValue('pearl');
});
test('raised workflow tabs preserve keyboard selection and fields on small screens',async({page})=>{
 await open(page);await chooseTheme(page,'ember');
 await navigate(page,'applications');
 await page.locator('#applications-workflow').getByRole('button',{name:'Build prompt',exact:true}).click();
 await page.locator('#application-property').fill('Fictional unit 8');
 await navigate(page,'leases');
 const tracking=page.locator('[data-lease-tab="track"]'),prepare=page.locator('[data-lease-tab="prepare"]');
 await tracking.focus();await page.keyboard.press('ArrowRight');
 await expect(prepare).toBeFocused();await expect(prepare).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Home');await expect(tracking).toHaveAttribute('aria-selected','true');
 for(const width of [320,375,768,1440]){
  await page.setViewportSize({width,height:900});
  await navigate(page,'notices');
  await page.locator('[data-notice-tab="message"]').click();
  await expect(page.locator('#message-area')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await navigate(page,'applications');await expect(page.locator('#application-property')).toHaveValue('Fictional unit 8');
});
test('appearance works with blocked storage and leaves document rendering unthemed',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('Blocked')}});
  Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('Blocked')}});
 });
 await open(page);await chooseTheme(page,'verdant');
 await openAppearance(page);await page.getByRole('button',{name:'Reduce interface motion'}).click();await closeAppearance(page);
 await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');
 await expect(page.locator('html')).toHaveAttribute('data-ops-theme','verdant');
 await navigate(page,'notices');
 const editor=page.frameLocator('#studio-frame');
 await expect(editor.locator('link[href*="workspace-depth"],script[src*="workspace-theme"]')).toHaveCount(0);
});
