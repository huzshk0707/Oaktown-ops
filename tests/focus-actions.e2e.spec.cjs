'use strict';
const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default;
const {open}=require('./focus-actions-fixtures.cjs'),T=require('../today-model.js');
const modal=p=>p.locator('#focus-action-dialog'),card=p=>p.locator('.focus-card[data-offset="0"]');
async function ready(p,count){const s=await open(p,count);await expect(card(p)).toBeVisible();return s}
async function complete(p){await p.locator('#focus-board-complete').click();await expect(p.locator('#focus-completion-summary')).toBeEditable();await p.locator('#focus-completion-summary').fill('Fictional inspection finished and report filed.');}
async function confirm(p){await p.locator('#focus-action-confirm').click();await expect(modal(p)).not.toBeVisible();}
const writes=s=>s.saveCalls.length;
// Both instants are on the same UTC date but different Eastern workdays.
const midnightBefore=new Date('2026-11-16T04:59:00Z'),midnightAfter=new Date('2026-11-16T05:01:00Z'),midnightDate='2026-11-16';
async function midnightDefer(page){
 // One task keeps selection independent of the host date used by shared fixtures.
 await page.clock.setFixedTime(midnightBefore);const s=await ready(page,1);
 await page.locator('#focus-board-defer').click();await expect(page.locator('#focus-followup-date')).toBeEditable();
 await page.locator('#focus-followup-date').fill(midnightDate);await expect(page.locator('#focus-action-confirm')).toBeEnabled();return s;
}
async function rejectedMidnight(page,s,before){
 await expect(page.locator('#focus-action-error')).toContainText('after today in Eastern time');
 await expect(page.locator('#focus-followup-date')).toHaveValue(midnightDate);await expect(page.locator('#focus-action-confirm')).toBeDisabled();
 await expect(page.locator('#focus-action-reload')).toBeVisible();expect(s.saveCalls).toHaveLength(0);expect(s.audit).toHaveLength(0);expect(s.tasks[0]).toEqual(before);
}
test('Defer planned before Eastern midnight requires fresh review when confirmed after midnight',async({page})=>{
 const s=await midnightDefer(page),before=structuredClone(s.tasks[0]);await page.clock.setFixedTime(midnightAfter);
 await page.locator('#focus-action-confirm').click();await rejectedMidnight(page,s,before);
 expect(s.writes).toHaveLength(0);
 await page.locator('#focus-action-reload').click();await expect(page.locator('#focus-followup-date')).toHaveValue('2026-11-17');
 await expect(page.locator('#focus-action-confirm')).toBeEnabled();expect(s.saveCalls).toHaveLength(0);
});
test('Defer rechecks the Eastern day after an asynchronous shared-task preflight',async({page})=>{
 const s=await midnightDefer(page),before=structuredClone(s.tasks[0]),reads=s.reads.length;let release;s.hold=new Promise(r=>release=r);
 await page.locator('#focus-action-confirm').click();await expect.poll(()=>s.reads.length).toBeGreaterThan(reads);
 await page.clock.setFixedTime(midnightAfter);s.hold=null;release();await rejectedMidnight(page,s,before);expect(s.writes).toHaveLength(0);
});
test('Defer rechecks the Eastern day after awaiting a new intake session',async({page})=>{
 const s=await midnightDefer(page),before=structuredClone(s.tasks[0]);let release;s.newHold=new Promise(r=>release=r);
 await page.locator('#focus-action-confirm').click();await expect.poll(()=>s.writes.some(w=>JSON.parse(w.body).p_action==='new')).toBe(true);
 await page.clock.setFixedTime(midnightAfter);s.newHold=null;release();await rejectedMidnight(page,s,before);
 expect(s.writes.map(w=>JSON.parse(w.body).p_action)).toEqual(['new']);
});
test('a Defer saved before midnight retries its exact lost-response request after midnight',async({page})=>{
 const s=await midnightDefer(page);s.lostReply=true;await page.locator('#focus-action-confirm').click();
 await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');expect(s.audit).toHaveLength(1);
 const original=structuredClone(s.saveCalls[0]);await page.clock.setFixedTime(midnightAfter);await page.locator('#focus-action-retry').click();
 await expect(modal(page)).not.toBeVisible();expect(s.saveCalls).toHaveLength(2);expect(s.saveCalls[1]).toEqual(original);
 expect(s.audit).toHaveLength(1);expect(s.tasks[0].intake_details.follow_up.date).toBe(midnightDate);
 await expect(page.locator('#focus-recent-message')).toContainText('Follow-up moved to '+midnightDate);
});
test('completion and cancellation require review; confirmed save advances selection and persisted Undo restores it',async({page})=>{
 const s=await ready(page);await complete(page);await expect(modal(page)).toContainText('DEMO-101');await expect(page.locator('#focus-action-changes')).toContainText('pending → completed');expect(writes(s)).toBe(0);
 await page.locator('#focus-action-cancel').click();await expect(page.locator('#focus-board-complete')).toBeFocused();expect(writes(s)).toBe(0);
 await complete(page);await confirm(page);await expect(card(page)).toContainText('DEMO-102');await expect(page.locator('#focus-recent-message')).toHaveText('Task completed.');await expect(page.locator('#focus-undo')).toBeEnabled();expect(s.tasks[0].status).toBe('completed');expect(s.audit).toHaveLength(1);
 await page.locator('#focus-undo').click();await expect(page.locator('#focus-action-changes')).toContainText('completed → pending');await confirm(page);await expect(card(page)).toContainText('DEMO-101');expect(s.tasks[0].status).toBe('pending');expect(s.tasks[0].intake_details.completion_summary).toBeUndefined();expect(s.audit).toHaveLength(2);expect(s.audit[1].proposal.match_reason).toMatch(/reversing focus-/);
});
test('deferral previews due separately, cancels safely, preserves business status and deadline, then undoes saved follow-up',async({page})=>{
 const s=await ready(page),before=structuredClone(s.tasks[0]),d=new Date(T.today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+3);const follow=d.toISOString().slice(0,10);
 await page.locator('#focus-board-defer').click();await expect(page.locator('#focus-followup-date')).toBeEditable();await page.locator('#focus-followup-date').fill(follow);await expect(page.locator('#focus-action-dates')).toContainText('Current due date: '+before.intake_details.due.date);await page.keyboard.press('Escape');expect(writes(s)).toBe(0);
 await page.locator('#focus-board-defer').click();await page.locator('#focus-followup-date').fill(follow);await confirm(page);expect(s.tasks[0].intake_details.follow_up.date).toBe(follow);expect(s.tasks[0].status).toBe(before.status);expect(s.tasks[0].intake_details.due).toEqual(before.intake_details.due);await expect(card(page)).toContainText('DEMO-101');
 await page.locator('#focus-undo').click();await confirm(page);expect(s.tasks[0].intake_details.follow_up).toBeUndefined();expect(s.tasks[0].intake_details.due).toEqual(before.intake_details.due);
});
test('ordinary drags and arrow keys only navigate; isolated action handle only prepares a confirmed action',async({page})=>{
 const s=await ready(page);await page.locator('#focus-deck').focus();await page.keyboard.press('ArrowRight');await expect(card(page)).toContainText('DEMO-102');
 await page.locator('#focus-deck').dispatchEvent('pointerdown',{isPrimary:true,button:0,pointerId:1,clientX:200,clientY:200});await page.locator('#focus-deck').dispatchEvent('pointerup',{isPrimary:true,button:0,pointerId:1,clientX:90,clientY:200});await expect(card(page)).toContainText('DEMO-103');expect(s.writes).toEqual([]);
 const h=page.locator('#focus-action-handle');await h.scrollIntoViewIfNeeded();const r=await h.boundingBox();await page.mouse.move(r.x+80,r.y+20);await page.mouse.down();await page.mouse.move(r.x+170,r.y+20,{steps:6});await page.mouse.up();await expect(modal(page)).toBeVisible();await expect(page.locator('#focus-action-heading')).toHaveText('Confirm task completion');expect(s.writes).toEqual([]);await page.keyboard.press('Escape');
 // Closing during the read-only access refresh leaves actions disabled until it settles.
 await expect(h).toBeEnabled();await h.focus();await page.keyboard.press('Enter');await expect(page.locator('#focus-action-choices')).toBeVisible();await page.locator('#focus-choose-defer').click();await expect(page.locator('#focus-action-heading')).toHaveText('Move the follow-up');expect(s.writes).toEqual([]);
});
test('pending writes are single-flight; successful server readback is required before success or card removal',async({page})=>{
 const s=await ready(page);await complete(page);let release;s.saveHold=new Promise(r=>release=r);await page.locator('#focus-action-confirm').click();await expect.poll(()=>writes(s)).toBe(1);await expect(page.locator('#focus-action-confirm')).toBeDisabled();await expect(page.locator('#focus-action-cancel')).toBeDisabled();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await expect(modal(page)).toBeVisible();expect(s.tasks[0].status).toBe('pending');await expect(page.locator('#focus-recent')).not.toBeVisible();expect(writes(s)).toBe(1);s.saveHold=null;release();await expect(modal(page)).not.toBeVisible();expect(s.audit).toHaveLength(1);
});
test('lost response retries the identical request and never duplicates task writes or audit events',async({page})=>{
 const s=await ready(page);s.lostReply=true;await complete(page);await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');await expect(page.locator('#focus-action-retry')).toBeVisible();expect(s.audit).toHaveLength(1);await expect(page.locator('#focus-recent')).not.toBeVisible();
 await page.locator('#focus-action-cancel').click();await expect(page.locator('#focus-board-complete')).toBeDisabled();await page.locator('#focus-resolve-action').click();await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();expect(s.audit).toHaveLength(1);expect(s.saveCalls).toHaveLength(2);expect(s.saveCalls[1]).toEqual(s.saveCalls[0]);
});
test('intervening edits are rejected before save and by the backend; Undo never overwrites newer work',async({page})=>{
 const s=await ready(page);await complete(page);s.tasks[0].updated_at='2026-11-15T13:00:00.123456Z';s.tasks[0].notes='Fictional concurrent staff note';await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('changed');expect(writes(s)).toBe(0);await page.locator('#focus-action-cancel').click();
 await complete(page);s.beforeSave=state=>{state.tasks[0].updated_at='2026-11-15T14:00:00.123456Z'};await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('changed');expect(s.audit).toHaveLength(0);await page.locator('#focus-action-cancel').click();
 await complete(page);await confirm(page);s.tasks[0].updated_at='2026-11-15T22:00:00.123457Z';await page.locator('#focus-refresh').click();await expect(page.locator('#focus-undo')).toBeDisabled();await expect(page.locator('#focus-undo-note')).toContainText('task changed');expect(s.tasks[0].notes).toBe('Fictional concurrent staff note');expect(s.audit).toHaveLength(1);
});
test('revoked permission, missing task and server validation failures retain records and prevent unsafe confirmation',async({page})=>{
 const s=await ready(page);await complete(page);s.denyWrite=true;await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Active editor access');expect(s.audit).toHaveLength(0);await page.locator('#focus-action-cancel').click();s.denyWrite=false;
 await complete(page);s.tasks=s.tasks.slice(1);await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('changed');await page.locator('#focus-action-cancel').click();expect(s.audit).toHaveLength(0);
 s.readRole='viewer';await page.locator('#focus-refresh').click();await expect(page.locator('#focus-board-complete')).toBeDisabled();await expect(page.locator('#focus-action-permission')).toBeVisible();
});
test('sign-out invalidates pending UI and never reports a late mutation as a success',async({page})=>{
 const s=await ready(page);await complete(page);let release;s.saveHold=new Promise(r=>release=r);await page.locator('#focus-action-confirm').click();await expect.poll(()=>writes(s)).toBe(1);await page.evaluate(()=>window.OpsCloud.signOut());await expect(modal(page)).not.toBeVisible();await expect(page.locator('#focus-action-task-title')).toHaveText('Task action');await expect(page.locator('#focus-recent')).not.toBeVisible();s.saveHold=null;release();await expect(page.locator('#focus-action-feedback')).toHaveText('');await expect(card(page)).toHaveCount(0);
});
test('Focus Mode keeps Previous/Next and Review; actions return to the selected task and trap focus',async({page})=>{
 const s=await ready(page);await page.locator('.focus-open-task').click();await page.locator('#focus-detail-defer').click();await expect(page.locator('#focus-followup-date')).toBeEditable();await page.locator('#focus-action-cancel').focus();await page.keyboard.press('Shift+Tab');await expect(page.locator('#focus-followup-date')).toBeFocused();await page.locator('#focus-action-confirm').focus();await page.keyboard.press('Tab');await expect(page.locator('#focus-followup-date')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#focus-detail-defer')).toBeFocused();await expect(page.locator('#focus-detail-dialog')).toBeVisible();
 await page.locator('#focus-detail-next').click();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-102');await page.locator('#focus-detail-review').click();await expect(page.locator('#today-edit-dialog')).toBeVisible();expect(s.audit).toHaveLength(0);
});
test('actions, confirmations and Undo fit four widths, respect reduced motion and pass scoped axe',async({page})=>{
 test.setTimeout(120000);await ready(page);await page.emulateMedia({reducedMotion:'reduce'});await complete(page);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const fit=await modal(page).evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth});expect(fit).toBe(true);}
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){await page.evaluate(theme=>document.documentElement.dataset.opsTheme=theme,theme);const scan=await new AxeBuilder({page}).include('#focus-action-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),theme).toEqual([]);}expect(await modal(page).evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
});
test('more than 1000 active tasks can be completed, deferred and restored with the shared paginated snapshot',async({page})=>{
 const s=await ready(page,1007);s.tasks[1006].task_title='ZZ Fictional last task';await page.locator('#focus-refresh').click();await expect(card(page)).toBeVisible();await page.locator('#focus-deck').focus();await page.keyboard.press('End');await expect(card(page)).toContainText('DEMO-1107');await complete(page);await confirm(page);await expect(page.locator('#focus-count')).toHaveText('1006 active tasks');await page.locator('#focus-undo').click();await confirm(page);await expect(page.locator('#focus-count')).toHaveText('1007 active tasks');expect(s.audit).toHaveLength(2);await expect(card(page)).toContainText('DEMO-1107');
});

test('failed writes and failed Undo are explicit and a retry repeats only the identical reversal',async({page})=>{
 const s=await ready(page);await complete(page);s.failWrite=true;await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');expect(s.audit).toHaveLength(0);expect(s.tasks[0].status).toBe('pending');s.failWrite=false;await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();
 await page.locator('#focus-undo').click();s.failWrite=true;await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');expect(s.tasks[0].status).toBe('completed');expect(s.audit).toHaveLength(1);s.failWrite=false;await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();expect(s.tasks[0].status).toBe('pending');expect(s.audit).toHaveLength(2);expect(s.saveCalls[3]).toEqual(s.saveCalls[2]);
});
test('a newer edit after the server save is shown explicitly and never overwritten during recovery',async({page})=>{
 const s=await ready(page);await complete(page);s.lostReply=true;await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');s.tasks[0].updated_at='2026-11-15T23:00:00.000001Z';s.tasks[0].notes='Fictional newer staff note after completion';await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();await expect(page.locator('#focus-action-feedback')).toContainText('changed before readback');await expect(page.locator('#focus-recent')).not.toBeVisible();expect(s.audit).toHaveLength(1);expect(s.tasks[0].notes).toBe('Fictional newer staff note after completion');await expect(page.locator('#focus-board-complete')).toBeEnabled();
});
test('session expiration clears a prepared action and never submits or reports a task save',async({page})=>{
 const s=await ready(page);await complete(page);s.expireSession=true;await page.locator('#focus-action-confirm').click();await expect(modal(page)).not.toBeVisible();await expect(page.locator('#focus-action-task-code')).toHaveText('');await expect(page.locator('#focus-action-feedback')).toHaveText('');expect(s.audit).toHaveLength(0);expect(s.tasks[0].status).toBe('pending');
});
test('refresh during review clears stale content; an unrepresentable previous value keeps Undo unavailable',async({page})=>{
 const s=await ready(page);await complete(page);s.tasks[0].updated_at='2026-11-15T14:00:00.000001Z';await page.evaluate(()=>window.OpsToday.refresh());await expect(page.locator('#focus-action-confirm')).toBeDisabled();await expect(page.locator('#focus-action-error')).toContainText('unsaved input is kept');await expect(page.locator('#focus-completion-summary')).toHaveValue('Fictional inspection finished and report filed.');await page.keyboard.press('Escape');expect(s.audit).toHaveLength(0);
 s.tasks[0].intake_details.follow_up=null;await page.locator('#focus-board-defer').click();await expect(page.locator('#focus-followup-date')).toBeEditable();await confirm(page);await expect(page.locator('#focus-undo')).toBeDisabled();await expect(page.locator('#focus-undo-note')).toContainText('restored exactly');expect(s.audit).toHaveLength(1);
});
test('native mobile action-zone swipes prepare only; buttons support confirmed deferral and Undo',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await context.newPage(),s=await ready(page),cdp=await context.newCDPSession(page);
 const h=page.locator('#focus-action-handle');await h.scrollIntoViewIfNeeded();const r=await h.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-12*i,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('#focus-action-heading')).toHaveText('Move the follow-up');await expect(page.locator('#focus-followup-date')).toBeEditable();expect(s.writes).toEqual([]);await page.locator('#focus-action-cancel').tap();await expect(modal(page)).not.toBeVisible();await page.locator('#focus-board-defer').tap();await expect(page.locator('#focus-followup-date')).toBeEditable();
 const confirmBox=await page.locator('#focus-action-confirm').boundingBox(),cx=confirmBox.x+12,cy=confirmBox.y+confirmBox.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+60,y:cy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));expect(s.saveCalls).toHaveLength(0);await expect(modal(page)).toBeVisible();
 await page.locator('#focus-action-confirm').tap();await expect(modal(page)).not.toBeVisible();expect(s.audit).toHaveLength(1);await page.locator('#focus-undo').tap();await page.locator('#focus-action-confirm').tap();await expect(modal(page)).not.toBeVisible();expect(s.audit).toHaveLength(2);await context.close();
});
test('a slow timed-out save remains unverified and recovers only through the identical request',async({page})=>{
 const s=await ready(page);await complete(page);await page.clock.install();let release;s.saveHold=new Promise(r=>release=r);await page.locator('#focus-action-confirm').click();await expect.poll(()=>writes(s)).toBe(1);await page.clock.fastForward(21000);await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');await expect(page.locator('#focus-recent')).not.toBeVisible();s.saveHold=null;release();await expect.poll(()=>s.audit.length).toBe(1);await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();expect(s.saveCalls[1]).toEqual(s.saveCalls[0]);expect(s.audit).toHaveLength(1);
});
test('an incomplete receipt never reports success; server receipt recovery is idempotent',async({page})=>{
 const s=await ready(page);s.badReceipt=true;await complete(page);await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');await expect(page.locator('#focus-recent')).not.toBeVisible();expect(s.audit).toHaveLength(1);await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();expect(s.audit).toHaveLength(1);await expect(page.locator('#focus-recent-message')).toHaveText('Task completed.');
});
test('Center Focus actions keep success, persisted Undo and uncertain-request recovery reachable inside the modal',async({page})=>{
 const s=await ready(page);await page.locator('.focus-open-task').click();await page.locator('#focus-detail-defer').click();await expect(page.locator('#focus-followup-date')).toBeEditable();await confirm(page);await expect(page.locator('#focus-detail-recent')).toBeVisible();await expect(page.locator('#focus-detail-undo')).toBeEnabled();
 await page.setViewportSize({width:320,height:844});const scan=await new AxeBuilder({page}).include('#focus-detail-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>v.id)).toEqual([]);await page.locator('#focus-detail-undo').click();await confirm(page);expect(s.tasks[0].intake_details.follow_up).toBeUndefined();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-101');
 await page.locator('#focus-detail-complete').click();await page.locator('#focus-completion-summary').fill('Fictional completed inspection.');s.lostReply=true;await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');await page.locator('#focus-action-cancel').click();await expect(page.locator('#focus-detail-resolve-action')).toBeVisible();await page.locator('#focus-detail-resolve-action').click();await page.locator('#focus-action-retry').click();await expect(modal(page)).not.toBeVisible();await expect(page.locator('#focus-detail-code')).toHaveText('DEMO-102');await expect(page.locator('#focus-detail-undo')).toBeEnabled();expect(s.audit).toHaveLength(3);
});
test('uncertain-action recovery rechecks access before restoring any private preview',async({page})=>{
 const s=await ready(page);s.lostReply=true;await complete(page);await page.locator('#focus-action-confirm').click();await expect(page.locator('#focus-action-error')).toContainText('Outcome not verified');await page.locator('#focus-action-cancel').click();s.readRole='viewer';await page.locator('#focus-resolve-action').click();await expect(page.locator('#focus-action-error')).toContainText('access is unavailable');await expect(page.locator('#focus-action-task-code')).toHaveText('');await expect(page.locator('#focus-completion-summary')).toHaveValue('');expect(s.audit).toHaveLength(1);expect(s.saveCalls).toHaveLength(1);
});
