'use strict';
const {test,expect}=require('@playwright/test');
const {navigate,openTasks}=require('./ui-helpers.cjs');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',P='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',U='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TASK='dddddddd-dddd-4ddd-8ddd-dddddddddddd',A='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',B='ffffffff-ffff-4fff-8fff-ffffffffffff';
const gate=()=>{let release;const promise=new Promise(resolve=>{release=resolve});return {promise,release}};
async function setup(page){
 const s={taskWrites:[],eventWrites:[],events:[],taskChecks:0,eventChecks:0,historyReads:0,
  tasks:[{id:TASK,task_title:'Fictional review task',status:'pending',priority:'high',archived_at:null,updated_at:'2026-11-10T12:00:00Z',intake_details:{},property_id:null,unit_id:null,lease_id:null,renewal_case_id:null,assigned_label:null,notes:null}]};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===ORIGIN)return route.continue();
  if(url.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(value,status=200)=>route.fulfill({status,headers,body:JSON.stringify(value)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const p=url.pathname;
  if(p==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'example@example.invalid'}});
  if(p==='/auth/v1/user')return reply({id:USER,email:'example@example.invalid'});
  if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:'admin',is_active:true}]);
  if(p==='/rest/v1/ops_tasks'){
   if(url.searchParams.has('id')){
    s.taskChecks++;const held=s.holdTaskRead;if(held)await held;
    if(s.failTaskRead)return reply({message:'Fictional read unavailable'},503);
    const rows=s.tasks.filter(row=>'eq.'+row.id===url.searchParams.get('id')).map(row=>({...row}));
    if(s.tamperTaskRead&&rows[0])rows[0].task_title='A different saved value';return reply(rows);
   }
   return reply(s.tasks);
  }
  if(p==='/rest/v1/rpc/ops_task_update_v1'){
   const b=req.postDataJSON();s.taskWrites.push(b);const row=s.tasks.find(t=>t.id===b.p_task);
   if(!row||row.updated_at!==b.p_expected_updated_at)return reply({message:'Task changed'},409);
   Object.assign(row,b.p_changes,{updated_at:'2026-11-11T12:00:'+String(s.taskWrites.length).padStart(2,'0')+'.123456Z'});
   row.intake_details={next_action:b.p_changes.next_action,due:b.p_changes.due_date?{date:b.p_changes.due_date}:null,follow_up:b.p_changes.follow_up_date?{date:b.p_changes.follow_up_date}:null};
   const receipt={task_id:row.id,updated_at:row.updated_at},held=s.holdTaskWrite;if(held)await held;
   if(s.dropTaskReply)return route.abort('connectionreset');return reply(receipt);
  }
  if(p==='/rest/v1/ops_events'){
   if(req.method()==='POST'){
    const b=req.postDataJSON();s.eventWrites.push(b);
    const row={...b,id:'00000000-0000-4000-8000-'+String(s.eventWrites.length).padStart(12,'0'),occurred_at:'2026-11-11T13:00:'+String(s.eventWrites.length).padStart(2,'0')+'Z'};
    s.events.unshift(row);const held=s.holdEventWrite;if(held)await held;return reply([row]);
   }
   if(url.searchParams.has('id')){
    s.eventChecks++;const held=s.holdEventRead;if(held)await held;
    const rows=s.events.filter(row=>'eq.'+row.id===url.searchParams.get('id')).map(row=>({...row}));
    if(s.tamperEventRead&&rows[0])rows[0].entity_id=B;return reply(rows);
   }
   if(url.searchParams.get('event_type')==='eq.renewal_progress_updated'){
    s.historyReads++;let rows=s.events;
    if(url.searchParams.has('entity_id'))rows=rows.filter(row=>'eq.'+row.entity_id===url.searchParams.get('entity_id'));
    return reply(rows.slice(0,Number(url.searchParams.get('limit')||1000)));
   }
   return reply([]);
  }
  if(p==='/rest/v1/properties')return reply([{id:P,street_address:'100 Fictional Lane'}]);
  if(p==='/rest/v1/units')return reply([{id:U,property_id:P,unit_label:'Unit A'}]);
  if(p==='/rest/v1/renewal_cases')return reply([A,B].map((id,i)=>({id,property_id:P,unit_id:U,oak_record_id:i?'OAK-FAKE-B':'OAK-FAKE-A',action_status:'Pending',is_applicable:true})));
  return reply([]);
 });
 await page.goto(ORIGIN+'/');return s;
}
async function signIn(page){
 await page.locator('#account-button').click();await page.locator('#pilot-email').fill('example@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();
 await navigate(page,'today');await expect(page.locator('#today-status')).toContainText('Updated');
}
async function openTask(page){await openTasks(page);await page.locator('#today-queue .today-edit-trigger').first().click();await expect(page.locator('#today-edit-dialog')).toBeVisible()}
async function openCase(page,code='A'){
 await navigate(page,'leases');await page.locator('#ops-renewals-list .property-record').filter({hasText:'OAK-FAKE-'+code}).click();await expect(page.locator('#tracker-form')).toBeVisible();
}

test('task editor locks the reviewed snapshot until independent readback completes and ignores duplicate submit',async({page})=>{
 const s=await setup(page);await signIn(page);await openTask(page);const held=gate();s.holdTaskRead=held.promise;
 await page.locator('#today-edit-title').fill('Reviewed fictional change');await page.locator('#today-edit-save').click();
 await expect.poll(()=>s.taskChecks).toBe(1);await expect(page.locator('#today-edit-dialog')).toHaveAttribute('data-workflow-state','verifying');
 await expect(page.locator('#today-edit-title')).toBeDisabled();await expect(page.locator('#today-edit-close')).toBeDisabled();await expect(page.locator('#today-edit-save')).toBeDisabled();
 await page.evaluate(()=>document.getElementById('today-edit-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(s.taskWrites).toHaveLength(1);await expect(page.locator('#today-edit-dialog')).toBeVisible();held.release();
 await expect(page.locator('#today-edit-dialog')).not.toBeVisible();expect(s.tasks[0].task_title).toBe('Reviewed fictional change');
});
test('a stalled task response leaves the busy state without claiming rollback or automatically retrying',async({page})=>{
 await page.clock.install({time:new Date('2026-11-11T15:00:00Z')});
 const s=await setup(page);await signIn(page);await openTask(page);const held=gate();s.holdTaskWrite=held.promise;
 await page.locator('#today-edit-title').fill('Committed before the client timeout');await page.locator('#today-edit-save').click();await expect.poll(()=>s.taskWrites.length).toBe(1);
 await page.clock.fastForward(20001);await expect(page.locator('#today-edit-dialog')).toHaveAttribute('data-workflow-state','needs_review');
 await expect(page.locator('#today-edit-feedback')).toContainText('timed out');await expect(page.locator('#today-edit-feedback')).toContainText('may already have saved');
 await expect(page.locator('#today-edit-reload')).toBeEnabled();await expect(page.locator('#today-edit-save')).toBeDisabled();held.release();
 expect(s.tasks[0].task_title).toBe('Committed before the client timeout');expect(s.taskWrites).toHaveLength(1);
});
test('a lost task reply preserves the draft and requires reloading the committed version before another save',async({page})=>{
 const s=await setup(page);await signIn(page);await openTask(page);s.dropTaskReply=true;
 await page.locator('#today-edit-title').fill('Already committed fictional change');await page.locator('#today-edit-save').click();
 await expect(page.locator('#today-edit-feedback')).toContainText('Save not verified');await expect(page.locator('#today-edit-save')).toBeDisabled();
 await expect(page.locator('#today-edit-title')).toHaveValue('Already committed fictional change');expect(s.tasks[0].task_title).toBe('Already committed fictional change');expect(s.taskWrites).toHaveLength(1);
 s.dropTaskReply=false;await page.locator('#today-edit-reload').click();await expect(page.locator('#today-edit-dialog')).toHaveAttribute('data-workflow-state','reviewing');
 await expect(page.locator('#today-edit-title')).toHaveValue('Already committed fictional change');expect(s.taskWrites).toHaveLength(1);
 await page.locator('#today-edit-action').fill('New separately reviewed action');await page.locator('#today-edit-save').click();await expect(page.locator('#today-edit-dialog')).not.toBeVisible();expect(s.taskWrites).toHaveLength(2);
});
for(const mode of ['tamperTaskRead','failTaskRead'])test('task readback '+mode+' never closes as a successful save',async({page})=>{
 const s=await setup(page);await signIn(page);await openTask(page);s[mode]=true;await page.locator('#today-edit-notes').fill('Preserve this private draft');await page.locator('#today-edit-save').click();
 await expect(page.locator('#today-edit-dialog')).toHaveAttribute('data-workflow-state','needs_review');await expect(page.locator('#today-edit-feedback')).toContainText('Save not verified');
 await expect(page.locator('#today-edit-notes')).toHaveValue('Preserve this private draft');await expect(page.locator('#today-edit-save')).toBeDisabled();expect(s.taskWrites).toHaveLength(1);
 if(mode==='failTaskRead'){
  await page.locator('#today-edit-reload').click();await expect(page.locator('#today-edit-feedback')).toContainText('Your draft is kept');await expect(page.locator('#today-edit-notes')).toHaveValue('Preserve this private draft');
  s.failTaskRead=false;await page.locator('#today-edit-reload').click();await expect(page.locator('#today-edit-save')).toBeEnabled();expect(s.taskWrites).toHaveLength(1);
 }
});
test('an old task save cannot unlock or clear a new session while its readback is pending',async({page})=>{
 const s=await setup(page);await signIn(page);await openTask(page);const old=gate();s.holdTaskWrite=old.promise;
 await page.locator('#today-edit-notes').fill('Old private note');await page.locator('#today-edit-save').click();await expect.poll(()=>s.taskWrites.length).toBe(1);
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#today-edit-dialog')).not.toBeVisible();await expect(page.locator('#today-edit-notes')).toHaveValue('');
 s.holdTaskWrite=null;await signIn(page);await openTask(page);const read=gate();s.holdTaskRead=read.promise;
 await page.locator('#today-edit-notes').fill('New session draft');await page.locator('#today-edit-save').click();await expect.poll(()=>s.taskChecks).toBe(1);
 const late=page.waitForResponse('**/rest/v1/rpc/ops_task_update_v1');old.release();await (await late).finished();
 await expect(page.locator('#today-edit-dialog')).toHaveAttribute('data-workflow-state','verifying');await expect(page.locator('#today-edit-save')).toBeDisabled();await expect(page.locator('#today-edit-notes')).toHaveValue('New session draft');
 read.release();await expect(page.locator('#today-edit-dialog')).not.toBeVisible();expect(s.taskWrites).toHaveLength(2);
});
test('a renewal reply for case A cannot clear the unsaved draft or report success in case B',async({page})=>{
 const s=await setup(page);await signIn(page);await openCase(page);const old=gate();s.holdEventWrite=old.promise;
 await page.locator('#tracker-note').fill('Case A reviewed note');await page.locator('#tracker-save').click();await expect.poll(()=>s.eventWrites.length).toBe(1);
 await openCase(page,'B');await page.locator('#tracker-note').fill('Unsaved case B draft');s.holdEventWrite=null;
 const late=page.waitForResponse(response=>response.url().endsWith('/rest/v1/ops_events')&&response.request().method()==='POST');old.release();await (await late).finished();
 await expect(page.locator('#tracker-note')).toHaveValue('Unsaved case B draft');await expect(page.locator('#tracker-feedback')).not.toContainText('Saved');
 await page.locator('#tracker-save').click();await expect(page.locator('#tracker-feedback')).toContainText('Saved to renewal history and verified');
 expect(s.eventWrites.map(row=>row.entity_id)).toEqual([A,B]);await expect(page.locator('.tracker-history')).toContainText('Unsaved case B draft');
});
test('unverified renewal history requires reload and cannot be blindly submitted twice',async({page})=>{
 const s=await setup(page);await signIn(page);await openCase(page);s.tamperEventRead=true;
 await page.locator('#tracker-note').fill('Reviewed fictional renewal note');await page.locator('#tracker-save').click();
 await expect(page.locator('#ops-renewal-tracker')).toHaveAttribute('data-workflow-state','needs_review');await expect(page.locator('#tracker-feedback')).toContainText('Save not verified');
 await expect(page.locator('#tracker-save')).toBeDisabled();await expect(page.locator('#tracker-note')).toHaveValue('Reviewed fictional renewal note');expect(s.eventWrites).toHaveLength(1);
 s.tamperEventRead=false;await page.locator('#tracker-reload').click();await expect(page.locator('#tracker-feedback')).toContainText('Saved history loaded');await expect(page.locator('.tracker-history')).toContainText('Reviewed fictional renewal note');expect(s.eventWrites).toHaveLength(1);
});
test('a background history refresh preserves a renewal draft and requires review of a newer event',async({page})=>{
 const s=await setup(page);await signIn(page);await openCase(page);await page.locator('#tracker-note').fill('Unsaved text to preserve');
 s.events.unshift({id:'other-update',entity_type:'renewal_case',entity_id:A,event_type:'renewal_progress_updated',occurred_at:'2026-11-11T14:00:00Z',event_metadata:{status:'on_hold',next_action:'Check source'}});
 await page.evaluate(()=>window.dispatchEvent(new Event('ops-portfolio-loaded')));
 await expect(page.locator('#ops-renewal-tracker')).toHaveAttribute('data-workflow-state','needs_review');await expect(page.locator('#tracker-note')).toHaveValue('Unsaved text to preserve');await expect(page.locator('#tracker-save')).toBeDisabled();
 await page.locator('#tracker-reload').click();await expect(page.locator('#tracker-status')).toHaveValue('on_hold');expect(s.eventWrites).toHaveLength(0);
});
test('a renewal readback arriving after sign-out cannot restore private history or the form',async({page})=>{
 const s=await setup(page);await signIn(page);await openCase(page);const held=gate();s.holdEventRead=held.promise;
 await page.locator('#tracker-note').fill('Private note to clear');await page.locator('#tracker-save').click();await expect.poll(()=>s.eventChecks).toBe(1);
 await page.evaluate(()=>window.OpsCloud.signOut());const late=page.waitForResponse(response=>response.url().includes('/rest/v1/ops_events?id='));held.release();await (await late).finished();
 await expect(page.locator('#tracker-form')).toHaveCount(0);await expect(page.locator('#ops-renewal-tracker')).not.toContainText('Private note to clear');await expect(page.locator('#ops-renewal-tracker')).toHaveAttribute('data-workflow-state','idle');
});
test('review-required task and renewal controls fit all six themes and support keyboard recovery',async({page})=>{
 const s=await setup(page);await signIn(page);await openTask(page);s.tamperTaskRead=true;
 await page.locator('#today-edit-save').click();await expect(page.locator('#today-edit-reload')).toBeVisible();
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.evaluate(value=>{const select=document.getElementById('ops-theme-select');select.value=value;select.dispatchEvent(new Event('change'))},theme);
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:950});await expect.poll(()=>page.locator('#today-edit-dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await page.locator('#today-edit-reload').scrollIntoViewIfNeeded();await expect(page.locator('#today-edit-reload')).toBeInViewport();
   if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'&&width===390)await page.locator('#today-edit-dialog').screenshot({path:test.info().outputPath('review-required-task-'+theme+'-workspace.png')});
  }
 }
 s.tamperTaskRead=false;await page.locator('#today-edit-reload').focus();await page.keyboard.press('Enter');await expect(page.locator('#today-edit-save')).toBeEnabled();await page.locator('#today-edit-cancel').click();
 await openCase(page);s.tamperEventRead=true;await page.locator('#tracker-note').fill('Fictional reviewed note');await page.locator('#tracker-save').click();await expect(page.locator('#tracker-reload')).toBeVisible();
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.evaluate(value=>{const select=document.getElementById('ops-theme-select');select.value=value;select.dispatchEvent(new Event('change'))},theme);
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#tracker-reload')).toBeVisible();
  }
 }
 s.tamperEventRead=false;await page.locator('#tracker-reload').focus();await page.keyboard.press('Enter');await expect(page.locator('#tracker-feedback')).toContainText('Saved history loaded');
 expect(s.taskWrites).toHaveLength(1);expect(s.eventWrites).toHaveLength(1);
});
