'use strict';
const {test,expect}=require('@playwright/test');
const {navigate}=require('./ui-helpers.cjs');
const {mock,signIn,tasks,ORIGIN}=require('./focus-board-fixtures.cjs');
const current=p=>p.locator('.focus-card[data-offset="0"]');
async function open(page,count){const state=await mock(page,count);await page.goto(ORIGIN+'/#/focus');await signIn(page);await expect(current(page)).toBeVisible();return state}
test('board shows real task fields and supports keyboard, mouse buttons and neighbor selection without writes',async({page})=>{
 const s=await open(page);const before=JSON.stringify(s.tasks);
 await expect(page.locator('.sidebar')).toBeHidden();await expect(current(page)).toContainText('DEMO-101');await expect(current(page)).toContainText('Example Staff');await expect(current(page)).toContainText('Property operations');await expect(current(page)).toContainText('pending');await expect(current(page)).toContainText(s.tasks[0].id);
 await page.locator('#focus-deck').focus();await page.keyboard.press('ArrowRight');await expect(current(page)).toContainText('DEMO-102');
 await page.locator('#focus-next').click();await expect(current(page)).toContainText('DEMO-103');
 await page.locator('.focus-card[data-offset="1"]').click();await expect(current(page)).toContainText('DEMO-104');
 await page.keyboard.press('Home');await expect(current(page)).toContainText('DEMO-101');await expect(page.locator('#focus-prev')).toBeDisabled();
 await page.keyboard.press('End');await expect(current(page)).toContainText('DEMO-108');await expect(page.locator('#focus-next')).toBeDisabled();
 await page.locator('#focus-prev').click();await expect(current(page)).toContainText('DEMO-105');
 await page.locator('#operations-search-open').click();await expect(page.locator('#operations-search-dialog')).toBeVisible();await page.keyboard.press('ArrowLeft');await expect(current(page)).toContainText('DEMO-105');await page.keyboard.press('Escape');
 await page.locator('#workspace-appearance-open').click();await expect(page.locator('#workspace-appearance-dialog')).toBeVisible();await page.keyboard.press('Escape');
 expect(JSON.stringify(s.tasks)).toBe(before);expect(s.writes).toEqual([]);
});
test('all active tasks beyond 1000 are reachable; refresh preserves selection and uses the same workspace data',async({page})=>{
 const s=await mock(page,1007);s.tasks[1006].task_title='ZZ Fictional final active task';s.tasks.push({...tasks(1)[0],id:'terminal',status:'completed'},{...tasks(1)[0],id:'archived',archived_at:'2026-11-01'});
 await page.goto(ORIGIN+'/#/focus');await signIn(page);await expect(page.locator('#focus-count')).toHaveText('1007 active tasks');
 await page.locator('#focus-deck').focus();await page.keyboard.press('End');await expect(current(page)).toHaveAttribute('data-task-id',s.tasks[1006].id);expect(s.reads.some(q=>new URLSearchParams(q).get('id')?.startsWith('gt.'))).toBe(true);
 s.tasks[1006].task_title='ZZ Fictional refreshed task title';await page.locator('#focus-refresh').click();await expect(current(page)).toContainText('Fictional refreshed task title');
 await page.locator('#focus-exit').click();await expect(page).toHaveURL(/#\/today$/);await expect(page.locator('.sidebar')).toBeVisible();
 await page.locator('.sidebar [data-workspace="tasks"]').click();await page.locator('#today-task-search').fill('Fictional refreshed task title');await expect(page.locator('#today-queue')).toContainText('Fictional refreshed task title');expect(s.writes).toEqual([]);
});
test('signed-out, loading, failed refresh, retry and empty states never retain private cards',async({page})=>{
 const s=await mock(page);let release;s.hold=new Promise(r=>release=r);
 await page.goto(ORIGIN+'/#/focus');await expect(page.locator('#focus-state')).toContainText('Sign in');expect(s.reads.length).toBe(0);await signIn(page);await expect(page.locator('#focus-state')).toContainText('Loading');await expect(current(page)).toHaveCount(0);
 s.hold=null;release();await expect(current(page)).toBeVisible();s.fail=true;await page.locator('#focus-refresh').click();await expect(page.locator('#focus-state')).toContainText('could not be loaded');await expect(current(page)).toHaveCount(0);
 s.fail=false;await page.locator('#focus-refresh').click();await expect(current(page)).toBeVisible();s.tasks=[];await page.locator('#focus-refresh').click();await expect(page.locator('#focus-state')).toContainText('No active tasks');
 s.tasks=tasks();await page.locator('#focus-refresh').click();await expect(current(page)).toBeVisible();await page.locator('#account-button').click();await page.locator('#pilot-logout').click();await expect(page.locator('#focus-state')).toContainText('Sign in');await expect(page.locator('#focus-track')).toBeEmpty();expect(s.writes).toEqual([]);
});
test('late responses and unapproved membership cannot populate the board',async({page})=>{
 const s=await open(page);let release;s.hold=new Promise(r=>release=r);await page.locator('#focus-refresh').click();await expect(page.locator('#focus-state')).toContainText('Loading');
 await page.locator('#account-button').click();await page.locator('#pilot-logout').click();s.hold=null;release();await expect(page.locator('#focus-state')).toContainText('Sign in');await expect(current(page)).toHaveCount(0);
 s.role='viewer';await page.locator('#account-close').click();await signIn(page);await expect(page.locator('#pilot-auth-status')).toContainText('not approved');await expect(current(page)).toHaveCount(0);expect(s.writes).toEqual([]);
});
test('horizontal touch and mouse drags navigate only; vertical movement does not select a task',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await context.newPage();const s=await open(page);const cdp=await context.newCDPSession(page);
 const box=await page.locator('#focus-deck').boundingBox(),y=box.y+180;
 async function swipe(dx,dy){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:240,y}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:240+dx*i/6,y:y+dy*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await swipe(-140,2);await expect(current(page)).toContainText('DEMO-102');await swipe(0,-90);await expect(current(page)).toContainText('DEMO-102');
 await page.evaluate(()=>scrollTo(0,0));const rect=await page.locator('#focus-deck').boundingBox();await page.mouse.move(130,rect.y+180);await page.mouse.down();await page.mouse.move(290,rect.y+182,{steps:6});await page.mouse.up();await expect(current(page)).toContainText('DEMO-101');
 expect(s.writes).toEqual([]);await context.close();
});
test('board is dark, responsive, visually centered and motion-aware across appearances without changing old routes',async({page})=>{
 test.setTimeout(90000);await open(page);await page.locator('#focus-deck').focus();await page.keyboard.press('ArrowRight');
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.locator('#workspace-appearance-open').click();await page.getByLabel('Workspace theme').selectOption(theme);await page.locator('#workspace-appearance-dialog').getByRole('button',{name:'Close',exact:true}).click();
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>!document.querySelector('#focus-track').getAnimations({subtree:true}).some(a=>a.playState==='running'));
   const layout=await page.evaluate(()=>{const center=document.querySelector('.focus-card[data-offset="0"]'),neighbor=document.querySelector('.focus-card[data-offset="1"]'),a=center.getBoundingClientRect(),b=neighbor.getBoundingClientRect();return {fits:document.documentElement.scrollWidth<=innerWidth,center:a.x+a.width/2,width:a.width,neighborWidth:b.width,opacity:Number(getComputedStyle(neighbor).opacity),scheme:getComputedStyle(document.body).colorScheme}});
   expect(layout.fits).toBe(true);expect(Math.abs(layout.center-width/2)).toBeLessThan(2);expect(layout.width).toBeGreaterThan(layout.neighborWidth);expect(layout.opacity).toBeLessThan(.6);expect(layout.scheme).toBe('dark');
  }
 }
 await page.locator('#workspace-appearance-open').click();await page.locator('#ops-motion-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-ops-motion','off');await page.locator('#workspace-appearance-dialog').getByRole('button',{name:'Close',exact:true}).click();expect(await current(page).evaluate(n=>getComputedStyle(n).transitionDuration)).toBe('0s');
 await page.emulateMedia({reducedMotion:'reduce'});expect(await current(page).evaluate(n=>getComputedStyle(n).transitionDuration)).toBe('0s');
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:test.info().outputPath('focus-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:test.info().outputPath('focus-mobile.png'),fullPage:true});
 await page.locator('#focus-exit').click();await expect(page.locator('#today-workflow')).toBeVisible();await expect(page.locator('.sidebar')).toBeVisible();await expect(page.locator('.operations-toolbar #operations-search-open')).toBeVisible();
 await navigate(page,'leases');await page.locator('[data-lease-tab="new"]').click();await expect(page).toHaveURL(/#\/leases\/new$/);await page.goBack();await expect(page.locator('#ops-renewals-panel')).toBeVisible();
 expect(await page.locator('#focus-exit').isVisible()).toBe(false);
});

test('deletion during a paginated read keeps later current tasks reachable and refresh removes the earlier deleted record',async({page})=>{
 const s=await mock(page,1002),later=s.tasks[1000].id;s.tasks[1000].task_title='ZZ Cursor boundary task';s.tasks[1001].task_title='ZZZ Final current task';let changed=false;
 s.beforeTaskPage=(url,state)=>{if(!changed&&url.searchParams.get('id')?.startsWith('gt.')){changed=true;state.tasks=state.tasks.slice(1)}};
 await page.goto(ORIGIN+'/#/focus');await signIn(page);await expect(page.locator('#focus-count')).toHaveText('1002 active tasks');
 expect(await page.evaluate(id=>window.OpsToday.getData().tasks.some(t=>t.id===id),later)).toBe(true);await page.locator('#focus-deck').focus();await page.keyboard.press('End');await page.locator('#focus-prev').click();await expect(current(page)).toHaveAttribute('data-task-id',later);
 await page.locator('#focus-refresh').click();await expect(page.locator('#focus-count')).toHaveText('1001 active tasks');expect(s.writes).toEqual([]);
});
