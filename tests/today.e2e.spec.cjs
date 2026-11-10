'use strict';
const {chooseTheme,navigate,openAdvanced,openTasks,openTaskSettings}=require('./ui-helpers.cjs');
const {test,expect}=require('@playwright/test');
const M=require('../today-model.js');
test.use({browserName:'chromium'});
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pad=n=>String(n).padStart(2,'0');
function offset(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return [d.getUTCFullYear(),pad(d.getUTCMonth()+1),pad(d.getUTCDate())].join('-')}
async function setup(page){
 const day=M.today();
 const s={reads:0,fail:false,rejectEdit:false,viewer:false,edits:[],archives:[],events:[],reportRequests:[],failArchiveAt:0,loseArchiveReply:false,
 tasks:[
  {id:'1',task_title:'Fictional overdue inspection follow-up',status:'pending',priority:'urgent',archived_at:null,intake_details:{due:{date:offset(day,-1)}},updated_at:'2026-10-29T10:00:00Z',assigned_label:null,notes:null,property_id:null,unit_id:null,lease_id:null,renewal_case_id:null},
  {id:'2',task_title:'Fictional tenant reply due today',status:'waiting',priority:'normal',archived_at:null,updated_at:'2026-10-29T10:00:00Z',intake_details:{follow_up:{date:day}}},
  {id:'3',task_title:'Undated imported task',status:'pending',priority:'normal',archived_at:null,updated_at:'2026-10-29T10:00:00Z',intake_details:{}},
  {id:'4',task_title:'Private archived item',status:'pending',priority:'high',archived_at:day+'T00:00:00Z',intake_details:{due:{date:offset(day,-5)}}}
 ],
 renewals:[{id:'r1',property_id:'p1',unit_id:'u1',lease_id:'l1',recorded_end:offset(day,12),oak_record_id:'FICTIONAL-001',is_applicable:true}],
 properties:[{id:'p1',street_address:'100 Fictional Road'},{id:'p2',street_address:'200 Fictional Road'}],
 units:[{id:'u1',property_id:'p1',unit_label:'Unit 1'},{id:'u2',property_id:'p2',unit_label:'Unit 2'}],
 leases:[{id:'l1',unit_id:'u1',lease_label:'Fictional Lease 1',term_start:'2026-01-01',term_end:'2026-12-31',lease_status:'active'},{id:'l2',unit_id:'u2',lease_label:'Other Lease',term_start:'2026-01-01',term_end:'2026-12-31',lease_status:'active'}]
 };
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===ORIGIN)return route.continue();
  if(url.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const p=url.pathname;
  if(p==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:'example@example.invalid'}});
  if(p==='/auth/v1/user')return reply({id:USER,email:'example@example.invalid'});
  if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:s.viewer?'viewer':'admin',is_active:true}]);
  if(p==='/rest/v1/ops_events'){
   if(url.searchParams.get('event_type')!=='eq.task_work_recorded')return reply([]);
   expect(url.searchParams.get('select')).toContain('occurred_at');expect(url.searchParams.get('order')).toBe('occurred_at.asc,id.asc');
   s.reportRequests.push({method:req.method(),date:url.searchParams.get('event_metadata->activity->>work_date')});
   if(s.holdReport)await s.holdReport;
   if(s.failReport)return reply({message:'Report unavailable'},503);
   return reply(s.events);
  }
  if(p==='/rest/v1/ops_tasks'){
   const selected=url.searchParams.get('select')||'';
   if(selected.startsWith('id,task_title,status,priority')||selected.startsWith('id,task_code,parent_task_id,task_title')){
    s.reads++;if(s.fail)return reply({message:'RLS request failed'},403);
   }
   const codeFilter=url.searchParams.get('task_code');
   if(codeFilter?.startsWith('in.(')){
    const codes=codeFilter.slice(4,-1).split(',');
    return reply(s.tasks.filter(t=>codes.includes(t.task_code)));
   }
   return reply(s.tasks);
  }
  if(p==='/rest/v1/rpc/ops_task_set_archived'){
    const b=req.postDataJSON(),task=s.tasks.find(t=>t.id===b.p_task);s.archives.push(b);
    if(s.archives.length===s.failArchiveAt)return reply({message:'Task changed; refresh.'},409);
    if(s.viewer||!task||task.updated_at!==b.p_expected_updated_at)return reply({message:'Denied or stale task'},403);
    task.archived_at=b.p_archived?new Date().toISOString():null;task.updated_at=new Date().toISOString();
    if(s.holdArchive)await s.holdArchive;
    if(s.failReadsAfterArchive)s.fail=true;
    if(s.loseArchiveReply)return route.abort('connectionreset');
    return reply({task_id:task.id,archived_at:task.archived_at,updated_at:task.updated_at});
  }
  if(p==='/rest/v1/rpc/ops_task_update_v1'){
    const b=req.postDataJSON(),task=s.tasks.find(t=>t.id===b.p_task);
    s.edits.push(b);
    if(s.rejectEdit||!task||task.updated_at!==b.p_expected_updated_at)return reply({message:'Task changed since review; refresh.'},409);
    if(s.viewer)return reply({message:'Permission denied'},403);
    if(b.p_changes.unit_id==='u1'&&b.p_changes.property_id!=='p1')return reply({message:'Unit not in property'},400);
    if(b.p_changes.lease_id==='l2'&&b.p_changes.unit_id!=='u2')return reply({message:'Lease not in unit'},400);
    Object.assign(task,b.p_changes);
    task.intake_details={...task.intake_details,next_action:b.p_changes.next_action,
     due:b.p_changes.due_date?{date:b.p_changes.due_date}:null,
     follow_up:b.p_changes.follow_up_date?{date:b.p_changes.follow_up_date}:null};
    task.updated_at='2026-11-01T22:00:00.456Z';
    return reply({task_id:task.id,updated_at:task.updated_at});
  }
  if(p==='/rest/v1/renewal_cases')return reply(s.renewals);
  if(p==='/rest/v1/properties')return reply(s.properties);
  if(p==='/rest/v1/units')return reply(s.units);
  if(p==='/rest/v1/leases')return reply(s.leases);
  if(['/rest/v1/people','/rest/v1/leases','/rest/v1/tenancies','/rest/v1/tenancy_people','/rest/v1/bookings','/rest/v1/ops_events','/rest/v1/property_addressees'].includes(p))return reply([]);
  if(p==='/rest/v1/rpc/ops_task_intake')return reply([]);
  return reply([]);
 });
 await page.goto(ORIGIN+'/');return s;
}
test('Today is protected, uses recorded dates only, and links to existing workflows',async({page})=>{
 const s=await setup(page);
 await navigate(page,'today');
 await expect(page.locator('#today-status')).toContainText('Sign in to view private');
 expect(s.reads).toBe(0);
 await page.locator('#today-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await expect(page.locator('#account-dialog')).not.toBeVisible();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await expect(page.locator('#today-kpis')).toContainText('Waiting / blocked');
 await expect(page.locator('#today-kpis .today-kpi').nth(0)).toContainText('Overdue');
 await expect(page.locator('#today-kpis .today-kpi').nth(0)).toContainText('1');
 await expect(page.locator('#today-queue')).toContainText('Fictional overdue inspection follow-up');
 await expect(page.locator('#today-queue')).toContainText('Undated imported task');
 await expect(page.locator('#today-queue')).not.toContainText('Private archived item');
 await expect(page.locator('#today-renewals')).toContainText('100 Fictional Road');
 await openTasks(page);await page.locator('#today-open-tasks').click();
 await expect(page.locator('#tasks-workflow')).toBeVisible();
 await navigate(page,'today');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-status')).toContainText('Sign in to view private');
 await expect(page.locator('#today-queue')).not.toContainText('Fictional overdue inspection');
});
test('Today handles denied data reads without exposing stale entries',async({page})=>{
 const s=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();await expect(page.locator('#account-dialog')).not.toBeVisible();
 await navigate(page,'today');
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 s.fail=true;await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();
 await expect(page.locator('#today-status')).toContainText('Could not load the dashboard');
 await expect(page.locator('#today-queue')).toBeEmpty();
});


test('Staff can link an existing task to exact property/unit/lease/renewal and save reviewed fields',async({page})=>{
 const state=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await navigate(page,'today');
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();
 await expect(page.locator('#today-edit-dialog')).toBeVisible();
 await page.locator('#today-edit-title').fill('Fictional inspection follow-up');
 await page.locator('#today-edit-property').selectOption('p1');
 await page.locator('#today-edit-unit').selectOption('u1');
 await expect(page.locator('#today-edit-lease option')).toHaveCount(2);
 await expect(page.locator('#today-edit-lease')).not.toContainText('Other Lease');
 await page.locator('#today-edit-lease').selectOption('l1');
 await page.locator('#today-edit-renewal').selectOption('r1');
 await page.locator('#today-edit-status').selectOption('waiting');
 await page.locator('#today-edit-priority').selectOption('high');
 await page.locator('#today-edit-assignee').fill('Fictional staff member');
 await page.locator('#today-edit-due').fill('2026-11-05');
 await page.locator('#today-edit-followup').fill('2026-11-04');
 await page.locator('#today-edit-action').fill('Check the fictional inspection follow-up');
 await page.locator('#today-edit-notes').fill('Reviewed internal note only');
 await page.locator('#today-edit-save').click();
 await expect(page.locator('#today-edit-dialog')).not.toBeVisible();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 expect(state.edits).toHaveLength(1);
 expect(state.edits[0].p_changes).toMatchObject({
   property_id:'p1',unit_id:'u1',lease_id:'l1',renewal_case_id:'r1',status:'waiting',
   priority:'high',assigned_label:'Fictional staff member',
   due_date:'2026-11-05',follow_up_date:'2026-11-04'
 });
 await expect(page.locator('#today-queue')).toContainText('Fictional inspection follow-up');
 await expect(page.locator('#today-queue')).toContainText('Lease linked');
 await expect(page.locator('#today-queue')).toContainText('100 Fictional Road');
});
test('Editor rejects stale changes without claiming save and only editors can open it',async({page})=>{
 const state=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await navigate(page,'today');
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();
 state.rejectEdit=true;
 await page.locator('#today-edit-save').click();
 await expect(page.locator('#today-edit-dialog')).toBeVisible();
 await expect(page.locator('#today-edit-feedback')).toContainText('Not saved');
 expect(state.edits).toHaveLength(1);
 await page.locator('#today-edit-cancel').click();
 state.viewer=true;
 await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();
 await expect(page.locator('#today-queue .today-edit-trigger')).toHaveCount(0);
 await expect(page.locator('#today-queue')).toContainText('Fictional overdue inspection');
});

test('chart uses disjoint recorded-date groups, clears on denial, and workflow navigation reaches preparation',async({page})=>{
 const state=await setup(page);
 state.tasks.push({id:'5',task_title:'Fictional later task',status:'pending',priority:'normal',intake_details:{due:{date:offset(M.today(),12)}}});
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await navigate(page,'today');
 await expect(page.locator('#today-schedule .schedule-legend li')).toHaveText(['Overdue1','Due today1','Upcoming1','No date1']);
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 await navigate(page,'properties');
 await expect(page.locator('#properties-workflow')).toBeVisible();
 await navigate(page,'today');
 await navigate(page,'leases');await page.locator('#lease-tab-prepare').click();
 await expect(page.locator('#lease-prepare-panel')).toBeVisible();
 await expect(page.locator('#ops-renewals-panel')).toBeHidden();
 await navigate(page,'today');
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 state.fail=true;await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();
 await expect(page.locator('#today-status')).toContainText('Could not load');
 await expect(page.locator('#today-schedule .schedule-ring')).toHaveCount(0);
 state.fail=false;await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-schedule .schedule-ring')).toHaveCount(0);
});

test('zero recorded tasks produce a truthful empty overview',async({page})=>{
 const state=await setup(page);state.tasks=[];state.renewals=[];
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await navigate(page,'today');
 await expect(page.locator('#today-schedule .schedule-legend li strong')).toHaveText(['0','0','0','0']);
 await expect(page.locator('#today-schedule')).toContainText('No active tasks recorded');
});

test('personal home has working dual clocks without the sales copy or brief',async({page})=>{
 await page.clock.install({time:new Date('2026-11-01T05:59:59Z')});
 await page.clock.pauseAt(new Date('2026-11-01T06:00:00Z'));
 await setup(page);
 await expect(page.locator('#today-workflow')).toBeVisible();
 await expect(page.locator('[data-workspace="today"]')).toHaveAttribute('aria-current','page');
 await expect(page.locator('.today-brief,.sidebar-footer,.page-footer')).toHaveCount(0);
 await expect(page.locator('#clock-eastern-zone')).toHaveText('EST');
 await expect(page.locator('#clock-eastern-time')).toHaveText('01:00:00 AM');
 await expect(page.locator('#clock-india-time')).toHaveText('11:30:00 AM');
 await page.locator('#account-button').focus();await page.clock.fastForward(2000);
 await expect(page.locator('#clock-eastern-time')).toHaveText('01:00:02 AM');
 await expect(page.locator('#account-button')).toBeFocused();
 await expect(page.locator('.workspace-clocks [aria-live="polite"],.workspace-clocks [aria-live="assertive"]')).toHaveCount(0);
});
async function signInToday(page){
 await page.locator('#account-button').click();await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');await page.locator('#pilot-login').click();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
}

test('clean start archives only reviewed active tasks and can be cancelled without writes',async({page})=>{
 const s=await setup(page);s.tasks.push({id:'completed',task_title:'Finished earlier',status:'completed',updated_at:'2026-10-29T10:00:00Z'});
 await signInToday(page);expect(s.archives).toHaveLength(0);
 await openTaskSettings(page);await page.locator('#today-reset-open').click();
 await expect(page.locator('#today-reset-list li')).toHaveCount(3);
 await page.locator('#today-reset-cancel').click();expect(s.archives).toHaveLength(0);
 await openTaskSettings(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('Archived 3 tasks');
 expect(s.archives.map(x=>x.p_task)).toEqual(['1','2','3']);
 expect(s.archives.every(x=>x.p_archived===true&&x.p_expected_updated_at)).toBe(true);
 expect(s.tasks.find(x=>x.id==='completed').archived_at).toBeUndefined();
 expect(s.edits).toHaveLength(0);
 await expect(page.locator('#today-kpis .today-kpi').first()).toContainText('0');
});
test('a stale task stops the clean start and reports partial success',async({page})=>{
 const s=await setup(page);s.failArchiveAt=2;
 await signInToday(page);await openTaskSettings(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('Confirmed 1 of 3 archived');
 expect(s.archives.map(x=>x.p_task)).toEqual(['1','2']);
 expect(s.tasks.find(x=>x.id==='3').archived_at).toBeNull();
 await expect(page.locator('#today-reset-confirm')).toBeDisabled();
});
test('lost archive replies remain uncertain and do not trigger another task write',async({page})=>{
 const s=await setup(page);s.loseArchiveReply=true;
 await signInToday(page);await openTaskSettings(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('last request may have saved');
 expect(s.archives).toHaveLength(1);expect(s.tasks[0].archived_at).toBeTruthy();
 await expect(page.locator('#today-status')).toContainText('2 active tasks');
});

test('confirmed archives remain visible when the subsequent list refresh fails',async({page})=>{
 const s=await setup(page);s.failReadsAfterArchive=true;
 await signInToday(page);await openTaskSettings(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-status')).toContainText('Could not load');
 await expect(page.locator('#today-reset-dialog')).toBeVisible();
 await expect(page.locator('#today-reset-status')).toContainText('Archived 3 tasks');
 expect(s.archives).toHaveLength(3);await expect(page.locator('#today-reset-cancel')).toBeEnabled();
});
test('sign-out during archiving clears private review and stops further archive requests',async({page})=>{
 const s=await setup(page);let release;s.holdArchive=new Promise(r=>release=r);
 await signInToday(page);await openTaskSettings(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect.poll(()=>s.archives.length).toBe(1);
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#today-reset-dialog')).not.toBeVisible();
 await expect(page.locator('#today-reset-list')).toBeEmpty();
 await expect(page.locator('#today-reset-open')).toBeDisabled();
 expect(s.archives).toHaveLength(1);
});

test('completed work is visible independently of intake sessions and clears on sign-out and refresh failure',async({page})=>{
 const s=await setup(page);s.tasks.push({id:'done',task_title:'Fictional completed batch',status:'completed',completed_at:new Date().toISOString(),workflow_key:'general',intake_details:{completion_summary:'Prepared fictional notices for two addresses.'}},{id:'cancelled',task_title:'Cancelled record',status:'cancelled'},{id:'archived-done',task_title:'Archived completed record',status:'completed',archived_at:new Date().toISOString()});
 await signInToday(page);await page.locator('#today-completed-filter').selectOption('all');await expect(page.locator('#today-completed-count')).toHaveText('1');await expect(page.locator('#today-completed')).toContainText('Fictional completed batch');await expect(page.locator('#today-completed')).toContainText('Prepared fictional notices');await expect(page.locator('#today-completed')).toContainText('no property or lease linked');await expect(page.locator('#today-queue')).not.toContainText('Fictional completed batch');await expect(page.locator('#today-completed')).not.toContainText('Cancelled record');await expect(page.locator('#today-completed')).not.toContainText('Archived completed record');
 s.fail=true;await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();await expect(page.locator('#today-status')).toContainText('Could not load');await expect(page.locator('#today-completed')).toBeEmpty();s.fail=false;await page.locator('#tasks-workflow:visible #tasks-refresh, #today-workflow:visible #today-refresh').click();await expect(page.locator('#today-completed')).toContainText('Fictional completed batch');await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#today-completed')).toBeEmpty();
});
test('Completed shortcut opens searchable task history, separate from the daily plan and intake',async({page})=>{
 const s=await setup(page);
 s.tasks.push({id:'saved-complete',task_code:'M13',task_title:'Fictional SOD filing complete',status:'completed',completed_at:null,workflow_key:'general',intake_details:{completion_summary:'Source confirms completion, date unavailable.'}});
 await signInToday(page);
 await expect(page.locator('#today-completed-panel')).toBeHidden();
 await page.locator('#today-open-completed').click();
 await expect(page.locator('#today-history-search')).toBeFocused();

 await page.locator('#today-completed-filter').selectOption('all');
 await expect(page.locator('#today-completed-panel')).toContainText('M13 · Fictional SOD filing complete');
 await expect(page.locator('#today-history')).not.toHaveAttribute('open','');
 await expect(page.locator('#today-history-search')).toBeFocused();
 await page.locator('#today-history-search').fill('M13');
 await expect(page.locator('#today-completed .today-task:visible')).toHaveCount(1);
 await page.locator('#today-history-search').fill('unrelated');
 await expect(page.locator('#today-completed .today-task:visible')).toHaveCount(0);
 await page.locator('#today-history-search').fill('');
 await openTasks(page,'history');await page.locator('#today-history>summary').click();
 await expect(page.locator('#today-archived')).toContainText('Private archived item');
 await navigate(page,'tasks');
 await expect(page.locator('#tasks-workflow')).toBeVisible();
 await expect(page.locator('#workspace-title')).toHaveText('Tasks');
 expect(s.edits).toHaveLength(0);
 expect(s.archives).toHaveLength(0);
});
test('Morning Plan generates the established SOD with saved tasks, a new priority and three daily constants',async({page})=>{
 const s=await setup(page);
 s.tasks[0].task_code='M08';s.tasks[0].intake_details.next_action='Check the recorded inspection details before follow-up.';
 await signInToday(page);
 await page.locator('#sod-morning>summary').click();
 await expect(page.locator('#sod-workdate')).toContainText(M.today());
 await expect(page.locator('#sod-generate')).toBeEnabled();
 await page.locator('#sod-saved-task').selectOption('1');
 await page.locator('#sod-add').click();
 await expect(page.locator('#sod-plan-selected')).toContainText('M08');
 await expect(page.locator('#sod-plan-selected').getByLabel('Action for this morning')).toHaveValue('Check the recorded inspection details before follow-up.');
 await page.locator('#sod-extras').fill('Example Property – Document Review: Confirm the emailed document is the correct one before filing.');
 await page.locator('#sod-generate').click();
 const email=await page.locator('#sod-output').inputValue();
 expect(email).toContain('Good Morning Leslie,\n\nHope you\'re doing well!\n\nI\'m getting started for the day. My priorities today are:\n\n');
 expect(email).toContain('Fictional overdue inspection follow-up: Check the recorded inspection details before follow-up.');
 expect(email).toContain('Example Property – Document Review: Confirm the emailed document is the correct one before filing.');
 expect(email.indexOf('Example Property – Document Review')).toBeLessThan(email.indexOf('Tenant Communications:'));
 expect(email.indexOf('Tenant Communications:')).toBeLessThan(email.indexOf('REI Hub – Import Feed:'));
 expect(email.indexOf('REI Hub – Import Feed:')).toBeLessThan(email.indexOf('Maintenance & Leasing:'));
 const weekday=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(M.today()+'T12:00:00Z'));
 expect(email).toContain("\n\nPlease let me know if there's anything else you'd like me to prioritize today.\n\n");
 expect(email).toMatch(new RegExp('Thank you, and wishing you a wonderful '+weekday+'!$'));
 expect(email.split('\n').filter(line=>line.startsWith('- '))).toHaveLength(5);
 expect(email).not.toContain('M08'); // Internal task codes are not emailed
 await expect(page.locator('#sod-copy')).toBeEnabled();
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.locator('#sod-copy').click();
 await expect(page.locator('#sod-status')).toContainText('SOD copied');
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(email);
 expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});
test('Morning Plan requires a confirmed action, offers optional Monday wording and clears drafts on sign-out',async({page})=>{
 const s=await setup(page);await signInToday(page);
 await page.locator('#sod-morning>summary').click();
 await page.locator('#sod-saved-task').selectOption('3');
 await page.locator('#sod-add').click();
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-status')).toContainText('Cannot generate SOD');
 await expect(page.locator('#sod-copy')).toBeDisabled();
 await page.locator('#sod-plan-selected').getByLabel('Action for this morning').fill('Check source records and confirm the next step.');
 await page.locator('#sod-greeting').selectOption('weekend');
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-output')).toHaveValue(/Hope you had a good weekend!/);
 await page.locator('#sod-extras').fill('One line missing a colon');
 await expect(page.locator('#sod-copy')).toBeDisabled();
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-status')).toContainText('Cannot generate SOD');
 await page.locator('#sod-extras').fill('');
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-copy')).toBeEnabled();
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#sod-copy')).toBeDisabled();
 await expect(page.locator('#sod-extras')).toHaveValue('');
 await expect(page.locator('#sod-output')).toBeHidden();
 await expect(page.locator('#sod-saved-task')).toBeDisabled();
 expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});
test('Morning Plan drops selected task when that source closes and never treats copy as sent',async({page})=>{
 const s=await setup(page);await signInToday(page);
 await page.locator('#sod-morning>summary').click();
 await page.locator('#sod-saved-task').selectOption('3');await page.locator('#sod-add').click();
 await page.locator('#sod-plan-selected').getByLabel('Action for this morning').fill('Review fictional source evidence.');
 await page.locator('#sod-generate').click();await expect(page.locator('#sod-copy')).toBeEnabled();
 s.tasks[2].status='completed';
 await page.evaluate(()=>window.OpsToday.refresh());
 await expect(page.locator('#sod-plan-selected')).not.toContainText('Undated imported task');
 await expect(page.locator('#sod-copy')).toBeDisabled();
 await expect(page.locator('#sod-status')).toContainText('selected task changed or closed');
 expect(s.edits).toHaveLength(0);
});

test('History shows two personal actions without Leslie’s completed inspection',async({page})=>{
 const s=await setup(page),day=M.today();
 s.tasks.push(
  {id:'staff-inspection',task_title:'Fictional inspection',status:'completed',completed_at:new Date().toISOString(),intake_details:{eod:{completed_by:'Leslie',work_date:day}}},
  {id:'my-message',task_title:'Sent fictional tenant message',status:'completed',completed_at:new Date().toISOString(),intake_details:{eod:{completed_by:'Huzy',work_date:day,label:'Sample Road – Tenant Communication',summary:'Sent fictional tenant message.'}}},
  {id:'my-filing',task_title:'Filed fictional report',status:'completed',completed_at:new Date().toISOString(),intake_details:{eod:{completed_by:'Huzy',work_date:day,label:'Sample Road – Documents',summary:'Filed fictional report.'}}}
 );
 await signInToday(page);await openTasks(page,'history');
 await expect(page.locator('#today-completed-count')).toHaveText('2');
 await expect(page.locator('#today-completed')).toContainText('Sent fictional tenant message');
 await expect(page.locator('#today-completed')).toContainText('Filed fictional report');
 await expect(page.locator('#today-completed')).not.toContainText('Fictional inspection');
 await page.locator('#today-completed-filter').selectOption('all');
 await expect(page.locator('#today-completed-count')).toHaveText('3');
 await expect(page.locator('#today-completed')).toContainText('Fictional inspection');
});
test('EOD uses saved work dates, exports estimated time once, and never writes',async({page})=>{
 const s=await setup(page),day=M.today();s.events=[{id:'e1',event_type:'task_work_recorded',event_metadata:{activity:{work_date:day,completed_by:'Huzy',summary:'Fictional multi-property batch',minutes:90,duration_basis:'user_estimate'}}}];s.tasks.push({id:'done',task_title:'Fictional completed batch',status:'completed',completed_at:new Date().toISOString(),intake_details:{eod:{completed_by:'Huzy',work_date:day,label:'Sample Road – Filing',summary:'Fictional properties included.'}}});
 await expect(page.locator('#eod-generate')).toBeDisabled();await signInToday(page);await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('Fictional multi-property batch');await expect(page.locator('#eod-report')).not.toContainText('minutes');if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'){for(const width of [390,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.locator('section[aria-labelledby=\"eod-heading\"]').screenshot({path:test.info().outputPath('eod-'+width+'.png')});}}await page.locator('#eod-include-time').check();await expect(page.locator('#eod-report')).toBeHidden();await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('Known recorded time: 90 minutes');await expect(page.locator('#eod-report')).toContainText('90 minutes (estimated by you)');await expect(page.locator('#eod-report')).toContainText('Fictional properties included.');expect(s.reportRequests).toEqual([{method:'GET',date:'eq.'+day},{method:'GET',date:'eq.'+day}]);expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
 const download=page.waitForEvent('download');await page.locator('#eod-download').click();const exported=await download;expect(exported.suggestedFilename()).toBe('oaktown-eod-'+day+'.txt');expect(await require('fs').promises.readFile(await exported.path(),'utf8')).toBe(await page.locator('#eod-report').textContent());await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#eod-copy').click();await expect(page.locator('#eod-status')).toContainText('Report copied');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(await page.locator('#eod-report').textContent());
 await page.locator('#eod-date').fill(offset(day,-1));await expect(page.locator('#eod-report')).toBeHidden();await expect(page.locator('#eod-copy')).toBeDisabled();s.events=[];await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('No personal completed work recorded');await expect(page.locator('#eod-report')).toContainText('Known recorded time: 0 minutes');
});
test('EOD denies partial results and clears stale exports after failure and late sign-out',async({page})=>{
 const s=await setup(page);await signInToday(page);s.events=Array(1000).fill({id:'limit',event_type:'task_work_recorded',event_metadata:{activity:{work_date:M.today(),summary:'Fictional work',minutes:1,duration_basis:'reported'}}});await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('No partial report');await expect(page.locator('#eod-copy')).toBeDisabled();
 s.events=[];await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toBeVisible();s.failReport=true;await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('Report unavailable');await expect(page.locator('#eod-report')).toBeHidden();
 s.failReport=false;let release;s.holdReport=new Promise(resolve=>release=resolve);await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('Loading work attributed');await page.evaluate(()=>window.OpsCloud.signOut());release();await expect(page.locator('#eod-report')).toBeHidden();await expect(page.locator('#eod-generate')).toBeDisabled();await expect(page.locator('#eod-status')).toContainText('Sign in');
});

for(const mode of ['veyra','oryn','nilo','ember','verdant','pearl'])test('appearance '+mode+' preserves records, persists and fits phone and desktop',async({page})=>{
 const s=await setup(page);s.tasks[0].property_id='p1';s.tasks[0].unit_id='u1';s.tasks[0].lease_id='l1';s.tasks[0].renewal_case_id='r1';await signInToday(page);await openTasks(page);await expect(page.locator('#tasks-status')).toContainText('Updated');const before=JSON.stringify(s.tasks),reads=s.reads;
 await chooseTheme(page,mode);await expect(page.locator('html')).toHaveAttribute('data-ops-theme',mode);await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();await expect(page.locator('#today-related-links button')).toHaveCount(4);await page.locator('#today-edit-cancel').click();expect(JSON.stringify(s.tasks)).toBe(before);expect(s.edits).toHaveLength(0);expect(s.reads).toBe(reads);
 if(process.env.OAKTOWN_THEME_AXE==='1'){const AxeBuilder=require('@axe-core/playwright').default;const results=await new AxeBuilder({page}).include('.sidebar').include('.topbar').include('#tasks-workflow').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);if(mode==='nilo'){for(const name of ['properties','leases','tasks']){await navigate(page,name);const review=await new AxeBuilder({page}).include('#'+name+'-workflow').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(review.violations.map(v=>({view:name,id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);}await navigate(page,'today');await expect(page.locator('#today-status')).toContainText('Updated');}}
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:test.info().outputPath(mode+'-'+width+'-workspace.png')});await page.locator('#today-queue').screenshot({path:test.info().outputPath(mode+'-'+width+'-task-queue.png')});}}
 await page.reload();await expect(page.getByLabel('Workspace theme')).toHaveValue(mode);await expect(page.locator('html')).toHaveAttribute('data-ops-theme',mode);await expect(page.locator('#today-status')).toContainText('Updated');
});
test('saved task links open exact related profiles without writing or showing a dashboard graph',async({page})=>{
 const s=await setup(page);s.tasks[0].property_id='p1';s.tasks[0].unit_id='u1';s.tasks[0].lease_id='l1';s.tasks[0].renewal_case_id='r1';
 await signInToday(page);
 await expect(page.locator('#connections-panel')).toHaveCount(0);
 await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();
 const links=page.locator('#today-related-links button');
 await expect(links).toHaveCount(4);
 await expect(page.locator('#today-related-records')).toContainText('100 Fictional Road');
 await expect(page.locator('#today-related-records')).toContainText('Fictional Lease 1');
 const property=page.getByRole('button',{name:'Open saved property: 100 Fictional Road'});
 await property.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#today-edit-dialog')).not.toBeVisible();
 await expect(page.locator('#operations-profile-title')).toHaveText('100 Fictional Road');
 await page.keyboard.press('Escape');
 await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();
 await page.getByRole('button',{name:'Open saved lease: Fictional Lease 1'}).click();
 await expect(page.locator('#operations-profile-title')).toHaveText('Fictional Lease 1');
 expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});
test('general task has no invented links and private related details clear on sign-out',async({page})=>{
 const s=await setup(page);s.tasks[2].task_title='Check 100 Fictional Road and Lease 1';
 await signInToday(page);
 await openTasks(page);await page.locator('#today-queue .today-task').filter({hasText:'Check 100 Fictional Road and Lease 1'}).getByRole('button',{name:'Edit task'}).click();
 await expect(page.locator('#today-related-links button')).toHaveCount(0);
 await expect(page.locator('#today-related-records')).toContainText('No related records are saved');
 await expect(page.locator('#today-related-notes')).toContainText('not saved property or lease links');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-edit-dialog')).not.toBeVisible();
 await expect(page.locator('#today-related-links')).toBeEmpty();
 await expect(page.locator('#today-related-notes')).toBeEmpty();
 expect(s.edits).toHaveLength(0);
});
test('Today keeps urgent work across levels and status shortcuts require reviewed save',async({page})=>{
 const s=await setup(page);
 s.tasks[0].workflow_key='maintenance';
 s.tasks[1].workflow_key='accounting';
 await signInToday(page);
 await expect(page.locator('#today-urgent')).toContainText('Fictional overdue inspection follow-up');
 await expect(page.locator('#today-urgent')).toContainText('Fictional tenant reply due today');
 await expect(page.locator('#today-focus-level')).toBeEnabled();
 await page.locator('#today-focus-level').selectOption('workflow:maintenance');
 await expect(page.locator('#today-focus-body')).toContainText('Fictional overdue inspection follow-up');
 await page.locator('#today-focus-body').getByRole('button',{name:'Complete'}).click();
 await expect(page.locator('#today-edit-dialog')).toBeVisible();
 await expect(page.locator('#today-edit-status')).toHaveValue('completed');
 expect(s.edits).toHaveLength(0);
 await page.locator('#today-edit-cancel').click();
 await page.locator('#today-focus-level').selectOption('workflow:accounting');
 await expect(page.locator('#today-focus-body')).toContainText('Fictional tenant reply due today');
 await expect(page.locator('#today-urgent')).toContainText('Fictional overdue inspection follow-up');
 await expect(page.locator('#today-queue')).not.toContainText('FICTIONAL-001');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-urgent')).not.toContainText('Fictional overdue inspection follow-up');
});
test('Today archive supports verified restore and clears private history after sign-out',async({page})=>{
 const s=await setup(page);
 s.tasks[3].updated_at='2026-10-29T10:00:00Z';
 await signInToday(page);
 await openTasks(page,'history');await page.locator('#today-history>summary').click();
 await expect(page.locator('#today-archived')).toContainText('Private archived item');
 await page.locator('#today-history-search').fill('Private archived');
 await expect(page.locator('#today-archived .today-archive-row')).toHaveCount(1);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#today-archived').getByRole('button',{name:'Restore'}).click();
 await expect(page.locator('#today-history-status')).toContainText('Restored from archive and verified');
 expect(s.archives).toHaveLength(1);
 expect(s.archives[0].p_archived).toBe(false);
 await expect(page.locator('#today-queue')).toContainText('Private archived item');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-archived')).toBeEmpty();
 await expect(page.locator('#today-history-search')).toHaveValue('');
});
test('history search filters completed and archived titles, including after refresh',async({page})=>{
 const s=await setup(page);s.tasks.push({id:'completed-search',task_title:'Completed fictional filing',status:'completed',completed_at:'2026-11-01T12:00:00Z'});
 await signInToday(page);await openTasks(page,'history');await page.locator('#today-history>summary').click();
 const completed=page.locator('#today-completed .today-task:visible'),archived=page.locator('#today-archived .today-archive-row:visible');
 await page.locator('#today-history-search').fill('fictional filing');await expect(completed).toHaveCount(1);await expect(archived).toHaveCount(0);
 await page.locator('#today-history-search').fill('Private archived');await expect(completed).toHaveCount(0);await expect(archived).toHaveCount(1);
 await page.evaluate(()=>window.OpsToday.refresh());await expect(completed).toHaveCount(0);await expect(archived).toHaveCount(1);
 await page.locator('#today-history-search').fill('no matching title');await expect(completed).toHaveCount(0);await expect(archived).toHaveCount(0);
 await page.locator('#today-history-search').fill('');await expect(completed).toHaveCount(1);await expect(archived).toHaveCount(1);
});
test('restoring completed history preserves its completed status and never reopens it',async({page})=>{
 const s=await setup(page);Object.assign(s.tasks[3],{status:'completed',completed_at:'2026-11-01T12:00:00Z',updated_at:'2026-10-29T10:00:00Z'});
 await signInToday(page);await openTasks(page,'history');await page.locator('#today-history>summary').click();
 let confirmation='';page.once('dialog',async dialog=>{confirmation=dialog.message();await dialog.accept()});
 await page.locator('#today-archived').getByRole('button',{name:'Restore'}).click();await expect(page.locator('#today-history-status')).toContainText('Restored from archive and verified');
 expect(confirmation).toContain('saved status');expect(s.tasks[3].status).toBe('completed');expect(s.archives).toHaveLength(1);
 await expect(page.locator('#today-completed')).toContainText('Private archived item');await expect(page.locator('#today-queue')).not.toContainText('Private archived item');await expect(page.locator('#today-archived .today-archive-row')).toHaveCount(0);
});
for(const failure of ['stale version','read-back failure'])test('Today restore never claims verification after '+failure,async({page})=>{
 const s=await setup(page);s.tasks[3].updated_at='2026-10-29T10:00:00Z';await signInToday(page);await openTasks(page,'history');await page.locator('#today-history>summary').click();
 if(failure==='stale version')s.failArchiveAt=1;else s.failReadsAfterArchive=true;
 page.once('dialog',dialog=>dialog.accept());await page.locator('#today-archived').getByRole('button',{name:'Restore'}).click();
 if(failure==='stale version'){await expect(page.locator('#today-history-status')).toContainText('Restore not verified');expect(s.tasks[3].archived_at).toBeTruthy()}
 else{await expect(page.locator('#today-status')).toContainText('Could not load the dashboard');await expect(page.locator('#today-archived')).toBeEmpty()}
 await expect(page.locator('#today-history-status')).not.toContainText('Restored from archive and verified');expect(s.archives).toHaveLength(1);
});
test('focus and history initialize if the saved dashboard loads before their scripts',async({page})=>{
 await setup(page);await signInToday(page);
 await page.route('**/today-workstation.js?*',async route=>{await page.waitForFunction(()=>!!window.OpsCloud?.user&&!!window.OpsToday);await page.evaluate(()=>window.OpsToday.refresh());await route.continue()});
 await page.reload();await expect(page.locator('#today-status')).toContainText('Updated');await expect(page.locator('#today-urgent')).toContainText('Fictional overdue inspection follow-up');await expect(page.locator('#today-focus-body')).toContainText('Fictional overdue inspection follow-up');
 await openTasks(page,'history');await page.locator('#today-history>summary').click();await expect(page.locator('#today-archived')).toContainText('Private archived item');
 await navigate(page,'today');await page.locator('#today-focus-body').getByRole('button',{name:'Review task',exact:true}).click();await expect(page.locator('#today-edit-dialog')).toBeVisible();await page.locator('#today-edit-cancel').click();
});
test('Today initializes when the verified saved session restores before its script loads',async({page})=>{
 await setup(page);await signInToday(page);
 await page.route('**/today.js?*',async route=>{
  await page.waitForFunction(()=>!!window.OpsCloud?.user);await route.continue();
 });
 await page.reload();
 await expect(page.locator('#today-status')).toContainText('Updated');
 await expect(page.locator('#today-urgent')).toContainText('Fictional overdue inspection follow-up');
 await openAdvanced(page);await page.locator('.today-reset-settings>summary').click();
 await openAdvanced(page);await page.locator('#backlog-import-settings>summary').click();
 await expect(page.locator('#backlog-import-input')).toBeEnabled();
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-status')).toContainText('Sign in to view private');
 await expect(page.locator('#today-urgent')).toContainText('Sign in to view work');
});
test('invalid theme preferences and unavailable local storage fall back safely',async({page})=>{
 await page.addInitScript(()=>{try{localStorage.setItem('oaktown-theme-v1','not-a-theme')}catch{}});await setup(page);await expect(page.getByLabel('Workspace theme')).toHaveValue('veyra');await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('Storage blocked')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('Storage blocked')}});});await page.reload();await expect(page.getByLabel('Workspace theme')).toHaveValue('veyra');await chooseTheme(page,'nilo');await expect(page.locator('html')).toHaveAttribute('data-ops-theme','nilo');
});


test('Reviewed Master Backlog preview never saves without explicit approval and confirms saved codes',async({page})=>{
 const s=await setup(page);
 const payload={schema_version:'oaktown.master-backlog.v1',batch_ref:'master-backlog-20991231',entries:[
  {task_code:'W03',task_title:'Fictional renewal parent',status:'pending',priority:'normal',work_level:'Renewals',source_ref:'Active Tasks!A9:L9'},
  {task_code:'M12',task_title:'Fictional reminder',status:'waiting',priority:'high',work_level:'Renewals',parent_code:'W03',waiting_on:'Fictional coordinator',source_ref:'Active Tasks!A10:L10'},
  {task_code:'M13',task_title:'Fictional completed follow-up',status:'completed',priority:'normal',work_level:'Renewals',parent_code:'W03',completion_summary:'Reported complete',source_ref:'Active Tasks!A11:L11'}
 ]};
 const calls=[];
 await page.route('**/rest/v1/rpc/ops_master_backlog_import',async route=>{
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const body=route.request().postDataJSON();calls.push(body);
  if(body.p_mode==='preview')return route.fulfill({status:200,headers,body:JSON.stringify({schema_version:'oaktown.master-backlog-preview.v1',batch_ref:payload.batch_ref,preview_token:'fictional-token',rows:3,to_create:3,already_imported:0,task_codes:payload.entries.map(e=>e.task_code)})});
  if(body.p_mode==='save'&&body.p_reviewed===true&&body.p_preview_token==='fictional-token'){
   for(const e of payload.entries)s.tasks.push({id:'new-'+e.task_code,task_code:e.task_code,parent_task_id:e.parent_code?'new-'+e.parent_code:null,task_title:e.task_title,status:e.status,priority:e.priority,intake_details:{work_level:e.work_level,waiting_on:e.waiting_on,completion_summary:e.completion_summary},archived_at:null,updated_at:'2026-11-08T01:00:00Z'});
   return route.fulfill({status:200,headers,body:JSON.stringify({schema_version:'oaktown.master-backlog-receipt.v1',batch_ref:payload.batch_ref,rows:payload.entries.map(e=>({task_code:e.task_code,id:'new-'+e.task_code,status:e.status,parent_code:e.parent_code||null}))})});
  }
  return route.fulfill({status:403,headers,body:'{"message":"Denied"}'});
 });
 await signInToday(page);
 await openAdvanced(page);await page.locator('#backlog-import-settings>summary').click();
 await page.locator('#backlog-import-input').fill(JSON.stringify(payload));
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
 await page.locator('#backlog-import-preview').click();
 await expect(page.locator('#backlog-import-status')).toContainText('Preview ready');
 expect(calls.map(c=>c.p_mode)).toEqual(['preview']);
 await expect(page.locator('#backlog-import-summary')).toContainText('M12');
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
 await page.locator('#backlog-import-reviewed').check();
 await page.locator('#backlog-import-confirmation').fill('IMPORT '+payload.batch_ref);
 await expect(page.locator('#backlog-import-save')).toBeEnabled();
 await page.locator('#backlog-import-save').click();
 await expect(page.locator('#backlog-import-status')).toContainText('Verified 3 task records');
 expect(calls.map(c=>c.p_mode)).toEqual(['preview','save']);
 expect(calls[1].p_reviewed).toBe(true);
 await expect(page.locator('#today-work-levels')).toContainText('M12 · Fictional reminder');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#backlog-import-input')).toHaveValue('');
});

const importProbe=()=>({schema_version:'oaktown.master-backlog.v1',batch_ref:'master-backlog-20990101',entries:[
 {task_code:'A88',task_title:'Fictional import probe',status:'pending',priority:'high',work_level:'Test',source_ref:'Active Tasks!A1:L1',next_action:'Check this fictional detail'}
]});
async function importRoute(page,payload,onSave,previewGate){
 await page.route('**/rest/v1/rpc/ops_master_backlog_import',async route=>{
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const b=route.request().postDataJSON();
  if(b.p_mode==='preview'){
   if(previewGate)await previewGate;
   return route.fulfill({status:200,headers,body:JSON.stringify({schema_version:'oaktown.master-backlog-preview.v1',batch_ref:payload.batch_ref,preview_token:'fictional-token',rows:1,to_create:1,already_imported:0,task_codes:['A88']})});
  }
  return route.fulfill({status:200,headers,body:JSON.stringify(await onSave(b))});
 });
}
async function openImport(page,payload){
 await signInToday(page);await openAdvanced(page);await page.locator('#backlog-import-settings>summary').click();
 await page.locator('#backlog-import-input').fill(JSON.stringify(payload));
 await page.locator('#backlog-import-preview').click();
}
test('Import locks its reviewed inputs during requests and discards a signed-out preview',async({page})=>{
 await setup(page);const payload=importProbe();let release;
 const gate=new Promise(r=>{release=r});
 await importRoute(page,payload,()=>{throw Error('Unexpected save')},gate);
 await openImport(page,payload);
 await expect(page.locator('#backlog-import-input')).toBeDisabled();
 await expect(page.locator('#backlog-import-reviewed')).toBeDisabled();
 await expect(page.locator('#backlog-import-confirmation')).toBeDisabled();
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#backlog-import-input')).toHaveValue('');
 await expect(page.locator('#backlog-import-summary')).toBeEmpty();
 await expect(page.locator('#backlog-import-status')).toContainText('No manifest previewed');
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
});
test('Import never confirms success for a receipt with a different saved identity',async({page})=>{
 const s=await setup(page),payload=importProbe();let release;
 const gate=new Promise(r=>{release=r});
 await importRoute(page,payload,async()=>{
  s.tasks.push({...payload.entries[0],id:'fictional-actual-id',parent_task_id:null,intake_details:{}});
  await gate;
  return {schema_version:'oaktown.master-backlog-receipt.v1',batch_ref:payload.batch_ref,rows:[{task_code:'A88',id:'different-receipt-id',status:'pending',parent_code:null}]};
 });
 await openImport(page,payload);await expect(page.locator('#backlog-import-status')).toContainText('Preview ready');
 await page.locator('#backlog-import-summary summary').click();
 await expect(page.locator('#backlog-import-summary')).toContainText('Check this fictional detail');
 await page.locator('#backlog-import-reviewed').check();
 await page.locator('#backlog-import-confirmation').fill('IMPORT '+payload.batch_ref);
 await page.locator('#backlog-import-save').click();
 await expect(page.locator('#backlog-import-input')).toBeDisabled();release();
 await expect(page.locator('#backlog-import-status')).toContainText('Save not verified');
 await expect(page.locator('#backlog-import-status')).toContainText('identity');
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
 await expect(page.locator('#backlog-import-reviewed')).not.toBeChecked();
 await expect(page.locator('#backlog-import-confirmation')).toHaveValue('');
 await page.locator('#backlog-import-preview').click();
 await expect(page.locator('#backlog-import-status')).toContainText('Preview ready');
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
});
test('Import clears its private draft when the staff account changes',async({page})=>{
 await setup(page);const payload=importProbe();
 await importRoute(page,payload,()=>{throw Error('Unexpected save')});
 await openImport(page,payload);await expect(page.locator('#backlog-import-status')).toContainText('Preview ready');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('ops-auth-change',{detail:{user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}})));
 await expect(page.locator('#backlog-import-input')).toHaveValue('');
 await expect(page.locator('#backlog-import-summary')).toBeEmpty();
 await expect(page.locator('#backlog-import-save')).toBeDisabled();
});
test('Today falls back for an undeployed task schema but does not retry a forbidden task read',async({page})=>{
 await setup(page);let fail=false,legacy=0,backgroundLegacy=0,releaseBackground;
 const backgroundGate=new Promise(resolve=>{releaseBackground=resolve});
 await page.route('**/rest/v1/ops_tasks?*',async route=>{
  const params=new URL(route.request().url()).searchParams,q=params.get('select')||'';
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*'};
  // Connected-record search loads concurrently and has its own schema fallback.
  // Delay that request until Today's forbidden refresh to prove it is independent.
  if(params.has('offset')){
   if(q.startsWith('id,task_code,parent_task_id,')){
    await backgroundGate;
    return route.fulfill({status:400,headers,body:JSON.stringify({message:'Column task_code does not exist',code:'42703'})});
   }
   backgroundLegacy++;return route.fulfill({status:200,headers,body:'[]'});
  }
  if(q.startsWith('id,task_code,parent_task_id,'))return route.fulfill({status:fail?403:400,headers,body:JSON.stringify({message:fail?'Forbidden':'Column task_code does not exist',code:fail?'42501':'42703'})});
  legacy++;return route.fulfill({status:200,headers,body:'[]'});
 });
 await signInToday(page);await expect(page.locator('#today-status')).toContainText('Updated');
 expect(legacy).toBeGreaterThan(0);fail=true;const before=legacy;
 releaseBackground();
 await page.evaluate(()=>window.OpsToday.refresh());
 await expect(page.locator('#today-status')).toContainText('Could not load the dashboard');
 await expect.poll(()=>backgroundLegacy).toBeGreaterThan(0);
 expect(legacy).toBe(before);
});

test('daily shortcuts open task work and history with keyboard tabs and browser history',async({page})=>{
 const s=await setup(page);await signInToday(page);
 await expect(page.locator('#today-workflow #sod-morning')).toBeVisible();
 await expect(page.locator('#today-workflow #eod-generate')).toBeVisible();
 for(const id of ['today-queue','today-work-levels','today-completed-panel','today-history','today-renewals','workspace-advanced'])await expect(page.locator('#today-workflow #'+id)).toHaveCount(0);
 await page.locator('#today-open-all').click();await expect(page).toHaveURL(/#\/tasks$/);
 await expect(page.locator('#today-queue')).toBeVisible();await expect(page.locator('#today-work-levels')).toBeVisible();
 await page.locator('#task-tab-work').focus();await page.keyboard.press('ArrowRight');
 await expect(page.locator('#task-tab-history')).toBeFocused();await expect(page.locator('#today-completed-panel')).toBeVisible();
 await expect(page).toHaveURL(/#\/tasks\/history$/);
 await page.goBack();await expect(page.locator('#tasks-work-panel')).toBeVisible();
 await page.goForward();await expect(page.locator('#tasks-history-panel')).toBeVisible();
 await page.reload();await expect(page.locator('#tasks-status')).toContainText('Updated');await expect(page.locator('#tasks-history-panel')).toBeVisible();
 await page.locator('#tasks-back-today').click();await page.locator('#today-open-archived').click();
 await expect(page.locator('#today-history')).toHaveAttribute('open','');await expect(page.locator('#today-history>summary')).toBeFocused();
 await expect(page.locator('#today-archived')).toContainText('Private archived item');
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#today-archived')).toBeEmpty();await expect(page.locator('#today-queue')).toBeEmpty();
 await expect(page.locator('#tasks-signin')).toBeVisible();expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});
test('Tasks deep link loads after sign-in and level focus returns to Today without saving',async({page})=>{
 const s=await setup(page);s.tasks[0].intake_details.work_level='Fictional inspections';
 await page.goto(ORIGIN+'/#/tasks');await expect(page.locator('#tasks-work-panel')).toBeVisible();expect(s.reads).toBe(0);
 await page.locator('#tasks-signin').click();await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password-only');await page.locator('#pilot-login').click();
 await expect(page.locator('#tasks-status')).toContainText('Updated');
 const level=page.locator('#today-work-levels details').filter({hasText:'Fictional inspections'});
 await level.locator('summary').click();await level.getByRole('button',{name:'Focus',exact:true}).first().click();
 await expect(page.locator('#today-workflow')).toBeVisible();await expect(page.locator('#today-focus-body')).toContainText('Fictional overdue inspection follow-up');
 await expect(page.locator('#today-focus-heading')).toBeFocused();expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});

test('SOD closing follows the Eastern workday when UTC is already the next day',async({page})=>{
 await page.clock.install({time:new Date('2026-11-09T04:59:00Z')});
 const s=await setup(page);await signInToday(page);await page.locator('#sod-morning>summary').click();
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-workdate')).toContainText('2026-11-08');
 await expect(page.locator('#sod-output')).toHaveValue(/Thank you, and wishing you a wonderful Sunday!$/);
 await page.clock.setSystemTime(new Date('2026-11-09T05:01:00Z'));
 await page.locator('#sod-generate').click();
 await expect(page.locator('#sod-output')).toHaveValue(/Thank you, and wishing you a wonderful Monday!$/);
 expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
});
