'use strict';
const {test,expect}=require('@playwright/test'),AxeBuilder=require('@axe-core/playwright').default;
const {morningMock,signIn,ORIGIN,draft,USER}=require('./morning-fixtures.cjs');
const {saved}=require('./daily-fixtures.cjs'),{openAdvanced}=require('./ui-helpers.cjs');
test.use({viewport:{width:1440,height:1080}});
async function open(page,s){await page.goto(ORIGIN+'/#/morning');await signIn(page);await expect(page.locator('#daily-counts')).toContainText('active tasks');await page.locator('#plan-pending-panel').evaluate(n=>n.open=true);await page.locator('#plan-pending-refresh').click();return s}
test('ChatGPT proposal requires native review and exact confirmation; cancellation preserves the draft and writes no approval',async({page})=>{
 const s=await morningMock(page);const p=saved(s).event_metadata.plan;
 p.text="Good Morning Leslie,\n\nHope you're doing well!\n\nI'm getting started for the day. My priorities today are:\n- Fictional evidence: Verify the saved source.\n- Tenant Communications: Review new messages.";
 const request=s.addPlanProposal(p);await open(page,s);
 await page.locator('#morning-secondary').evaluate(n=>n.open=true);await draft(page);const wording=await page.locator('#sod-output').inputValue();
 const review=page.locator('#plan-pending-list').getByRole('button',{name:'Review plan'});await review.click();await expect(page.locator('#morning-approve-preview')).toHaveText(p.text);await expect(page.locator('#morning-approve-save')).toBeDisabled();await expect(page.locator('#morning-approve-source-list')).toContainText(s.tasks[0].task_code);expect(s.events).toEqual([]);
 await page.keyboard.press('Escape');await expect(review).toBeFocused();expect(s.events).toEqual([]);expect(s.approvalPosts).toEqual([]);await expect(page.locator('#sod-output')).toHaveValue(wording);
 await review.click();await page.locator('#morning-approve-confirm').check();await page.locator('#morning-approve-save').click();await expect(page.locator('#morning-approve-dialog')).toBeHidden();await expect(page.locator('#daily-plan')).toContainText(p.text);await expect(page.locator('#sod-output')).toHaveValue(wording);
 expect(s.events).toHaveLength(1);expect(s.events[0].review_proof.request_id).toBe(request.review.proposal_id);expect(s.events[0].actor_id).toBe(USER);expect(s.planCalls.some(c=>c.action==='get'&&c.payload.event_id===s.events[0].id)).toBe(true);expect(s.writes.every(w=>JSON.parse(w.body).action==='approve')).toBe(true);expect(s.rawJournal.filter(r=>r.method==='POST')).toEqual([]);
});
test('missing plan backend and generic journal JSON fail closed without preventing existing tasks',async({page})=>{
 const s=await morningMock(page);const old=saved(s);delete old.review_proof;s.events=[old];await open(page,s);await expect(page.locator('#daily-plan-status')).toHaveText('No approved SOD');await expect(page.locator('#daily-plan')).not.toContainText(old.event_metadata.plan.text);
 await page.locator('#morning-secondary').evaluate(n=>n.open=true);await draft(page);s.planUnavailable=true;await page.locator('#morning-approve-open').click();await expect(page.locator('#morning-approve-status')).toContainText('not enabled yet');await expect(page.locator('#morning-approve-save')).toBeDisabled();await page.keyboard.press('Escape');await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-plan-status')).toHaveText('Stale / unavailable');await expect(page.locator('#daily-counts')).toContainText('9 active');expect(s.approvalPosts).toEqual([]);expect(s.rawJournal.filter(r=>r.method==='POST')).toEqual([]);
});
test('loading native review traps focus and permits cancellation; late source replies cannot reopen after cancel or sign-out',async({page})=>{
 const s=await morningMock(page),p=saved(s).event_metadata.plan;p.sources['task:'+s.tasks[0].id].body='Fictional late source evidence';s.addPlanProposal(p);await open(page,s);
 let release;s.reviewHold=new Promise(r=>release=r);const review=page.locator('#plan-pending-list').getByRole('button',{name:'Review plan'});await review.click();await expect(page.locator('#morning-approve-confirm')).toBeDisabled();await expect.poll(()=>s.planCalls.filter(c=>c.action==='review').length).toBe(1);
 await page.keyboard.press('Shift+Tab');await expect(page.locator('#morning-approve-cancel')).toBeFocused();await page.keyboard.press('Escape');await expect(review).toBeFocused();const reply=page.waitForResponse(r=>r.url().endsWith('/rpc/ops_morning_plan')&&r.request().postDataJSON()?.action==='review');s.reviewHold=null;release();await (await reply).finished();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await expect(page.locator('#morning-approve-dialog')).toBeHidden();await expect(page.locator('#morning-approve-source-list')).toBeEmpty();expect(s.approvalPosts).toEqual([]);
 s.reviewHold=new Promise(r=>release=r);await review.click();await expect.poll(()=>s.planCalls.filter(c=>c.action==='review').length).toBe(2);await page.evaluate(()=>window.OpsCloud.signOut());const late=page.waitForResponse(r=>r.url().endsWith('/rpc/ops_morning_plan')&&r.request().postDataJSON()?.action==='review');s.reviewHold=null;release();await (await late).finished();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await expect(page.locator('#morning-approve-preview')).toBeEmpty();await expect(page.locator('#morning-approve-source-list')).toBeEmpty();await expect(page.locator('#plan-pending-list')).toBeEmpty();await expect(page.locator('#morning-approve-dialog')).toBeHidden();expect(s.approvalPosts).toEqual([]);
});
test('server conflict and lost independent readback cannot claim approval or silently overwrite a plan',async({page})=>{
 const s=await morningMock(page);s.addPlanProposal(saved(s).event_metadata.plan);await open(page,s);await page.locator('#plan-pending-list').getByRole('button',{name:'Review plan'}).click();s.conflictApproval=true;await page.locator('#morning-approve-confirm').check();await page.locator('#morning-approve-save').click();await expect(page.locator('#morning-approve-status')).toContainText('changed since review');expect(s.events).toEqual([]);await expect(page.locator('#morning-approve-save')).toBeDisabled();await page.keyboard.press('Escape');
 s.conflictApproval=false;s.afterApproval=state=>state.denyReadback=true;await page.locator('#plan-pending-list').getByRole('button',{name:'Review plan'}).click();await page.locator('#morning-approve-confirm').check();await page.locator('#morning-approve-save').click();await expect(page.locator('#morning-approve-status')).toContainText('unverified');await expect(page.locator('#daily-plan')).not.toContainText('Fictional approved SOD 1');await page.keyboard.press('Escape');s.denyReadback=false;await page.locator('#morning-secondary').evaluate(n=>n.open=true);await page.locator('#morning-check-approval').click();await expect(page.locator('#morning-approval-feedback')).toContainText('verified');expect(s.events).toHaveLength(1);expect(s.approvalPosts).toHaveLength(2);
});
test('plan review sources are text, desktop dialog traps focus, and sign-out clears exact source evidence',async({page})=>{
 const s=await morningMock(page),p=saved(s).event_metadata.plan;p.sources['task:'+s.tasks[0].id].body='Fictional pasted message <img src=x onerror=alert(1)>';s.addPlanProposal(p);await open(page,s);await page.locator('#plan-pending-list').getByRole('button',{name:'Review plan'}).click();await expect(page.locator('#morning-approve-confirm')).toBeEnabled();await page.locator('#morning-approve-dialog').getByText('Review source references',{exact:true}).click();await page.locator('#morning-approve-source-list summary').click();await expect(page.locator('#morning-approve-source-list pre')).toContainText('<img');await expect(page.locator('#morning-approve-source-list img')).toHaveCount(0);
 await page.locator('#morning-approve-cancel').focus();await page.keyboard.press('Tab');await expect(page.locator('#morning-approve-dialog').getByText('Review source references',{exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#morning-approve-source-list summary')).toBeFocused();
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1080});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
 const scan=await new AxeBuilder({page}).include('#morning-approve-dialog').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>v.id)).toEqual([]);
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#morning-approve-dialog')).toBeHidden();await expect(page.locator('#morning-approve-source-list')).toBeEmpty();await expect(page.locator('#plan-pending-list')).toBeEmpty();expect(s.approvalPosts).toEqual([]);
});
test('administrator capability and per-user native consent are independent, explicit and read back',async({page})=>{
 const s=await morningMock(page);await page.route('**/rest/v1/rpc/ops_task_agent',async route=>{const a=route.request().postDataJSON().action;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(a==='connections'?{schema_version:'oaktown.task-connection.v1',can_manage:true,clients:[{client_id:'fictional-chatgpt',label:'Fictional ChatGPT',enabled:true,can_write:false}]}:[])})});await page.goto(ORIGIN);await signIn(page);await expect(page.locator('#today-status')).toContainText('Updated');await openAdvanced(page);await page.locator('#task-connection>summary').click();await page.locator('#task-connection-admin>summary').click();await page.locator('#plan-capabilities>summary').click();await expect(page.locator('#plan-capability-status')).toContainText('Saved settings loaded');await expect(page.locator('#plan-capability-read')).not.toBeChecked();await expect(page.locator('#plan-capability-submit')).not.toBeChecked();
 await page.locator('#plan-capability-submit').check();await page.locator('#plan-capability-confirm').check();await page.locator('#plan-capability-form button').click();await expect(page.locator('#plan-capability-status')).toContainText('requires explicit read');expect(s.planCalls.filter(c=>c.action==='configure')).toHaveLength(0);
 await page.locator('#plan-capability-read').check();await page.locator('#plan-capability-form button').click();await expect(page.locator('#plan-capability-status')).toContainText('saved and verified');expect(s.planClients[0].my_can_read_plans).toBe(false);
 await page.locator('#plan-consent-panel>summary').click();
 const form=page.getByRole('form',{name:'Fictional ChatGPT plan access'});
 const read=form.getByLabel('Allow this connection to read approved SODs');
 const submit=form.getByLabel('Allow this connection to submit proposals for my review');
 await expect(form.getByText('Client capabilities: read + proposal submission',{exact:true})).toBeVisible();
 await expect(read).not.toBeChecked();
 await expect(submit).not.toBeChecked();
 expect(s.planCalls.filter(c=>c.action==='consent')).toHaveLength(0);
 await read.check();
 await submit.check();
 await form.getByLabel('I reviewed these permissions',{exact:true}).check();
 await form.getByRole('button',{name:'Save my plan consent'}).click();
 await expect(form.getByRole('status')).toContainText('saved and verified');
 expect(s.planClients[0].my_can_submit_plans).toBe(true);
 await form.getByRole('button',{name:'Revoke my plan consent'}).click();
 await expect(form.getByRole('status')).toContainText('revoked and verified');
 await expect(read).not.toBeChecked();
 await expect(submit).not.toBeChecked();
 expect(s.planClients[0].my_can_submit_plans).toBe(false);
 const scan=await new AxeBuilder({page}).include('#plan-consent-panel').include('#plan-capabilities').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>v.id)).toEqual([]);await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#plan-consent-list')).toBeEmpty();await expect(page.locator('#plan-capability-client')).toBeEmpty();expect(s.writes).toEqual([]);
});
