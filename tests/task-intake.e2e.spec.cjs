'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});test.setTimeout(60000);
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',PROPERTY='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',BATCH='cccccccc-cccc-4ccc-8ccc-cccccccccccc',CREATED='dddddddd-dddd-4ddd-8ddd-dddddddddddd',UNIT='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const clone=x=>JSON.parse(JSON.stringify(x));
async function setup(page){
 const s={email:'',logins:0,refreshes:0,batch:null,writes:[],propertyWrites:[],conflict:false,offline:false,approved:true,resetRequests:[],passwordUpdates:[],
 properties:[{id:PROPERTY,street_address:'100 Fictional Lane',unit:'',city:'Example City',state:'KY',postal_code:'40201',landlord_entity:null,updated_at:'2026-10-01T00:00:00Z'}],
 people:[{property_id:PROPERTY,notice_addressee_text:'Example Resident & All Occupants'}],
 units:[{id:UNIT,property_id:PROPERTY,unit_code:'UNIT-1000',unit_label:'MAIN',unit_class:'residential',occupancy_status:'Leased'}],
 contacts:[{id:'11111111-1111-4111-8111-111111111111',display_name:'Alex Example',email:'alex@example.invalid',contact_verification:'unverified'}],
 leases:[{id:'22222222-2222-4222-8222-222222222222',unit_id:UNIT,tenancy_id:'33333333-3333-4333-8333-333333333333',term_start:'2026-01-01',term_end:'2026-12-31',lease_status:'imported',verification_status:'unverified'}],
 parties:[{tenancy_id:'33333333-3333-4333-8333-333333333333',person_id:'11111111-1111-4111-8111-111111111111',party_role:'tenant'}],
 tenancies:[{id:'33333333-3333-4333-8333-333333333333',unit_id:UNIT,status:'Current'}]};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===ORIGIN)return route.continue();if(url.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  const p=url.pathname;
  if(p==='/auth/v1/token'){url.searchParams.get('grant_type')==='password'?s.logins++:s.refreshes++;return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER,email:s.email}})}
  if(p==='/auth/v1/recover'){s.resetRequests.push(req.postDataJSON());return reply({})}
  if(p==='/auth/v1/user'&&req.method()==='PUT'){s.passwordUpdates.push(req.postDataJSON());return reply({id:USER,email:s.email})}
  if(p==='/auth/v1/user')return reply({id:USER,email:s.email});
  if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships'){if(s.holdMembership){s.membershipWaiting=true;await s.holdMembership;}return reply([{role:'admin',is_active:s.approved}]);}

  if(p==='/rest/v1/rpc/ops_task_intake'){
   const body=req.postDataJSON();
   if(s.intakeUnavailable)return reply({code:'PGRST202',message:'Function unavailable'},404);
   s.intake=s.intake||{session:'99999999-9999-4999-8999-999999999999',tasks:[],items:[],receipts:[],saves:0,created:false};
   const st=s.intake;
   if(body.p_action==='sessions')return reply(st.created?[{id:st.session,created_at:'2026-11-02T14:00:00Z'}]:[]);
   if(body.p_action==='new'){st.created=true;return reply({session_id:st.session})}
   if(body.p_action==='state')return reply({session_id:st.session,tasks:st.tasks,items:st.items,receipts:st.receipts});
   if(body.p_action==='save'){
    if(s.holdIntake)await s.holdIntake;
    st.saves++;
    const payload=body.p_payload,raw=payload.export,taskId='88888888-8888-4888-8888-888888888888';
    const view=require('../task-intake-model.js').preview(raw,{tasks:st.tasks,items:st.items},payload);
    const existing=st.receipts.find(r=>r.batch_ref===raw.batch_ref);
    if(existing)return reply(existing);
    for(const g of view.groups){st.tasks=[{id:taskId,...g.context,...g.after,intake_details:{next_action:g.after.next_action},updated_at:'2026-11-02T15:00:00Z'}]}
    for(const [kind,list,key]of [['source',raw.sources,'source_ref'],['proposal',raw.proposals,'proposal_ref'],['activity',raw.activities,'activity_ref']])
     for(const value of list)if(!st.items.some(x=>x.kind===kind&&x.ref===value[key]))st.items.push({kind,ref:value[key],payload:value,task_id:kind==='source'?null:taskId});
    const receipt={schema_version:'oaktown.task-receipt.v1',session_id:st.session,batch_ref:raw.batch_ref,proposals:raw.proposals.map(p=>({proposal_ref:p.proposal_ref,task_id:taskId,result:'imported'})),activities:raw.activities.map(a=>({activity_ref:a.activity_ref,task_id:taskId,result:'imported'}))};
    st.receipts.unshift(receipt);
    if(s.loseIntakeResponse){s.loseIntakeResponse=false;return route.abort('internetdisconnected')}
    return reply(receipt);
   }
  }

  if(p==='/rest/v1/properties')return reply(s.properties);
  if(p==='/rest/v1/units')return reply(s.units);
  if(p==='/rest/v1/property_addressees')return reply(s.people);
  if(p==='/rest/v1/people')return reply(s.contacts);
  if(p==='/rest/v1/leases')return reply(s.leases);
  if(p==='/rest/v1/tenancy_people')return reply(s.parties);
  if(p==='/rest/v1/tenancies')return reply(s.tenancies);
  if(['/rest/v1/bookings','/rest/v1/renewal_cases','/rest/v1/ops_tasks','/rest/v1/ops_events'].includes(p))return reply([]);
  if(p==='/rest/v1/notice_batches'){if(!s.batch)return reply([]);if(url.searchParams.has('id'))return reply([s.batch]);const{id,title,version,updated_at}=s.batch;return reply([{id,title,version,updated_at}]);}
  if(p==='/rest/v1/rpc/save_notice_batch'){
   const b=req.postDataJSON();s.writes.push(clone(b));if(s.holdSave)await s.holdSave;
   if(s.conflict)return reply({code:'40001',message:'This batch changed elsewhere. Open the latest saved batch before saving again.'},409);
   s.batch={id:b.p_id||BATCH,title:b.p_title,payload:clone(b.p_payload),version:(s.batch?.version||0)+1,updated_at:'2026-10-26T10:00:00Z'};
   const{id,title,version,updated_at}=s.batch;return reply({id,title,version,updated_at});
  }
  if(p==='/rest/v1/rpc/save_property'){
   if(s.offline)return route.abort('internetdisconnected');
   const b=req.postDataJSON();s.propertyWrites.push(clone(b));if(s.holdProperty)await s.holdProperty;const d=b.p_data;
   const property={id:b.p_id||CREATED,...d,updated_at:'2026-10-26T10:00:00Z'};delete property.tenant;
   s.properties=s.properties.filter(p=>p.id!==property.id).concat(property);s.people=s.people.filter(p=>p.property_id!==property.id).concat({property_id:property.id,notice_addressee_text:d.tenant});
   return reply({property,notice_addressee_text:d.tenant});
  }
  return reply({message:'Unexpected mocked request: '+p},500);
 });
 page.on('dialog',d=>d.accept());
 await page.goto(ORIGIN+'/');await expect(page.locator('#staff-access')).toBeVisible();await page.locator('#staff-access-signin').click();await expect(page.locator('#account-dialog')).toBeVisible();
 s.email='tester@example.invalid';await page.locator('#pilot-email').fill(s.email);
 await page.locator('#pilot-password').fill('fictional-password-only');await page.locator('#pilot-login').click();
 await expect(page.locator('#account-dialog')).not.toBeVisible();await expect(page.locator('#account-button')).toContainText('Signed in');return s;
}
async function importProperty(page){
 await page.locator('[data-workspace="notices"]').click();
 await expect(page.locator('#notice-picker-list .notice-picker-row')).toHaveCount(1);
 await page.locator('#notice-picker-list input[type="checkbox"]').check();
 await page.locator('#notice-picker-make').click();
 await expect(page.frameLocator('#studio-frame').locator('#tenant')).toHaveValue('Example Resident & All Occupants');
}

const intakeFixture=require('./fixtures/task-intake.json');
async function openIntake(page){
 const state=await setup(page);await page.locator('[data-workspace="tasks"]').click();
 await page.locator('#task-new-session').click();
 await expect(page.locator('#task-status')).toContainText('New intake session created');
 await page.locator('#task-json').fill(JSON.stringify(intakeFixture));
 await page.locator('#task-preview').click();
 await expect(page.locator('#task-review')).toContainText('1 task(s) · 10 newly reported minutes');
 return state;
}
async function approve(page){
 await page.getByLabel('Resolve property / unit for Prepare Unit 8 renewal lease').selectOption('u:'+UNIT);
 await page.getByLabel('Approve clearing Waiting on, Follow-up (P004)').check();
 await page.locator('#task-confirm').check();
}
test('intake reviews final state, saves once and does not replay a repeated export',async({page})=>{
 const s=await openIntake(page);
 await expect(page.locator('#task-save')).toBeDisabled();
 await approve(page);await expect(page.locator('#task-save')).toBeEnabled();
 await page.locator('#task-save').click();await expect(page.locator('#task-status')).toContainText('Saved to Ops');
 expect(s.intake.tasks).toHaveLength(1);
 expect(s.intake.items.filter(x=>x.kind==='activity')).toHaveLength(1);
 expect(s.intake.items.find(x=>x.kind==='activity').payload.minutes).toBe(10);
 await page.locator('#task-json').fill(JSON.stringify(intakeFixture));await page.locator('#task-preview').click();
 await expect(page.locator('#task-review')).toContainText('0 newly reported minutes · 5 previously imported');
 await expect(page.locator('#task-save')).toBeDisabled();
 expect(s.intake.saves).toBe(1);
});
test('lost response can retry the same reviewed request without duplicating work',async({page})=>{
 const s=await openIntake(page);await approve(page);s.loseIntakeResponse=true;
 await page.locator('#task-save').click();await expect(page.locator('#task-status')).toContainText(/fetch|network|failed/i);
 await page.locator('#task-save').click();await expect(page.locator('#task-status')).toContainText('Saved to Ops');
 expect(s.intake.items.filter(x=>x.kind==='activity')).toHaveLength(1);expect(s.intake.tasks).toHaveLength(1);
});
test('missing staged backend fails closed but allows a local preview',async({page})=>{
 const s=await setup(page);s.intakeUnavailable=true;
 await page.locator('[data-workspace="tasks"]').click();
 await expect(page.locator('#task-status')).toContainText('not enabled yet');
 await page.locator('#task-json').fill(JSON.stringify(intakeFixture));await page.locator('#task-preview').click();
 await expect(page.locator('#task-review')).toContainText('Preview only');
 await expect(page.locator('#task-save')).toBeDisabled();
});
test('untrusted content renders as text and edits invalidate reviewed preview',async({page})=>{
 await openIntake(page);
 const data=JSON.parse(JSON.stringify(intakeFixture));data.sources[0].evidence_excerpt='<img src=x onerror="window.intakeXss=true">';
 await page.locator('#task-json').fill(JSON.stringify(data));await page.locator('#task-preview').click();
 await page.locator('#task-review summary').click();
 await expect(page.locator('#task-review blockquote').first()).toContainText('<img');
 expect(await page.evaluate(()=>window.intakeXss)).toBeUndefined();
 await approve(page);await page.locator('#task-json').fill('{"invalid":true}');
 await expect(page.locator('#task-save')).toBeDisabled();await expect(page.locator('#task-review')).toBeEmpty();
});
test('sign out clears draft and late save response cannot repopulate protected state',async({page})=>{
 const s=await openIntake(page);await approve(page);let release;s.holdIntake=new Promise(r=>release=r);
 await page.locator('#task-save').click();
 await page.evaluate(()=>window.OpsCloud.signOut());release();
 await expect(page.locator('#task-json')).toHaveValue('');
 await expect(page.locator('#task-review')).toBeEmpty();
 await expect(page.locator('#task-receipt')).toBeEmpty();
 await expect(page.locator('#task-save')).toBeDisabled();
});
for(const width of [320,768,1024,1440]){
 test('task review fits '+width+'px and retains keyboard access',async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await openIntake(page);await approve(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('#task-save').focus();await expect(page.locator('#task-save')).toBeFocused();
  expect((await page.locator('#task-save').boundingBox()).height).toBeGreaterThanOrEqual(44);
  if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'){
   require('node:fs').mkdirSync('test-results/ui-review',{recursive:true});
   await page.locator('#task-review').scrollIntoViewIfNeeded();
   const png=await page.screenshot({path:'test-results/ui-review/tasks-'+width+'.png',animations:'disabled'});
   console.log('OAKTOWN_UI:tasks-'+width+':'+png.toString('base64'));
  }
 });
}
