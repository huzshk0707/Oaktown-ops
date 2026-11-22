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
test('desktop first view answers the three questions and enters the displayed task in Focus',async({page})=>{
 const s=await open(page);
 const focus=s.tasks.find(task=>task.status==='in_progress');
 for(const width of [1280,1440,1920]){
  await page.setViewportSize({width,height:640});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['daily-priorities','daily-followups','daily-pickup','daily-start']){
   await expect(page.locator('#'+id)).toBeInViewport({ratio:1});
  }
 }
 await expect(page.locator('#daily-priorities')).toContainText('Overdue');
 await expect(page.locator('#daily-followups')).toContainText('Example Reviewer');
 const F=require('../focus-board-model.js');
 const expected=F.order(s.tasks,T.today()).filter(task=>F.lane(task,T.today())!=='remaining').map(task=>task.task_code+' · '+task.task_title);
 await expect(page.locator('#daily-priorities .daily-task-title')).toHaveText(expected.slice(0,3));
 await page.locator('#daily-priorities .daily-show-all').click();
 await expect(page.locator('#daily-priorities .daily-task-title')).toHaveText(expected);
 await expect(page.locator('#daily-pickup')).toContainText(focus.task_title);
 await expect(page.locator('#daily-pickup')).toContainText(focus.intake_details.next_action);
 await page.locator('#daily-start').click();
 await expect(page.locator('.focus-card[data-offset="0"]')).toHaveAttribute('data-task-id',focus.id);
 await page.locator('#focus-next').click();
 const selected=await page.locator('.focus-card[data-offset="0"]').getAttribute('data-task-id');
 await page.locator('#focus-return-morning').click();
 await expect(page.locator('#daily-pickup')).toContainText('Last shown in Focus');
 const savedTask=s.tasks.find(task=>task.id===selected);
 await expect(page.locator('#daily-pickup')).toContainText(savedTask.task_title);
 await page.setViewportSize({width:1280,height:640});
 savedTask.intake_details.next_action='Review the saved source before continuing. '.repeat(22);
 await page.locator('#morning-command-refresh').click();
 await expect(page.locator('#daily-pickup .daily-pickup-action')).toHaveText(savedTask.intake_details.next_action.trim());
 await expect(page.locator('#daily-start')).toBeInViewport({ratio:1});
 expect(s.writes).toEqual([]);
});
module.exports={saved};

test('approval pagination finds a valid plan beyond invalid rows and keeps the selected Eastern date',async({page})=>{
 const s=await morningMock(page);s.events=Array.from({length:101},(_,i)=>{const r=saved(s,i+10);r.occurred_at='2026-11-16T23:00:00Z';r.event_metadata.plan.stale=['unresolved'];return r});s.events.push(saved(s));await page.goto(ORIGIN+'/#/morning');await signIn(page);await expect(page.locator('#daily-plan')).toContainText('Fictional approved SOD 1');await expect(page.locator('#daily-date')).toHaveValue(T.today());expect(s.writes).toEqual([]);
});
test('session expiration clears dashboard tasks, the pickup step and approved source text',async({page})=>{
 const s=await open(page);s.fail=true;s.failStatus=401;s.expireSession=true;await page.locator('#morning-command-refresh').click();await expect(page.locator('#daily-dashboard')).not.toBeVisible();await expect(page.locator('#daily-priorities')).toBeEmpty();await expect(page.locator('#daily-pickup')).toBeEmpty();await expect(page.locator('#daily-plan')).not.toContainText('Fictional');expect(s.writes).toEqual([]);
});

test('high-priority actionable undated tasks appear in attention without inventing waiting dependencies',async({page})=>{
 const s=await open(page,2);
 const mk=(id,code,title,status,priority,details)=>({id,task_code:code,task_title:title,status,priority,assigned_label:null,assigned_user_id:null,due_at:null,archived_at:null,property_id:null,unit_id:null,tenancy_id:null,lease_id:null,workflow_key:'maintenance',intake_details:details});
 const a06=mk('a0600000-0000-4000-8000-000000000001','A06','Mockernut Lane inspection follow-up repairs','pending','high',{next_action:'Confirm repair provider and exact Monday access time.'});
 const contact=mk('a0600000-0000-4000-8000-000000000002','DEMO-CALL','Contact tenant for access','pending','high',{next_action:'Call tenant to request an access window.'});
 const blocked=mk('a0600000-0000-4000-8000-000000000003','DEMO-BLOCK','Await contractor availability','blocked','high',{next_action:'Check the repair schedule.',blocked_reason:'Contractor availability not confirmed.'});
 const completed=mk('a0600000-0000-4000-8000-000000000004','DEMO-DONE','Completed repair','completed','high',{next_action:'Already completed.'});
 s.tasks.push(a06,contact,blocked,completed);
 await page.locator('#morning-command-refresh').click();
 for(const width of [1280,1440,1920]){
  await page.setViewportSize({width,height:640});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#daily-priorities')).toContainText('A06');
  await expect(page.locator('#daily-priorities')).toContainText('High priority · actionable');
 }
 await expect(page.locator('#daily-priorities')).toContainText('Contact tenant for access');
 await expect(page.locator('#daily-priorities')).not.toContainText('Await contractor availability');
 await expect(page.locator('#daily-priorities')).not.toContainText('Completed repair');
 await expect(page.locator('#daily-followups')).toContainText('Await contractor availability');
 await expect(page.locator('#daily-followups')).not.toContainText('A06');
 await expect(page.locator('#daily-followups')).not.toContainText('Contact tenant for access');
 expect(s.writes).toEqual([]);
});
