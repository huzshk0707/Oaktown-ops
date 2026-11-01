'use strict';
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
  if(p==='/rest/v1/ops_tasks'){if(url.searchParams.get('select')?.startsWith('id,task_title,status,priority')){s.reads++;if(s.fail)return reply({message:'RLS request failed'},403)}return reply(s.tasks)}
  if(p==='/rest/v1/rpc/ops_task_set_archived'){
    const b=req.postDataJSON(),task=s.tasks.find(t=>t.id===b.p_task);s.archives.push(b);
    if(s.archives.length===s.failArchiveAt)return reply({message:'Task changed; refresh.'},409);
    if(s.viewer||!task||task.updated_at!==b.p_expected_updated_at)return reply({message:'Denied or stale task'},403);
    task.archived_at=new Date().toISOString();task.updated_at=task.archived_at;
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
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Sign in to view private');
 expect(s.reads).toBe(0);
 await page.locator('#today-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await expect(page.locator('#account-dialog')).not.toBeVisible();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await expect(page.locator('#today-kpis')).toContainText('Open · no date');
 await expect(page.locator('#today-kpis .today-kpi').nth(0)).toContainText('Overdue');
 await expect(page.locator('#today-kpis .today-kpi').nth(0)).toContainText('1');
 await expect(page.locator('#today-queue')).toContainText('Fictional overdue inspection follow-up');
 await expect(page.locator('#today-queue')).toContainText('Undated imported task');
 await expect(page.locator('#today-queue')).not.toContainText('Private archived item');
 await expect(page.locator('#today-renewals')).toContainText('100 Fictional Road');
 await page.locator('#today-open-tasks').click();
 await expect(page.locator('#tasks-workflow')).toBeVisible();
 await page.locator('[data-workspace="today"]').click();
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-status')).toContainText('Sign in to view private');
 await expect(page.locator('#today-queue')).not.toContainText('Fictional overdue inspection');
});
test('Today handles denied data reads without exposing stale entries',async({page})=>{
 const s=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();await expect(page.locator('#account-dialog')).not.toBeVisible();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 s.fail=true;await page.locator('#today-refresh').click();
 await expect(page.locator('#today-status')).toContainText('Could not load the dashboard');
 await expect(page.locator('#today-queue')).toBeEmpty();
});


test('Staff can link an existing task to exact property/unit/lease/renewal and save reviewed fields',async({page})=>{
 const state=await setup(page);
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await page.locator('#today-queue .today-edit-trigger').first().click();
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
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Updated ·');
 await page.locator('#today-queue .today-edit-trigger').first().click();
 state.rejectEdit=true;
 await page.locator('#today-edit-save').click();
 await expect(page.locator('#today-edit-dialog')).toBeVisible();
 await expect(page.locator('#today-edit-feedback')).toContainText('Not saved');
 expect(state.edits).toHaveLength(1);
 await page.locator('#today-edit-cancel').click();
 state.viewer=true;
 await page.locator('#today-refresh').click();
 await expect(page.locator('#today-queue .today-edit-trigger')).toHaveCount(0);
 await expect(page.locator('#today-queue')).toContainText('Fictional overdue inspection');
});

test('chart uses disjoint recorded-date groups, clears on denial, and quick actions navigate',async({page})=>{
 const state=await setup(page);
 state.tasks.push({id:'5',task_title:'Fictional later task',status:'pending',priority:'normal',intake_details:{due:{date:offset(M.today(),12)}}});
 await page.locator('#account-button').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-schedule .schedule-legend li')).toHaveText(['Overdue1','Due today1','Upcoming1','No date1']);
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 await page.locator('[data-today-go="properties"]').click();
 await expect(page.locator('#properties-workflow')).toBeVisible();
 await page.locator('[data-workspace="today"]').click();
 await page.locator('[data-today-go="leases"]').click();
 await expect(page.locator('#lease-prepare-panel')).toBeVisible();
 await expect(page.locator('#ops-renewals-panel')).toBeHidden();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 state.fail=true;await page.locator('#today-refresh').click();
 await expect(page.locator('#today-status')).toContainText('Could not load');
 await expect(page.locator('#today-schedule .schedule-ring')).toHaveCount(0);
 state.fail=false;await page.locator('#today-refresh').click();
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
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-schedule .schedule-legend li strong')).toHaveText(['0','0','0','0']);
 await expect(page.locator('#today-schedule')).toContainText('No active tasks recorded');
});

test('personal home has working dual clocks without the sales copy or brief',async({page})=>{
 await page.clock.install({time:new Date('2026-11-01T06:00:00Z')});
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
 await page.locator('.today-reset-settings>summary').click();
}
test('clean start archives only reviewed active tasks and can be cancelled without writes',async({page})=>{
 const s=await setup(page);s.tasks.push({id:'completed',task_title:'Finished earlier',status:'completed',updated_at:'2026-10-29T10:00:00Z'});
 await signInToday(page);expect(s.archives).toHaveLength(0);
 await page.locator('#today-reset-open').click();
 await expect(page.locator('#today-reset-list li')).toHaveCount(3);
 await page.locator('#today-reset-cancel').click();expect(s.archives).toHaveLength(0);
 await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('Archived 3 tasks');
 expect(s.archives.map(x=>x.p_task)).toEqual(['1','2','3']);
 expect(s.archives.every(x=>x.p_archived===true&&x.p_expected_updated_at)).toBe(true);
 expect(s.tasks.find(x=>x.id==='completed').archived_at).toBeUndefined();
 expect(s.edits).toHaveLength(0);
 await expect(page.locator('#today-kpis .today-kpi').first()).toContainText('0');
});
test('a stale task stops the clean start and reports partial success',async({page})=>{
 const s=await setup(page);s.failArchiveAt=2;
 await signInToday(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('Confirmed 1 of 3 archived');
 expect(s.archives.map(x=>x.p_task)).toEqual(['1','2']);
 expect(s.tasks.find(x=>x.id==='3').archived_at).toBeNull();
 await expect(page.locator('#today-reset-confirm')).toBeDisabled();
});
test('lost archive replies remain uncertain and do not trigger another task write',async({page})=>{
 const s=await setup(page);s.loseArchiveReply=true;
 await signInToday(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-reset-status')).toContainText('last request may have saved');
 expect(s.archives).toHaveLength(1);expect(s.tasks[0].archived_at).toBeTruthy();
 await expect(page.locator('#today-status')).toContainText('2 active tasks');
});

test('confirmed archives remain visible when the subsequent list refresh fails',async({page})=>{
 const s=await setup(page);s.failReadsAfterArchive=true;
 await signInToday(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect(page.locator('#today-status')).toContainText('Could not load');
 await expect(page.locator('#today-reset-dialog')).toBeVisible();
 await expect(page.locator('#today-reset-status')).toContainText('Archived 3 tasks');
 expect(s.archives).toHaveLength(3);await expect(page.locator('#today-reset-cancel')).toBeEnabled();
});
test('sign-out during archiving clears private review and stops further archive requests',async({page})=>{
 const s=await setup(page);let release;s.holdArchive=new Promise(r=>release=r);
 await signInToday(page);await page.locator('#today-reset-open').click();await page.locator('#today-reset-confirm').click();
 await expect.poll(()=>s.archives.length).toBe(1);
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#today-reset-dialog')).not.toBeVisible();
 await expect(page.locator('#today-reset-list')).toBeEmpty();
 await expect(page.locator('#today-reset-open')).toBeDisabled();
 expect(s.archives).toHaveLength(1);
});

test('completed work is visible independently of intake sessions and clears on sign-out and refresh failure',async({page})=>{
 const s=await setup(page);s.tasks.push({id:'done',task_title:'Fictional completed batch',status:'completed',completed_at:new Date().toISOString(),workflow_key:'general',intake_details:{completion_summary:'Prepared fictional notices for two addresses.'}},{id:'cancelled',task_title:'Cancelled record',status:'cancelled'},{id:'archived-done',task_title:'Archived completed record',status:'completed',archived_at:new Date().toISOString()});
 await signInToday(page);await expect(page.locator('#today-completed-count')).toHaveText('1');await expect(page.locator('#today-completed')).toContainText('Fictional completed batch');await expect(page.locator('#today-completed')).toContainText('Prepared fictional notices');await expect(page.locator('#today-completed')).toContainText('no property or lease linked');await expect(page.locator('#today-queue')).not.toContainText('Fictional completed batch');await expect(page.locator('#today-completed')).not.toContainText('Cancelled record');await expect(page.locator('#today-completed')).not.toContainText('Archived completed record');
 s.fail=true;await page.locator('#today-refresh').click();await expect(page.locator('#today-status')).toContainText('Could not load');await expect(page.locator('#today-completed')).toBeEmpty();s.fail=false;await page.locator('#today-refresh').click();await expect(page.locator('#today-completed')).toContainText('Fictional completed batch');await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#today-completed')).toBeEmpty();
});
test('EOD uses saved work dates, exports estimated time once, and never writes',async({page})=>{
 const s=await setup(page),day=M.today();s.events=[{id:'e1',event_type:'task_work_recorded',event_metadata:{activity:{work_date:day,summary:'Fictional multi-property batch',minutes:90,duration_basis:'user_estimate'}}}];s.tasks.push({id:'done',task_title:'Fictional completed batch',status:'completed',completed_at:new Date().toISOString(),intake_details:{completion_summary:'Fictional properties included.'}});
 await expect(page.locator('#eod-generate')).toBeDisabled();await signInToday(page);await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('Fictional multi-property batch');await expect(page.locator('#eod-report')).not.toContainText('minutes');if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'){for(const width of [390,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.locator('section[aria-labelledby=\"eod-heading\"]').screenshot({path:test.info().outputPath('eod-'+width+'.png')});}}await page.locator('#eod-include-time').check();await expect(page.locator('#eod-report')).toBeHidden();await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('Known recorded time: 90 minutes');await expect(page.locator('#eod-report')).toContainText('90 minutes (estimated by you)');await expect(page.locator('#eod-report')).toContainText('Fictional properties included.');expect(s.reportRequests).toEqual([{method:'GET',date:'eq.'+day},{method:'GET',date:'eq.'+day}]);expect(s.edits).toHaveLength(0);expect(s.archives).toHaveLength(0);
 const download=page.waitForEvent('download');await page.locator('#eod-download').click();const exported=await download;expect(exported.suggestedFilename()).toBe('oaktown-eod-'+day+'.txt');expect(await require('fs').promises.readFile(await exported.path(),'utf8')).toBe(await page.locator('#eod-report').textContent());await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#eod-copy').click();await expect(page.locator('#eod-status')).toContainText('Report copied');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(await page.locator('#eod-report').textContent());
 await page.locator('#eod-date').fill(offset(day,-1));await expect(page.locator('#eod-report')).toBeHidden();await expect(page.locator('#eod-copy')).toBeDisabled();s.events=[];await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toContainText('No saved work entries');await expect(page.locator('#eod-report')).toContainText('Known recorded time: 0 minutes');
});
test('EOD denies partial results and clears stale exports after failure and late sign-out',async({page})=>{
 const s=await setup(page);await signInToday(page);s.events=Array(1000).fill({id:'limit',event_type:'task_work_recorded',event_metadata:{activity:{work_date:M.today(),summary:'Fictional work',minutes:1,duration_basis:'reported'}}});await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('No partial report');await expect(page.locator('#eod-copy')).toBeDisabled();
 s.events=[];await page.locator('#eod-generate').click();await expect(page.locator('#eod-report')).toBeVisible();s.failReport=true;await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('Report unavailable');await expect(page.locator('#eod-report')).toBeHidden();
 s.failReport=false;let release;s.holdReport=new Promise(resolve=>release=resolve);await page.locator('#eod-generate').click();await expect(page.locator('#eod-status')).toContainText('Loading saved');await page.evaluate(()=>window.OpsCloud.signOut());release();await expect(page.locator('#eod-report')).toBeHidden();await expect(page.locator('#eod-generate')).toBeDisabled();await expect(page.locator('#eod-status')).toContainText('Sign in');
});
