'use strict';
const {test,expect}=require('@playwright/test'),fs=require('node:fs/promises');
const {chooseTheme}=require('./ui-helpers.cjs');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function rules(){return [
 ['Fictional North Card',2,2,'payment'],['Fictional River Card',4,6,'payment'],['Fictional Garden Store',12,12,'autopay_check'],['Fictional City Fee',18,18,'payment'],['Fictional Workshop Store',19,19,'payment'],['Fictional Harbor Card',20,21,'payment']
].map(([label,day_from,day_through,kind],i)=>({id:'bbbbbbbb-0000-4000-8000-'+String(i+1).padStart(12,'0'),label,recipient:'Example Manager',day_from,day_through,kind,instructions:kind==='autopay_check'?'Verify this month’s automatic payment before doing anything else.':'Review the current statement balance before payment.',start_month:'2026-11-01',lead_days:3,active:true}));}
async function setup(page){
 await page.clock.install({time:new Date('2026-11-09T15:00:00Z')});
 const s={rules:rules(),occurrences:[],can_edit:true,writes:[],reads:0,fail:false,holdRead:null,holdSave:null,tamper:false};
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(r.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-token',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'staff@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'staff@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:'admin',is_active:true}]);
  if(u.pathname==='/rest/v1/rpc/ops_bill_reminders'){
   s.reads++;if(s.holdRead)await s.holdRead;if(s.fail)return reply({message:'Unavailable'},503);
   return reply({rules:s.rules,occurrences:s.occurrences,can_edit:s.can_edit});
  }
  if(u.pathname==='/rest/v1/rpc/ops_bill_reminder_record'){
   const b=r.postDataJSON();s.writes.push(b);const old=s.occurrences.find(o=>o.rule_id===b.p_rule&&o.period===b.p_period);
   if((old?.revision||0)!==b.p_expected_revision)return reply({message:'Changed'},409);
   const stamp=new Date().toISOString(),row={rule_id:b.p_rule,period:b.p_period,revision:b.p_expected_revision+1,reminded_at:b.p_action==='reminded'?stamp:old?.reminded_at||null,verified_at:b.p_action==='verified'?stamp:null,note:b.p_note,last_action:b.p_action,last_event_id:'cccccccc-0000-4000-8000-'+String(s.writes.length).padStart(12,'0'),updated_at:stamp};
   s.occurrences=s.occurrences.filter(o=>o!==old);s.occurrences.push(row);if(s.holdSave)await s.holdSave;return reply(s.tamper?{...row,last_event_id:USER}:row);
  }
  return reply([]);
 });
 await page.goto(ORIGIN+'/');return s;
}
async function signIn(page){await page.locator('#bill-signin').click();await page.locator('#pilot-email').fill('staff@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#bill-status')).toContainText('up to date');await expect(page.locator('#today-status')).toContainText('Updated');}
const first=page=>page.locator('#bill-attention .bill-item').filter({hasText:'Fictional North Card'});
test('private reminders are date-aware, copy without sending, and add a reviewed priority to the SOD',async({page})=>{
 const s=await setup(page);await expect(page.locator('body')).not.toContainText('Fictional North Card');expect(s.reads).toBe(0);
 await signIn(page);await expect(page.locator('#bill-count')).toHaveText('3 need attention');await expect(first(page)).toContainText('Confirmation needed');
 const autopay=page.locator('#bill-attention .bill-item').filter({hasText:'Fictional Garden Store'});await expect(autopay).toContainText('automatic payment');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await first(page).getByRole('button',{name:'Copy reminder'}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('Example Manager');expect(s.writes).toHaveLength(0);
 await first(page).getByRole('button',{name:'Add to SOD'}).click();await expect(page.locator('#sod-extras')).toHaveValue(/Fictional North Card/);await expect(page.locator('#sod-morning')).toHaveAttribute('open','');
 await first(page).getByRole('button',{name:'Add to SOD'}).click();expect((await page.locator('#sod-extras').inputValue()).match(/Fictional North Card/g)).toHaveLength(1);
 await page.locator('#sod-generate').click();await expect(page.locator('#sod-output')).toHaveValue(/Fictional North Card/);expect(s.writes).toHaveLength(0);
 const pending=page.waitForEvent('download');await page.locator('#bill-calendar').click();const ics=await fs.readFile(await (await pending).path(),'utf8');expect((ics.match(/BEGIN:VEVENT/g)||[])).toHaveLength(6);expect(ics).toContain('TRIGGER:-P3D');expect(ics).toContain('TZID:America/New_York');
});
test('recording a reminder leaves payment unresolved; verified payment persists and resets next month',async({page})=>{
 const s=await setup(page);await signIn(page);const update=()=>first(page).getByRole('button',{name:'Record update'});
 await update().focus();await page.keyboard.press('Enter');await expect(page.locator('#bill-dialog')).toBeVisible();await page.locator('#bill-save').click();await expect(page.locator('#bill-status')).toContainText('saved and verified');
 await expect(first(page)).toContainText('Reminder recorded');await expect(page.locator('#bill-count')).toHaveText('3 need attention');expect(s.writes[0].p_action).toBe('reminded');
 await update().click();await page.locator('#bill-action').selectOption('verified');await page.locator('#bill-note').fill('Example Manager confirmed the statement payment.');await page.locator('#bill-save').click();await expect(page.locator('#bill-status')).toContainText('saved and verified');await expect(first(page)).toHaveCount(0);
 await page.reload();await expect(page.locator('#bill-status')).toContainText('up to date');await expect(first(page)).toHaveCount(0);
 await page.clock.setSystemTime(new Date('2026-12-04T15:00:00Z'));await page.locator('#bill-refresh').click();await expect(page.locator('#bill-month-summary')).toContainText('December 2026 · 0 of 6 confirmed');await expect(first(page)).toHaveCount(1);expect(s.writes).toHaveLength(2);
 await first(page).getByRole('button',{name:'Record update'}).click();await page.locator('#bill-note').fill('Private draft to clear');await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#bill-dialog')).not.toBeVisible();await expect(page.locator('#bill-note')).toHaveValue('');await expect(page.locator('#bill-attention')).toBeEmpty();await expect(page.locator('#bill-month-list')).toBeEmpty();await expect(page.locator('#sod-extras')).toHaveValue('');
});
test('read-only access and failed or mismatched readback never report an unverified save as successful',async({page})=>{
 const s=await setup(page);s.can_edit=false;await signIn(page);await expect(page.locator('#bill-reminders [data-bill-action=update]')).toHaveCount(0);
 s.can_edit=true;await page.locator('#bill-refresh').click();await expect(first(page).getByRole('button',{name:'Record update'})).toBeVisible();
 s.tamper=true;await first(page).getByRole('button',{name:'Record update'}).click();await page.locator('#bill-save').click();await expect(page.locator('#bill-dialog-status')).toContainText('Save not verified');await expect(page.locator('#bill-save')).toBeDisabled();await expect(page.locator('#bill-attention')).toBeEmpty();
 await page.locator('#bill-cancel').click();s.tamper=false;s.fail=true;await page.locator('#bill-refresh').click();await expect(page.locator('#bill-status')).toContainText('Could not load');await expect(page.locator('#bill-month-list')).toBeEmpty();expect(s.writes).toHaveLength(1);
});
test('late reads cannot restore signed-out private reminder labels or notes',async({page})=>{
 const s=await setup(page);await signIn(page);let release;const held=new Promise(resolve=>release=resolve);s.holdRead=held;const before=s.reads;
 await page.locator('#bill-refresh').click();await expect.poll(()=>s.reads).toBeGreaterThan(before);await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#bill-status')).toContainText('Sign in');await expect(page.locator('#bill-attention')).toBeEmpty();await expect(page.locator('body')).not.toContainText('Fictional North Card');
});
test('a late save after sign-out does not restore the dialog, notes or private confirmation',async({page})=>{
 const s=await setup(page);await signIn(page);let release;const held=new Promise(resolve=>release=resolve);s.holdSave=held;
 await first(page).getByRole('button',{name:'Record update'}).click();await page.locator('#bill-note').fill('Private reminder note');await page.locator('#bill-save').click();await expect.poll(()=>s.writes.length).toBe(1);
 await page.evaluate(()=>window.OpsCloud.signOut());const response=page.waitForResponse('**/rest/v1/rpc/ops_bill_reminder_record');release();await (await response).finished();
 await expect(page.locator('#bill-status')).toContainText('Sign in');await expect(page.locator('#bill-note')).toHaveValue('');await expect(page.locator('#bill-dialog')).not.toBeVisible();await expect(page.locator('#bill-attention')).toBeEmpty();
});
test('all six themes fit at 320px, phone and desktop widths with keyboard-accessible monthly schedule',async({page})=>{
 await setup(page);await signIn(page);await page.locator('#bill-month-summary').focus();await page.keyboard.press('Enter');await expect(page.locator('#bill-month-list .bill-item')).toHaveCount(6);
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await chooseTheme(page,theme);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{message:theme+' '+width}).toBe(true);
   if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'&&width!==320)await page.locator('#bill-reminders').screenshot({path:test.info().outputPath('bill-'+theme+'-'+width+'-workspace.png')});
  }
 }
});
