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
 const s={reads:0,fail:false,rejectEdit:false,viewer:false,edits:[],
 tasks:[
  {id:'1',task_title:'Fictional overdue inspection follow-up',status:'pending',priority:'urgent',archived_at:null,intake_details:{due:{date:offset(day,-1)}},updated_at:'2026-10-29T10:00:00Z',assigned_label:null,notes:null,property_id:null,unit_id:null,lease_id:null,renewal_case_id:null},
  {id:'2',task_title:'Fictional tenant reply due today',status:'waiting',priority:'normal',archived_at:null,intake_details:{follow_up:{date:day}}},
  {id:'3',task_title:'Undated imported task',status:'pending',priority:'normal',archived_at:null,intake_details:{}},
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
  if(p==='/rest/v1/ops_tasks'){if(url.searchParams.get('select')?.startsWith('id,task_title,status,priority')){s.reads++;if(s.fail)return reply({message:'RLS request failed'},403)}return reply(s.tasks)}
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
 await expect(page.locator('#today-status')).toContainText('Live staff records');
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
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();await expect(page.locator('#account-dialog')).not.toBeVisible();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Live staff records');
 s.fail=true;await page.locator('#today-refresh').click();
 await expect(page.locator('#today-status')).toContainText('Could not load the dashboard');
 await expect(page.locator('#today-queue')).toBeEmpty();
});


test('Staff can link an existing task to exact property/unit/lease/renewal and save reviewed fields',async({page})=>{
 const state=await setup(page);
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Live staff records');
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
 await expect(page.locator('#today-status')).toContainText('Live staff records');
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
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-status')).toContainText('Live staff records');
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

test('operations brief and chart use disjoint recorded-date groups, clear on denial, and quick actions navigate',async({page})=>{
 const state=await setup(page);
 state.tasks.push({id:'5',task_title:'Fictional later task',status:'pending',priority:'normal',intake_details:{due:{date:offset(M.today(),12)}}});
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-brief-text')).toContainText('4 active tasks');
 await expect(page.locator('#today-brief-text')).toContainText('1 overdue and 1 due today');
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
 await expect(page.locator('#today-brief-text')).not.toContainText('4 active tasks');
 await expect(page.locator('#today-schedule .schedule-ring')).toHaveCount(0);
 state.fail=false;await page.locator('#today-refresh').click();
 await expect(page.locator('#today-schedule .schedule-center strong')).toHaveText('4');
 await page.evaluate(()=>window.OpsCloud.signOut());
 await expect(page.locator('#today-brief-text')).toContainText('Sign in');
 await expect(page.locator('#today-schedule .schedule-ring')).toHaveCount(0);
});

test('zero recorded tasks produce a truthful empty overview',async({page})=>{
 const state=await setup(page);state.tasks=[];state.renewals=[];
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('example@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password-only');
 await page.locator('#pilot-login').click();
 await page.locator('[data-workspace="today"]').click();
 await expect(page.locator('#today-brief-text')).toContainText('No active tasks are recorded');
 await expect(page.locator('#today-schedule .schedule-legend li strong')).toHaveText(['0','0','0','0']);
 await expect(page.locator('#today-schedule')).toContainText('No active tasks recorded');
});
