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
 const s={reads:0,fail:false,
 tasks:[
  {id:'1',task_title:'Fictional overdue inspection follow-up',status:'pending',priority:'urgent',archived_at:null,intake_details:{due:{date:offset(day,-1)}}},
  {id:'2',task_title:'Fictional tenant reply due today',status:'waiting',priority:'normal',archived_at:null,intake_details:{follow_up:{date:day}}},
  {id:'3',task_title:'Undated imported task',status:'pending',priority:'normal',archived_at:null,intake_details:{}},
  {id:'4',task_title:'Private archived item',status:'pending',priority:'high',archived_at:day+'T00:00:00Z',intake_details:{due:{date:offset(day,-5)}}}
 ],
 renewals:[{id:'r1',property_id:'p1',unit_id:'u1',recorded_end:offset(day,12),oak_record_id:'FICTIONAL-001',is_applicable:true}],
 properties:[{id:'p1',street_address:'100 Fictional Road'}],
 units:[{id:'u1',property_id:'p1',unit_label:'Unit 1'}]
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
  if(p==='/rest/v1/staff_memberships')return reply([{role:'admin',is_active:true}]);
  if(p==='/rest/v1/ops_tasks'){if(url.searchParams.get('select')?.startsWith('id,task_title,status,priority')){s.reads++;if(s.fail)return reply({message:'RLS request failed'},403)}return reply(s.tasks)}
  if(p==='/rest/v1/renewal_cases')return reply(s.renewals);
  if(p==='/rest/v1/properties')return reply(s.properties);
  if(p==='/rest/v1/units')return reply(s.units);
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
 await page.locator('#staff-access-signin').click();
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
