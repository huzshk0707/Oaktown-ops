'use strict';
const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default;
const {mock,signIn,ORIGIN}=require('./focus-board-fixtures.cjs');
test('board and Center Focus pass scoped accessibility and fit six appearances at four widths',async({page})=>{
 test.setTimeout(180000);await mock(page);await page.goto(ORIGIN+'/#/focus');await signIn(page);await expect(page.locator('.focus-card[data-offset="0"]')).toBeVisible();
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.locator('#workspace-appearance-open').click();await page.getByLabel('Workspace theme').selectOption(theme);await page.locator('#workspace-appearance-dialog').getByRole('button',{name:'Close',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
  const board=await new AxeBuilder({page}).include('.topbar').include('#focus-workflow').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(board.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.locator('.focus-open-task').click();await expect(page.locator('#focus-detail-dialog')).toBeVisible();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const fit=await page.locator('#focus-detail-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth});expect(fit,theme+' '+width).toBe(true);}
  await page.setViewportSize({width:390,height:844});const detail=await new AxeBuilder({page}).include('#focus-detail-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(detail.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.keyboard.press('Escape');await expect(page.locator('#focus-detail-dialog')).not.toBeVisible();
 }
});
