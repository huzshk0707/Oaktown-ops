'use strict';
const {test,expect}=require('@playwright/test');
const ORIGIN='http://127.0.0.1:8765';
test('notice step navigation keeps the local draft and exposes review checks without changing export controls',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');await page.locator('[data-workspace="notices"]').click();
 const nav=page.getByRole('navigation',{name:'Jump to a notice preparation step'});
 await expect(nav).toBeVisible();
 const studio=page.frameLocator('#studio-frame');
 await nav.getByRole('button',{name:'2 Edit details',exact:true}).click();
 await expect(page.locator('#notice-editor-title')).toBeFocused();
 await studio.locator('#tenant').fill('Fictional Draft Resident');
 await nav.getByRole('button',{name:'3 Review & export',exact:true}).click();
 await expect(studio.locator('#notice-readiness-title')).toBeFocused();
 await expect(studio.locator('#tenant')).toHaveValue('Fictional Draft Resident');
 await expect(page.locator('#notice-workflow-context')).toContainText('local draft');
 await expect(page.locator('#notice-workflow-context')).toContainText('Browser-only draft; export a JSON backup. Not sent');
 await expect(studio.locator('#downloadOne')).toBeVisible();
 await expect(studio.locator('#downloadBatch')).toBeVisible();
 await expect(studio.locator('#downloadFirm')).toBeVisible();
 await nav.getByRole('button',{name:'1 Select units',exact:true}).click();
 await expect(page.locator('#account-dialog')).toBeVisible();
});

test('notice navigation does not claim a draft was saved when browser storage is blocked',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('Storage blocked')}})});
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');await page.locator('[data-workspace="notices"]').click();
 const studio=page.frameLocator('#studio-frame');await studio.locator('#tenant').fill('Fictional unsaved resident');
 await expect(studio.locator('#status')).toContainText('Export JSON to save');
 await expect(page.locator('#notice-workflow-context')).toContainText('export a JSON backup');
 await expect(page.locator('#notice-workflow-context')).not.toContainText('Saved on this browser');
});
