'use strict';
const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const {morningMock,signIn,ORIGIN}=require('./morning-fixtures.cjs');
const {saved}=require('./daily-fixtures.cjs');
const {chooseTheme}=require('./ui-helpers.cjs');
test.use({viewport:{width:1440,height:1000}});
async function start(page,count=9){const s=await morningMock(page,count);s.events=[saved(s)];await page.goto(ORIGIN+'/');await signIn(page);await expect(page.locator('#daily-plan-status')).toHaveText('Approved');return s}
test('bare launch opens Morning; direct links, anchors, fallback and history remain intact',async({page})=>{
 const s=await morningMock(page);await page.goto(ORIGIN+'/');await expect(page).toHaveURL(/#\/morning$/);await expect(page.locator('#morning-signin')).toBeVisible();await expect(page.locator('#daily-dashboard')).toBeHidden();expect(s.reads).toEqual([]);
 await page.locator('#morning-command-exit').click();await expect(page).toHaveURL(/#\/today$/);await page.goBack();await expect(page.locator('#morning-signin')).toBeVisible();
 for(const route of ['today','focus','tasks/history','leases/new','notices/message']){await page.goto(ORIGIN+'/#/'+route);expect(new URL(page.url()).hash).toBe('#/'+route)}
 await page.goto(ORIGIN+'/#/invalid');await expect(page).toHaveURL(/#\/today$/);
 await page.goto(ORIGIN+'/#ordinary-anchor');expect(new URL(page.url()).hash).toBe('#ordinary-anchor');
 expect(s.writes).toEqual([]);
});
test('readiness follows actual pending responses, failure, recovery and sign-out without writes',async({page})=>{
 const s=await start(page);let release;s.historyHold=new Promise(r=>release=r);
 await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-sod-step')).toHaveAttribute('data-state','loading');await expect(page.locator('#daily-dashboard')).toHaveAttribute('aria-busy','true');
 await expect(page.locator('#daily-sod-state')).toHaveText('Reading approved SOD');s.historyHold=null;release();await expect(page.locator('#daily-dashboard')).toHaveAttribute('aria-busy','false');
 s.historyFail=true;await page.locator('#morning-command-refresh').click();await expect(page.locator('#morning-workflow')).toHaveAttribute('data-load-state','error');await expect(page.locator('#daily-sod-state')).toContainText('Unavailable');
 s.historyFail=false;await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-sod-state')).toHaveText('Approved plan available');
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#daily-active-count')).toHaveText('—');await expect(page.locator('#daily-sod-state')).toHaveText('Awaiting sign-in');expect(s.writes).toEqual([]);
});
test('planner switch keeps the same editor, unsaved wording and keyboard focus',async({page})=>{
 const s=await start(page);await page.locator('#daily-prepare').focus();await page.keyboard.press('Enter');await expect(page.locator('#morning-plan-title')).toBeFocused();await expect(page.locator('.daily-grid')).toBeHidden();await expect(page.locator('#plan-pending-panel')).toBeVisible();
 await page.locator('#sod-extras').fill('Keep this fictional planning note.');await page.locator('#daily-overview').click();await expect(page.locator('#daily-prepare')).toBeFocused();await expect(page.locator('.daily-grid')).toBeVisible();
 await page.locator('#daily-prepare').click();await expect(page.locator('#sod-extras')).toHaveValue('Keep this fictional planning note.');expect(await page.locator('#sod-morning').count()).toBe(1);expect(s.writes).toEqual([]);
});
test('motion respects the device and live appearance toggle, including loading indicators',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const s=await start(page);await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');
 const animations=()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);
 expect(await animations()).toBe(0);await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#workspace-appearance-open').click();await page.locator('#ops-motion-toggle').click();await page.locator('#workspace-appearance-dialog').getByRole('button',{name:'Close',exact:true}).click();
 let release;s.historyHold=new Promise(r=>release=r);await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-sod-step')).toHaveAttribute('data-state','loading');expect(await animations()).toBe(0);
 s.historyHold=null;release();await expect(page.locator('#daily-plan-status')).toHaveText('Approved');expect(s.writes).toEqual([]);
});
test('desktop widths and all six appearance themes retain readable controls and accessible states',async({page})=>{
 test.setTimeout(90000); // Three widths plus six separate axe scans of the large fixture.
 const s=await start(page,1005);
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#daily-active-count')).toHaveText('1005');await page.locator('#daily-prepare').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#daily-overview').click()}
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){await chooseTheme(page,theme);const result=await new AxeBuilder({page}).include('#morning-workflow').include('.topbar').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])}
 await page.locator('#daily-start').click();await expect(page.locator('#focus-deck')).toBeVisible();await page.keyboard.press('ArrowRight');expect(s.writes).toEqual([]);
});
