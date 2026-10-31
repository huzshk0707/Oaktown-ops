'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});
test.setTimeout(60000);
async function start(page){
 await page.goto('http://127.0.0.1:8765/generator.html');
 await page.evaluate(()=>localStorage.clear());
 await page.reload();
}
test('readiness follows the existing export validator without changing download blocking',async({page})=>{
 await start(page);
 const summary=page.locator('#notice-readiness-summary');
 await expect(summary).toContainText('required checks complete');
 await expect(page.locator('[data-readiness-key="recipient"]')).toHaveAttribute('data-ready','false');
 await page.locator('[data-readiness-fix="recipient"]').click();
 await expect(page.locator('#tenant')).toBeFocused();
 await page.locator('#tenant').fill('Example Tenant');
 await expect(page.locator('[data-readiness-key="recipient"]')).toHaveAttribute('data-ready','true');
 await page.locator('#charges [data-key="amount"]').first().fill('0.00');
 await page.locator('#charges [data-key="amountDue"]').first().fill('0.00');
 await expect(page.locator('[data-readiness-key="charges"]')).toHaveAttribute('data-ready','true');
 await expect(page.locator('[data-readiness-key="total"]')).toHaveAttribute('data-ready','false');
 await page.locator('[data-readiness-fix="total"]').click();
 await expect(page.locator('#charges [data-key="amountDue"]').first()).toBeFocused();
 const alert=page.waitForEvent('dialog');
 await page.locator('#downloadOne').click();
 const blocked=await alert;expect(blocked.message()).toContain('total due must be greater than zero');await blocked.accept();
 await page.locator('#charges [data-key="amountDue"]').first().fill('950.00');
 await expect(summary).toHaveText('Required fields complete');
 await expect(page.locator('[data-readiness-fix]:visible')).toHaveCount(0);
 await expect(page.locator('#printPages #notice-readiness')).toHaveCount(0);
 await expect(page.locator('#notice-readiness')).toContainText('Still verify landlord, recipient, balances, dates and applicability');
});
test('readiness targets first incomplete charge and updates when switching drafts',async({page})=>{
 await start(page);
 await page.locator('#tenant').fill('Avery Example');
 await page.locator('#charges [data-key="amount"]').first().fill('900.00');
 await page.locator('#charges [data-key="amountDue"]').first().fill('900.00');
 await expect(page.locator('#notice-readiness-summary')).toHaveText('Required fields complete');
 await page.locator('#addCharge').click();
 await expect(page.locator('[data-readiness-key="charges"]')).toHaveAttribute('data-ready','false');
 await page.locator('[data-readiness-fix="charges"]').click();
 await expect(page.locator('#charges [data-key="category"]').nth(1)).toBeFocused();
 await page.locator('#addNotice').click();
 await expect(page.locator('[data-readiness-key="recipient"]')).toHaveAttribute('data-ready','false');
 await page.locator('#noticeList button[data-select]').first().click();
 await expect(page.locator('#tenant')).toHaveValue('Avery Example');
 await expect(page.locator('[data-readiness-key="recipient"]')).toHaveAttribute('data-ready','true');
 await expect(page.locator('[data-readiness-key="charges"]')).toHaveAttribute('data-ready','false');
});
test('screen-only readiness controls remain readable at supported widths',async({page})=>{
 await start(page);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  const panel=page.locator('#notice-readiness');
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-readiness-key="date"]')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'){
   const fs=require('node:fs');fs.mkdirSync('test-results/ui-review',{recursive:true});
   await panel.screenshot({path:'test-results/ui-review/readiness-'+width+'.png',animations:'disabled'});
  }
 }
});
