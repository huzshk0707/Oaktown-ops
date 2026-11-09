'use strict';
const {test,expect}=require('@playwright/test');
const M=require('../today-model.js');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function shifted(days){const d=new Date(M.today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
async function open(page,viewer=false){
 const tasks=[
  {id:'00000000-0000-4000-8000-000000000001',task_code:'OAK-901',task_title:'Fictional overdue inspection',status:'pending',priority:'urgent',intake_details:{due:{date:shifted(-1)}}},
  {id:'00000000-0000-4000-8000-000000000002',task_code:'OAK-902',task_title:'Fictional waiting reply',status:'waiting',priority:'normal',intake_details:{follow_up:{date:M.today()}}},
  {id:'00000000-0000-4000-8000-000000000003',task_code:'OAK-903',task_title:'Fictional future reminder',status:'pending',priority:'normal',intake_details:{due:{date:shifted(25)}}},
  {id:'00000000-0000-4000-8000-000000000004',task_title:'Fictional completed item',status:'completed',priority:'normal',intake_details:{}},
  {id:'00000000-0000-4000-8000-000000000005',task_title:'Fictional archived item',status:'pending',priority:'normal',archived_at:'2026-10-01T00:00:00Z',intake_details:{}},
  ...Array.from({length:10},(_,i)=>({id:'00000000-0000-4000-8000-'+String(100+i).padStart(12,'0'),task_title:'Fictional undated work '+String(i+1).padStart(2,'0'),status:'pending',priority:'normal',intake_details:{}}))
 ];let writes=0;
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=data=>route.fulfill({status:200,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:'example@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'example@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{user_id:USER,is_active:true,role:viewer&&u.searchParams.get('select')!=='role,is_active'?'viewer':'admin'}]);
  if(u.pathname==='/rest/v1/ops_tasks')return reply(tasks);
  if(req.method()==='POST')writes++;
  return reply([]);
 });
 await page.goto(ORIGIN+'/');await page.locator('#today-signin').click();await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#today-status')).toContainText('Updated');return ()=>writes;
}
test('Active task queue searches codes, filters saved status, includes later dates and reveals remaining rows',async({page})=>{
 const writes=await open(page);
 await expect(page.locator('#today-queue')).toContainText('Fictional future reminder');await expect(page.locator('#today-queue')).not.toContainText('Fictional completed item');await expect(page.locator('#today-queue')).not.toContainText('Fictional archived item');
 await expect(page.locator('#today-queue-count')).toContainText('13 matching active tasks');await expect(page.locator('#today-queue-count')).toContainText('11 shown');
 await page.getByRole('button',{name:'Show more undated active tasks'}).click();await expect(page.locator('#today-queue')).toContainText('Fictional undated work 10');await expect(page.locator('#today-queue-count')).toContainText('13 shown');
 await page.locator('#today-task-search').fill('oak-903');await expect(page.locator('#today-queue .today-task')).toHaveCount(1);await expect(page.locator('#today-queue')).toContainText('future reminder');
 await page.locator('#today-task-search').fill('');await page.locator('#today-task-filter').selectOption('waiting');await expect(page.locator('#today-queue .today-task')).toHaveCount(1);await expect(page.locator('#today-queue')).toContainText('waiting reply');
 await page.locator('#today-task-filter').selectOption('overdue');await expect(page.locator('#today-queue')).toContainText('overdue inspection');expect(writes()).toBe(0);
});
test('Read-only task permissions allow viewing a profile, and sign-out clears search and private results',async({page})=>{
 const writes=await open(page,true);await expect(page.locator('#today-queue .today-edit-trigger')).toHaveCount(0);
 await page.locator('#today-task-search').fill('OAK-901');await page.locator('#today-queue').getByRole('button',{name:'View task'}).click();await expect(page.locator('#operations-profile-dialog')).toBeVisible();await expect(page.locator('#operations-profile-dialog')).toContainText('Fictional overdue inspection');await page.locator('#operations-profile-dialog [data-close]').click();
 await page.locator('#account-button').click();await page.locator('#pilot-logout').click();await expect(page.locator('#today-task-search')).toHaveValue('');await expect(page.locator('#today-task-filter')).toBeDisabled();await expect(page.locator('#today-queue')).toBeEmpty();expect(writes()).toBe(0);
});
