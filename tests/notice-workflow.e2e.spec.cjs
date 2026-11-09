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

test('active notice PDF toolbar jumps to the matching tenant message and returns to that notice',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');
 await page.locator('[data-workspace="notices"]').click();
 const frame=page.frameLocator('#studio-frame');
 await expect(frame.locator('#goTenantMessage')).toBeVisible();
 await expect(frame.locator('#goTenantMessage')).toBeEnabled();
 await frame.locator('#tenant').fill('First Fictional Resident');
 await frame.locator('#street').fill('100 Example Court');
 await frame.locator('#addNotice').click();
 await frame.locator('#tenant').fill('Second Fictional Resident');
 await frame.locator('#street').fill('200 Example Court');
 await frame.locator('#noticeList button[data-select]').first().click();
 await frame.locator('#goTenantMessage').click();
 await expect(page.locator('#message-area')).toBeVisible();
 await expect(page.locator('#message-title')).toBeFocused();
 await expect(page.locator('#message-recipient')).toContainText('First Fictional Resident');
 await expect(page.locator('#message-recipient')).toContainText('100 Example Court');
 await expect(page.locator('#copy-tenant-email')).toBeDisabled();
 await page.locator('#message-edit-notice').click();
 await expect(page.locator('#notice-editor-title')).toBeFocused();
 await expect(frame.locator('#tenant')).toHaveValue('First Fictional Resident');
 await frame.locator('#noticeList button[data-select]').nth(1).click();
 await frame.locator('#goTenantMessage').click();
 await expect(page.locator('#message-recipient')).toContainText('Second Fictional Resident');
 await expect(page.locator('#message-recipient')).not.toContainText('First Fictional Resident');
 await page.locator('#message-edit-notice').click();
 await expect(frame.locator('#tenant')).toHaveValue('Second Fictional Resident');
});
test('standalone generator keeps tenant-message shortcut hidden',async({page})=>{
 await page.goto(ORIGIN+'/generator.html');
 await expect(page.locator('#goTenantMessage')).toBeHidden();
 await expect(page.locator('#downloadOne')).toBeVisible();
});
