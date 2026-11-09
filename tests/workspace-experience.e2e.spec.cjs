'use strict';
const {test,expect}=require('@playwright/test');
const {chooseTheme,navigate}=require('./ui-helpers.cjs');
const ORIGIN='http://127.0.0.1:8765';
test('compact workspace exposes mobile destinations and appearance without hiding essential status',async({page})=>{
 test.setTimeout(90000);
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await chooseTheme(page,theme);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:950});
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(page.locator('#workspace-appearance-open')).toBeVisible();
   if(width<741){
    await expect(page.locator('#workspace-menu-toggle')).toBeVisible();
    await expect(page.locator('.sidebar nav')).toBeHidden();
    await page.locator('#workspace-menu-toggle').click();
    await expect(page.locator('.sidebar [data-workspace="applications"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.sidebar nav')).toBeHidden();
    await expect(page.locator('#workspace-menu-toggle')).toBeFocused();
   }else await expect(page.locator('.sidebar nav')).toBeVisible();
  }
 }
 await page.setViewportSize({width:390,height:844});
 await navigate(page,'applications');
 await expect(page.locator('#workspace-mode')).toContainText('Guide & prompt builder');
 await expect(page.locator('.sidebar nav')).toBeHidden();
 await navigate(page,'today');
 await expect(page.locator('#workspace-mode')).toContainText('daily work');
 await page.locator('#today-open-plan').click();
 await expect(page.locator('#sod-morning')).toHaveAttribute('open','');
 await expect(page.locator('#sod-status')).toContainText('Sign in');
 await expect(page.locator('#workspace-advanced')).not.toHaveAttribute('open','');
 await expect(page.locator('#task-connection')).toBeHidden();
});
