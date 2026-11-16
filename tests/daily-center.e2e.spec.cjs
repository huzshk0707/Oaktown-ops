const {test,expect}=require('@playwright/test');
const {morningMock,signIn,ORIGIN,USER}=require('./morning-fixtures.cjs');
const T=require('../today-model.js');
const {saved}=require('./daily-fixtures.cjs');
async function open(page,count=9){const s=await morningMock(page,count);s.events=[saved(s)];await page.goto(ORIGIN+'/#/morning');await signIn(page);await expect(page.locator('#daily-plan-status')).toHaveText('Approved');return s}
test.use({viewport:{width:1440,height:1080}});
test('dashboard automatically reads another authorized staff approval, latest valid plan and shared counts',async({page})=>{
 const s=await open(page);await expect(page.locator('#daily-plan')).toContainText(s.events[0].actor_id);await expect(page.locator('#daily-counts')).toContainText('9 active tasks');await expect(page.locator('#daily-priorities .daily-task-title').first()).toContainText(s.tasks[0].task_title);await expect(page.locator('#daily-assignments')).toContainText('Unassigned');await expect(page.locator('#daily-followups')).toContainText('Example Reviewer');await expect(page.locator('#daily-deposit-title').locator('..')).toContainText('Deposit updates');await expect(page.locator('.daily-disconnected')).toHaveText('Not connected');await expect(page.locator('#morning-secondary')).not.toHaveAttribute('open');
 s.events.push(saved(s,2,3));const invalid=saved(s,3,100);invalid.event_metadata.plan.text='';s.events.push(invalid);await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-plan')).toContainText('Fictional approved SOD 2');await expect(page.locator('#daily-plan')).toContainText('Revision 3');expect(s.writes).toEqual([]);
 await page.locator('#daily-start').click();await expect(page).toHaveURL(/#\/focus$/);await expect(page.locator('#focus-morning-plan')).toContainText('Approved SOD');expect(await page.evaluate(()=>window.OpsMorning.approvedTaskIds())).toContain(s.tasks[0].id);await page.locator('#focus-morning-review').click();await expect(page.locator('#daily-plan')).toContainText('Fictional approved SOD 2');
});
test('refresh preserves draft wording, flags stale reads, clears denied plans and supports readonly staff',async({page})=>{
 const s=await open(page);await page.locator('#morning-secondary').evaluate(n=>n.open=true);await page.locator('#sod-extras').fill('Fictional private draft: Keep this wording.');s.historyFail=true;await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-plan-status')).toHaveText('Stale / unavailable');await expect(page.locator('#daily-state')).toContainText('stale');await expect(page.locator('#daily-plan')).toContainText('Fictional approved SOD 1');await expect(page.locator('#sod-extras')).toHaveValue('Fictional private draft: Keep this wording.');
 s.historyFail=false;s.tasks[0].status='completed';await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-counts')).toContainText('8 active tasks');await expect(page.locator('#daily-plan')).toContainText('changed or is no longer active');
 await page.route('**/rest/v1/rpc/ops_morning_plan',r=>r.request().postDataJSON().action==='list'?r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Denied'})}):r.fallback());await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-plan-status')).toHaveText('Access denied');await expect(page.locator('#daily-plan')).not.toContainText('Fictional approved SOD 1');expect(s.writes).toEqual([]);
});
test('date selection rejects late old-date results and sign-out rejects private callbacks',async({page})=>{
 const s=await open(page);let release;s.historyHold=new Promise(r=>release=r);await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-plan-status')).toHaveText('Loading');await page.locator('#daily-date').fill('2026-01-01');await page.locator('#daily-date').dispatchEvent('change');s.historyHold=null;release();await expect(page.locator('#daily-plan-status')).toHaveText('No approved SOD');await expect(page.locator('#daily-plan')).not.toContainText('Fictional approved SOD');await page.locator('#daily-start').click();await page.locator('#focus-return-morning').click();await expect(page.locator('#daily-date')).toHaveValue('2026-01-01');
 s.historyHold=new Promise(r=>release=r);await page.locator('#morning-command-refresh').click();await page.evaluate(()=>window.OpsCloud.signOut());s.historyHold=null;release();await expect(page.locator('#daily-dashboard')).not.toBeVisible();await expect(page.locator('#daily-plan')).not.toContainText('Fictional');await expect(page.locator('#daily-priorities')).toBeEmpty();
});
test('unapproved staff role cannot sign in or see private dashboard records',async({page})=>{
 const s=await morningMock(page);s.role='viewer';s.readRole='viewer';s.events=[saved(s)];await page.goto(ORIGIN+'/#/morning');await signIn(page);await expect(page.locator('#pilot-auth-status')).toContainText('access not approved');await expect(page.locator('#daily-dashboard')).not.toBeVisible();await expect(page.locator('#daily-plan')).not.toContainText('Fictional');expect(s.writes).toEqual([]);
});
test('desktop dashboard fits required widths and keeps shared snapshot order',async({page})=>{
 const s=await open(page);for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1080});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#daily-start')).toBeVisible()}
 expect(s.reads.filter(x=>x.includes('offset=0')).length).toBeLessThanOrEqual(3);expect(s.writes).toEqual([]);
});
module.exports={saved};

test('approval pagination finds a valid plan beyond invalid rows and keeps the selected Eastern date',async({page})=>{
 const s=await morningMock(page);s.events=Array.from({length:101},(_,i)=>{const r=saved(s,i+10);r.occurred_at='2026-11-16T23:00:00Z';r.event_metadata.plan.stale=['unresolved'];return r});s.events.push(saved(s));await page.goto(ORIGIN+'/#/morning');await signIn(page);await expect(page.locator('#daily-plan')).toContainText('Fictional approved SOD 1');await expect(page.locator('#daily-date')).toHaveValue(T.today());expect(s.writes).toEqual([]);
});
test('session expiration clears dashboard tasks and approved source text',async({page})=>{
 const s=await open(page);s.fail=true;s.failStatus=401;s.expireSession=true;await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-dashboard')).not.toBeVisible();await expect(page.locator('#daily-priorities')).toBeEmpty();await expect(page.locator('#daily-plan')).not.toContainText('Fictional');expect(s.writes).toEqual([]);
});
