'use strict';
const {test,expect}=require('@playwright/test'),T=require('../today-model.js');
test.use({browserName:'chromium'});
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function setup(page,{login=true,viewer=false}={}){
 const day=T.today(),state={fail:null,hold:null,viewer,requests:[],writes:[],fixtures:{
  properties:[{id:'p1',street_address:'100 Example Court',city:'Louisville',state:'KY',postal_code:'40219',portfolio_state:'Active'}],
  units:[{id:'u1',property_id:'p1',unit_label:'Unit A',unit_code:'EX-A',occupancy_status:'Verify source'},{id:'u2',property_id:'p1',unit_label:'Unit B',unit_code:'EX-B',occupancy_status:'Vacant'}],
  leases:[{id:'l1',unit_id:'u1',tenancy_id:'ten1',lease_label:'Alpha reference lease',lease_status:'historical',term_start:'2025-01-01',term_end:'2025-12-31',verification_status:'unverified'},{id:'l2',unit_id:'u2',tenancy_id:'ten2',lease_label:'Beta reference lease',lease_status:'draft',verification_status:'unverified'}],
  people:[{id:'person1',display_name:'Avery Fictional',email:'avery@example.invalid'},{id:'person2',display_name:'Blair Fictional',email:'blair@example.invalid'}],
  tenancy_people:[{id:'tp1',tenancy_id:'ten1',person_id:'person1'},{id:'tp2',tenancy_id:'ten2',person_id:'person2'}],
  renewal_cases:[{id:'r1',property_id:'p1',unit_id:'u1',oak_record_id:'TEST-A',action_status:'Pending',next_action:'Review the recorded terms',is_applicable:true},{id:'r2',property_id:'p1',unit_id:'u2',oak_record_id:'TEST-B',action_status:'Pending',is_applicable:true}],
  ops_tasks:[{id:'t1',unit_id:'u1',property_id:'p1',task_title:'Review fictional entry arrangements',status:'waiting',workflow_key:'maintenance',priority:'high',intake_details:{follow_up:{date:day}},updated_at:'2026-11-01T00:00:00Z'},{id:'t2',unit_id:'u2',task_title:'Check fictional smoke detector',status:'pending',intake_details:{}},{id:'t3',task_title:'Archived private task',status:'pending',archived_at:'2026-11-01T00:00:00Z'}],
  rent_schedules:[{id:'rent1',lease_id:'l1',amount_usd:1200,billing_period:'monthly',effective_from:'2025-01-01',effective_to:'2025-12-31',rent_kind:'contracted',verification_status:'unverified'}],
  ops_events:[{id:'e1',entity_type:'renewal_case',entity_id:'r1',event_type:'renewal_progress_updated',actor_id:USER,occurred_at:'2026-11-02T12:00:00Z',summary:'Fictional Alpha follow-up',event_metadata:{status:'follow_up_needed',next_action:'Confirm source terms'}},{id:'e2',entity_type:'renewal_case',entity_id:'r2',event_type:'renewal_progress_updated',actor_id:USER,occurred_at:'2026-11-03T12:00:00Z',summary:'Fictional Beta finished',event_metadata:{status:'completed',next_action:'None'}}],
  lease_reference_documents:[{id:'doc1',source_name:'Example reference.pdf',drive_file_id:'fictional123456789',page_count:10,received_at:'2026-11-03T00:00:00Z',sha256:'a'.repeat(64)}]
 }};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort('blockedbyclient');
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(x,status=200)=>route.fulfill({status,headers,body:JSON.stringify(x)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(u.pathname==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'test@example.invalid'}});
  if(u.pathname==='/auth/v1/user')return reply({id:USER,email:'test@example.invalid'});
  if(u.pathname==='/auth/v1/logout')return reply({});
  if(u.pathname==='/rest/v1/staff_memberships')return reply([{user_id:USER,role:state.viewer?'viewer':'admin',is_active:true}]);
  const name=u.pathname.split('/').pop();state.requests.push({name,query:u.search});
  if(req.method()!=='GET'){state.writes.push({name,body:req.postData()});return reply([])}
  if(state.hold&&u.searchParams.has('offset'))await state.hold;
  if(name===state.fail&&u.searchParams.has('offset'))return reply({message:'Fictional denied read'},403);
  if(state.failPortfolio&&name==='renewal_cases'&&!u.searchParams.has('offset'))return reply({message:'Fictional portfolio failure'},503);
  let rows=state.fixtures[name]||[];
  // Older modules have their own journal filters; the connected store pages all events.
  if(name==='ops_events'&&u.searchParams.has('event_type'))rows=rows.filter(e=>u.searchParams.get('event_type')==='eq.'+e.event_type);
  const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);
  return reply(rows.slice(offset,offset+limit));
 });
 await page.goto(ORIGIN+'/');
 if(login){await signIn(page);await expect(page.locator('#operations-status')).toContainText('active saved sources')}
 return state;
}
async function signIn(page){await page.locator('#account-button').click();await page.locator('#pilot-email').fill('test@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#account-dialog')).not.toBeVisible()}
async function openActions(page){await page.locator('#operations-centre>summary').click();await expect(page.locator('#operations-title')).toBeVisible()}

test('Action Centre projects genuine tasks and latest saved renewal status, saves only a filter enum',async({page})=>{
 const s=await setup(page);await openActions(page);
 await expect(page.locator('#operations-queue')).toContainText('Review fictional entry arrangements');await expect(page.locator('#operations-queue')).toContainText('TEST-A');await expect(page.locator('#operations-queue')).not.toContainText('TEST-B');await expect(page.locator('#operations-queue')).not.toContainText('Archived private');
 await expect(page.locator('#operations-coverage')).toContainText('Not tracked');await expect(page.locator('#operations-coverage')).toContainText('Open maintenance tasks');
 await page.locator('#operations-filter').selectOption('maintenance');await expect(page.locator('#operations-queue .operations-action')).toHaveCount(1);
 await page.locator('#operations-save-filter').click();expect(await page.evaluate(()=>localStorage.getItem('oaktown-action-filter-v1'))).toBe('maintenance');
 await page.locator('#operations-queue').getByRole('button',{name:'Review task',exact:true}).click();await expect(page.locator('#today-edit-dialog')).toBeVisible();await expect(page.locator('#today-edit-title')).toHaveValue('Review fictional entry arrangements');await page.locator('#today-edit-cancel').click();
 expect(s.writes).toHaveLength(0);
});

test('Reload retains reviewed editor access when Today finishes before the connected module loads',async({page})=>{
 await setup(page);
 await page.route('**/operations.js?*',async route=>{
  await page.waitForFunction(()=>!!window.OpsCloud?.user&&!!window.OpsToday);
  await page.evaluate(()=>window.OpsToday.refresh());await route.continue();
 });
 await page.reload();await expect(page.locator('#operations-status')).toContainText('active saved sources');await openActions(page);
 await expect(page.locator('#operations-queue').getByRole('button',{name:'Review task',exact:true}).first()).toBeVisible();
});
test('Keyboard search routes exact units, historical people and renewal sources',async({page})=>{
 await setup(page);await page.keyboard.press('Control+k');await expect(page.locator('#operations-query')).toBeFocused();await page.locator('#operations-query').fill('Unit A');await expect(page.locator('#operations-results')).toContainText('100 Example Court · Unit A');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#operations-profile-title')).toHaveText('100 Example Court · Unit A');
 await expect(page.locator('#operations-profile-content')).toContainText('Alpha reference lease');await expect(page.locator('#operations-profile-content')).not.toContainText('Beta reference lease');await expect(page.locator('#operations-profile-content')).toContainText('Fictional Alpha follow-up');await expect(page.locator('#operations-profile-content')).not.toContainText('Fictional Beta finished');await expect(page.locator('#operations-profile-content')).toContainText('$1,200.00');
 await page.locator('#operations-profile-content').getByRole('button',{name:'Alpha reference lease',exact:true}).click();await page.locator('#operations-profile-content').getByRole('button',{name:'Avery Fictional',exact:true}).click();await expect(page.locator('#operations-profile-content')).toContainText('avery@example.invalid');await expect(page.locator('#operations-profile-content')).not.toContainText('blair@example.invalid');
 await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.locator('#operations-query').fill('TEST-A');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#ops-renewals-detail')).toContainText('TEST-A');await expect(page.locator('#ops-renewals-panel')).toBeVisible();
});
test('Reference centre uses safe original links and never associates references by filename',async({page})=>{
 await setup(page);await openActions(page);await page.locator('#operations-documents-open').click();await expect(page.locator('#operations-profile-title')).toHaveText('Lease reference library');
 await expect(page.locator('#operations-profile-content')).toContainText('not automatically linked');const a=page.locator('#operations-profile-content a');await expect(a).toHaveAttribute('href','https://drive.google.com/file/d/fictional123456789/view');await expect(a).toHaveAttribute('rel','noopener noreferrer');
});

test('Archiving removes active work while its source-linked journal remains readable',async({page})=>{
 const s=await setup(page);s.fixtures.ops_tasks[2].unit_id='u1';s.fixtures.ops_events.push({id:'archived-event',entity_type:'task',entity_id:'t3',event_type:'task_work_recorded',occurred_at:'2026-10-30T12:00:00Z',summary:'Fictional archived work journal'});
 await page.evaluate(()=>window.OpsOperations.refresh(true));await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));
 await page.locator('#operations-profile-content summary').filter({hasText:'Activity timeline'}).click();
 const row=page.locator('.operations-history-row').filter({hasText:'Fictional archived work journal'});await expect(row).toBeVisible();await row.getByRole('button',{name:'Open source record'}).click();
 await expect(page.locator('#operations-profile-title')).toHaveText('Archived private task');await expect(page.locator('#operations-profile-content')).toContainText('restore from Tasks');await expect(page.locator('#today-edit-dialog')).not.toBeVisible();
});

test('Profile links close the modal before opening an existing editor and show a read-only renewal fallback on failure',async({page})=>{
 const s=await setup(page);await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));
 await page.locator('#operations-profile-content').getByRole('button',{name:'TEST-A · Pending',exact:true}).click();await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();await expect(page.locator('#ops-renewals-detail')).toContainText('TEST-A');
 await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));await page.locator('#operations-profile-content').getByRole('button',{name:'Review fictional entry arrangements · waiting',exact:true}).click();await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();await expect(page.locator('#today-edit-dialog')).toBeVisible();await page.locator('#today-edit-cancel').click();
 s.failPortfolio=true;await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));await page.locator('#operations-profile-content').getByRole('button',{name:'TEST-A · Pending',exact:true}).click();await expect(page.locator('#operations-profile-title')).toHaveText('TEST-A');await expect(page.locator('#operations-profile-content')).toContainText('read-only summary');
});
test('Read-only task profile opens saved property, unit, lease and renewal without adding writes',async({page})=>{
 const s=await setup(page,{viewer:true});
 s.fixtures.ops_tasks[0].lease_id='l1';s.fixtures.ops_tasks[0].renewal_case_id='r1';
 await page.evaluate(()=>window.OpsOperations.refresh(true));
 await page.evaluate(()=>window.OpsOperations.openProfile('task','t1'));
 const related=page.locator('#operations-profile-content .operations-profile-section').filter({hasText:'Saved related records'});
 await expect(related).toContainText('100 Example Court');
 await expect(related).toContainText('Unit A');
 await expect(related).toContainText('Alpha reference lease');
 await expect(related).toContainText('TEST-A');
 await related.getByRole('button',{name:'Lease · Alpha reference lease'}).click();
 await expect(page.locator('#operations-profile-title')).toHaveText('Alpha reference lease');
 expect(s.writes).toHaveLength(0);
});
test('Anonymous, viewer, sign-out and late replies clear every connected private view',async({page})=>{
 const s=await setup(page,{login:false});expect(s.requests.filter(x=>x.query.includes('offset=')).length).toBe(0);await page.keyboard.press('Control+k');await expect(page.locator('#operations-search-dialog')).toBeVisible();await expect(page.locator('#operations-results')).not.toContainText('Fictional');await page.keyboard.press('Escape');await signIn(page);await expect(page.locator('#operations-status')).toContainText('active saved sources');
 s.viewer=true;await page.evaluate(()=>window.OpsToday.refresh());
 await openActions(page);await page.locator('#operations-queue').getByRole('button',{name:'View task',exact:true}).first().click();await expect(page.locator('#operations-profile-title')).toContainText('Review fictional');await expect(page.locator('#today-edit-dialog')).not.toBeVisible();
 let release;s.hold=new Promise(r=>release=r);await page.evaluate(()=>{void window.OpsOperations.refresh(true)});
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#operations-profile-dialog')).not.toBeVisible();await expect(page.locator('#operations-queue')).toBeEmpty();await expect(page.locator('#operations-profile-content')).toBeEmpty();
 release();await expect(page.locator('#operations-status')).toContainText('Sign in');await page.keyboard.press('Control+k');await page.locator('#operations-query').fill('Fictional');await expect(page.locator('#operations-results')).not.toContainText('Review fictional');
});

test('Unapproved viewer sign-in never loads the connected record store',async({page})=>{
 const s=await setup(page,{login:false,viewer:true});await page.locator('#account-button').click();await page.locator('#pilot-email').fill('test@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();
 await expect(page.locator('#pilot-auth-status')).toContainText('access not approved');expect(s.requests.filter(x=>x.query.includes('offset=')).length).toBe(0);
});

test('Global search reads later API pages rather than silently omitting records after the first thousand',async({page})=>{
 const s=await setup(page);s.fixtures.people=Array.from({length:1001},(_,i)=>({id:'person-'+String(i).padStart(5,'0'),display_name:i===1000?'Final Fictional Person':'Fictional person '+i}));
 await page.evaluate(()=>window.OpsOperations.refresh(true));expect(s.requests.some(x=>x.name==='people'&&x.query.includes('offset=1000'))).toBe(true);
 await page.keyboard.press('Control+k');await page.locator('#operations-query').fill('Final Fictional');await expect(page.locator('#operations-results')).toContainText('Final Fictional Person');
});

test('Unavailable optional data is labeled and denied core reads remove stale search and profiles',async({page})=>{
 const s=await setup(page);await openActions(page);s.fail='ops_events';await page.locator('#operations-refresh').click();await expect(page.locator('#operations-status')).toContainText('Journal unavailable');
 await page.evaluate(()=>window.OpsOperations.openProfile('unit','u1'));await expect(page.locator('#operations-profile-content')).toContainText('Activity could not be loaded');await page.keyboard.press('Escape');
 s.fail='people';await page.locator('#operations-refresh').click();await expect(page.locator('#operations-status')).toContainText('Could not load saved records');await expect(page.locator('#operations-queue')).toBeEmpty();await page.keyboard.press('Control+k');await page.locator('#operations-query').fill('Avery');await expect(page.locator('#operations-results')).not.toContainText('Avery Fictional');
});

test('Connected views fit all six themes at 320px and compact mode persists without work data',async({page})=>{
 await setup(page);await page.setViewportSize({width:320,height:840});await openActions(page);await page.locator('#operations-density').click();
 expect(await page.evaluate(()=>localStorage.getItem('oaktown-density-v1'))).toBe('compact');
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await page.locator('#ops-theme-select').selectOption(theme);await page.evaluate(()=>window.OpsOperations.openProfile('property','p1'));await expect(page.locator('#operations-profile-title')).toHaveText('100 Example Court');
  const overflow=await page.locator('#operations-profile-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+2);expect(overflow,theme+' profile overflow').toBe(false);await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),theme+' page overflow').toBe(false);
 }
});
