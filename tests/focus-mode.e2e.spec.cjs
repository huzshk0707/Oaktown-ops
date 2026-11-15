'use strict';
const {test,expect}=require('@playwright/test');
const {mock,signIn,tasks,ORIGIN}=require('./focus-board-fixtures.cjs');
const current=p=>p.locator('.focus-card[data-offset="0"]'),modal=p=>p.locator('#focus-detail-dialog');
async function open(page,count){const s=await mock(page,count);s.tasks[0].notes='Fictional inspection notes. Confirm the follow-up scope before reviewing.';s.tasks[0].intake_details.description='A fictional task description for staff review.';s.tasks[0].intake_details.next_action='Confirm the saved inspection follow-up.';await page.goto(ORIGIN+'/#/focus');await signIn(page);await expect(current(page)).toBeVisible();return s}
async function focus(page){await current(page).getByRole('button',{name:/Open Focus Mode/}).click();await expect(modal(page)).toBeVisible()}
test('center activation opens actual context; Escape and Back restore selection; neighbors only select',async({page})=>{
 const s=await open(page),before=JSON.stringify(s.tasks);
 await page.locator('.focus-card[data-offset="1"]').click();await expect(modal(page)).not.toBeVisible();await expect(current(page)).toContainText('DEMO-102');
 await page.locator('#focus-prev').click();await focus(page);await expect(page.locator('#focus-detail-title')).toHaveText(s.tasks[0].task_title);await expect(page.locator('#focus-detail-content')).toContainText(s.tasks[0].notes);await expect(page.locator('#focus-detail-content')).toContainText('A fictional task description');
 await page.keyboard.press('Escape');await expect(modal(page)).not.toBeVisible();await expect(current(page).getByRole('button')).toBeFocused();
 await page.keyboard.press('Enter');await expect(modal(page)).toBeVisible();await page.locator('#focus-detail-back').click();await expect(modal(page)).not.toBeVisible();await expect(current(page)).toContainText('DEMO-101');
 await page.locator('#focus-deck').focus();await page.keyboard.press('Space');await expect(modal(page)).toBeVisible();await page.mouse.click(1,1);await expect(modal(page)).not.toBeVisible();await expect(current(page).getByRole('button')).toBeFocused();
 expect(JSON.stringify(s.tasks)).toBe(before);expect(s.writes).toEqual([]);
});
test('modal traps focus, disables background arrows, and preserves deterministic previous/next selection',async({page})=>{
 const s=await open(page);await focus(page);
 await page.keyboard.press('Shift+Tab');await expect(page.locator('#focus-detail-review')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#focus-detail-back')).toBeFocused();
 for(let i=0;i<14;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.querySelector('#focus-detail-dialog').contains(document.activeElement))).toBe(true)}
 await page.keyboard.press('ArrowRight');await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-101');
 await page.locator('#focus-detail-next').click();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-102');await page.locator('#focus-detail-next').click();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-103');await page.locator('#focus-detail-prev').click();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-102');
 await page.locator('#focus-detail-back').click();await expect(modal(page)).not.toBeVisible();await expect(current(page)).toContainText('DEMO-102');await expect(current(page).getByRole('button')).toBeFocused();expect(s.writes).toEqual([]);
});
test('Review Task opens the existing reviewed task editor and preserves its permission path without saving',async({page})=>{
 const s=await open(page);await focus(page);await page.locator('#focus-detail-review').click();
 await expect(modal(page)).not.toBeVisible();await expect(page.locator('#today-edit-dialog')).toBeVisible();await expect(page).toHaveURL(/#\/tasks$/);await expect(page.locator('#today-edit-title')).toHaveValue(s.tasks[0].task_title);await expect(page.locator('#today-edit-status')).toHaveValue('pending');
 await page.locator('#today-edit-cancel').click();await page.locator('.sidebar [data-workspace="focus"]').click();await expect(current(page)).toContainText('DEMO-101');
 s.readRole='viewer';await page.locator('#focus-refresh').click();await expect(current(page)).toBeVisible();await focus(page);await page.locator('#focus-detail-review').click();await expect(page.locator('#operations-profile-dialog')).toBeVisible();await expect(page.locator('#today-edit-dialog')).not.toBeVisible();expect(s.writes).toEqual([]);
});
test('open details clear while refreshing, update by ID, and handle removed, error and empty results',async({page})=>{
 const s=await open(page);await focus(page);let release;s.hold=new Promise(r=>release=r);
 await page.locator('#focus-detail-refresh').click();await expect(page.locator('#focus-detail-title')).toHaveText('Refreshing task…');await expect(page.locator('#focus-detail-content')).not.toContainText(s.tasks[0].notes);await expect(page.locator('#focus-detail-review')).toBeDisabled();
 s.tasks[0].notes='Fictional updated note after refresh';s.hold=null;release();await expect(page.locator('#focus-detail-content')).toContainText('Fictional updated note');
 s.fail=true;await page.locator('#focus-detail-refresh').click();await expect(page.locator('#focus-detail-title')).toHaveText('Task details unavailable');await expect(page.locator('#focus-detail-content')).not.toContainText('Fictional updated note');
 s.fail=false;await page.locator('#focus-detail-refresh').click();await expect(page.locator('#focus-detail-content')).toContainText('Fictional updated note');
 s.tasks[0].status='completed';await page.locator('#focus-detail-refresh').click();await expect(page.locator('#focus-detail-title')).toHaveText('Task no longer available');await expect(page.locator('#focus-detail-review')).toBeDisabled();await expect(page.locator('#focus-detail-next')).toBeDisabled();
 await page.locator('#focus-detail-back').click();await expect(current(page)).toContainText('DEMO-102');s.tasks=[];await page.locator('#focus-refresh').click();await expect(page.locator('#focus-state')).toContainText('No active tasks');expect(s.writes).toEqual([]);
});
test('sign-out and late Review/read replies cannot restore private detail content',async({page})=>{
 const s=await open(page);await focus(page);let release;s.hold=new Promise(r=>release=r);await page.locator('#focus-detail-refresh').click();
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(modal(page)).not.toBeVisible();await expect(page.locator('#focus-detail-content')).toBeEmpty();await expect(page.locator('#focus-detail-code')).toHaveText('');s.hold=null;release();await expect(current(page)).toHaveCount(0);
 await signIn(page);await expect(current(page)).toBeVisible();await focus(page);let reviewRelease;s.hold=new Promise(r=>reviewRelease=r);await page.locator('#focus-detail-review').click();await page.locator('#focus-detail-back').click();await expect(modal(page)).not.toBeVisible();const reply=page.waitForResponse('**/rest/v1/ops_tasks?*');s.hold=null;reviewRelease();await (await reply).finished();await expect(page.locator('#focus-detail-review')).not.toBeVisible();await expect(page.locator('#today-edit-dialog')).not.toBeVisible();expect(s.writes).toEqual([]);
});
test('more than 1000 tasks remain reachable within Focus Mode; full workspace exit remains available',async({page})=>{
 const s=await open(page,1007);s.tasks[1006].task_title='ZZ Fictional final active record';await page.locator('#focus-refresh').click();await expect(page.locator('#focus-count')).toHaveText('1007 active tasks');
 await page.locator('#focus-deck').focus();await page.keyboard.press('End');await focus(page);await expect(page.locator('#focus-detail-title')).toHaveText('ZZ Fictional final active record');await expect(page.locator('#focus-detail-next')).toBeDisabled();await expect(page.locator('#focus-detail-position')).toHaveText('1007 / 1007');await page.locator('#focus-detail-prev').click();await expect(page.locator('#focus-detail-position')).toHaveText('1006 / 1007');
 await page.locator('#focus-detail-workspace').click();await expect(page).toHaveURL(/#\/today$/);await expect(page.locator('.sidebar')).toBeVisible();expect(s.writes).toEqual([]);
});
test('long and untrusted notes remain readable at all widths; reduced motion disables modal and card effects',async({page})=>{
 test.setTimeout(90000);const s=await open(page);s.tasks[0].notes=('<img src=x onerror="alert(1)"> Fictional long review notes.\n').repeat(180);await page.locator('#focus-refresh').click();await expect(current(page)).toBeVisible();await focus(page);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const fit=await modal(page).evaluate(n=>({fits:n.getBoundingClientRect().width<=innerWidth,bodyFits:document.querySelector('#focus-detail-body').scrollWidth<=document.querySelector('#focus-detail-body').clientWidth,scrollable:document.querySelector('#focus-detail-body').scrollHeight>document.querySelector('#focus-detail-body').clientHeight}));expect(fit).toEqual({fits:true,bodyFits:true,scrollable:true});}
 await page.locator('#focus-detail-body').evaluate(n=>new Promise(resolve=>{n.addEventListener('scroll',()=>requestAnimationFrame(resolve),{once:true});n.scrollTop=300}));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect.poll(()=>page.locator('#focus-detail-body').evaluate(n=>n.scrollTop)).toBe(300);
 await expect(page.locator('#focus-detail-content img')).toHaveCount(0);await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#focus-detail-back').click();await expect(modal(page)).not.toBeVisible();await focus(page);expect(await modal(page).evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);expect(s.writes).toEqual([]);
});
test('mobile touch selects neighbors and opens only the center; horizontal navigation has no completion or defer action',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await context.newPage(),s=await open(page);
 await current(page).locator('h2').tap();await expect(modal(page)).toBeVisible();await page.locator('#focus-detail-next').tap();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-102');await page.locator('#focus-detail-back').tap();await expect(modal(page)).not.toBeVisible();await expect(current(page)).toContainText('DEMO-102');
 expect(s.writes).toEqual([]);await context.close();
});

test('denied refresh removes open private details and blocks Review until access is restored',async({page})=>{
 const s=await open(page);await focus(page);s.fail=true;s.failStatus=403;await page.locator('#focus-detail-refresh').click();await expect(page.locator('#focus-detail-title')).toHaveText('Task details unavailable');await expect(page.locator('#focus-detail-content')).not.toContainText(s.tasks[0].notes);await expect(page.locator('#focus-detail-review')).toBeDisabled();
 await page.locator('#focus-detail-back').click();await expect(current(page)).toHaveCount(0);expect(s.writes).toEqual([]);
});

test('resizing during navigation keeps the selected card centered in the new viewport',async({page})=>{
 await open(page);await page.setViewportSize({width:1440,height:900});await page.locator('#focus-deck').focus();await page.keyboard.press('ArrowRight');await page.setViewportSize({width:320,height:900});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 expect(await current(page).evaluate(n=>Math.abs(n.getBoundingClientRect().x+n.getBoundingClientRect().width/2-innerWidth/2))).toBeLessThan(2);
 await expect(current(page)).toContainText('DEMO-102');
});
