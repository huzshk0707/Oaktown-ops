'use strict';
const {expect}=require('@playwright/test'),{navigate}=require('./ui-helpers.cjs'),R=require('../renewal-rules.js');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UNIT='11111111-1111-4111-8111-111111111111',UNIT2='22222222-2222-4222-8222-222222222222',PROPERTY='33333333-3333-4333-8333-333333333333';
const clone=x=>JSON.parse(JSON.stringify(x));
async function open(page){
 const f=await require('./lease-template-fixture.cjs').fixture();Object.assign(f.state,{unitId:UNIT,cityline:'Example City, KY 40201',approvalReviewed:true,depositStepReviewed:true,conditionsReviewed:true,satisfactory:'Yes',occupants:['Fictional Resident'],utilities:Object.fromEntries(R.utilities.map(x=>[x,'Tenant'])),appliances:Object.fromEntries(R.appliances.map(x=>[x,'No']))});
 const s={fixture:f,cases:new Map(),approvals:[],saveCalls:[],approveCalls:[],calls:[],saveHold:null,lostSaveReply:false,failGet:false,role:'admin',missing:false};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(body,status=200)=>route.fulfill({status,headers,body:JSON.stringify(body)}),fail=(message,status=400,code='22023')=>reply({message,code},status);
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});const p=u.pathname;
  if(p==='/auth/v1/token')return reply({access_token:'fictional-access',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'fictional@example.invalid'}});
  if(p==='/auth/v1/user')return reply({id:USER,email:'fictional@example.invalid'});if(p==='/auth/v1/logout')return reply({});
  if(p==='/rest/v1/staff_memberships')return reply([{role:s.role,is_active:true}]);
  if(p==='/rest/v1/properties')return reply([{id:PROPERTY,street_address:'100 Fictional Lane',city:'Example City',state:'KY',postal_code:'40201'}]);
  if(p==='/rest/v1/units')return reply([{id:UNIT,property_id:PROPERTY,unit_label:'Unit 1'},{id:UNIT2,property_id:PROPERTY,unit_label:'Unit 2'}]);
  if(p==='/rest/v1/rpc/ops_lease_preparation'){
   const {action,payload}=req.postDataJSON();s.calls.push({action,payload:clone(payload)});
   if(s.missing)return fail('Fictional function unavailable',404,'PGRST202');if(s.role!=='admin'&&s.role!=='editor')return fail('Native staff editor access required',403,'42501');
   if(action==='context'){
    const history=s.approvals.filter(r=>r.unit_id===payload.unit_id).slice().reverse().map(r=>({case_id:r.id,version:r.version,approved_by:USER,approved_at:'2026-11-16T12:00:00Z',state:Object.fromEntries(['bedrooms','bathrooms','basement','additionalRoom','conditions','roomLabels','roomLocations','roomPlacements'].map(k=>[k,r.data.state[k]]))}));
    return reply({unit:{id:payload.unit_id,unit_label:payload.unit_id===UNIT?'Unit 1':'Unit 2'},property:{id:PROPERTY},leases:[{id:'44444444-4444-4444-8444-444444444444',unit_id:payload.unit_id,lease_label:'Fictional verified lease',verification_status:'verified',term_start:'2026-01-01',term_end:'2026-12-31'}],rents:[],approved_conditions:history[0]||null,condition_history:history});
   }
   if(action==='templates')return reply({templates:s.approvals.map(r=>r.data.template)});
   if(action==='list')return reply({cases:[...s.cases.values()].filter(r=>!payload.unit_id||r.unit_id===payload.unit_id).map(({id,unit_id,version,status,updated_at})=>({id,unit_id,version,status,updated_at})),has_more:false});
   if(action==='get'){if(s.getHold)await s.getHold;if(s.failGet)return fail('Fictional readback unavailable',503,'upstream');return s.cases.has(payload.id)?reply(s.cases.get(payload.id)):fail('Preparation unavailable',404,'P0002')}
   if(action==='save'){
    s.saveCalls.push(clone(payload));if(s.saveHold)await s.saveHold;const prior=s.cases.get(payload.id);
    if(prior?.last_request===payload.request_ref)return prior.status===payload.status&&JSON.stringify(prior.data)===JSON.stringify(payload.data)?reply(prior):fail('Changed retry payload');
    if((prior?.version||0)!==payload.expected_version)return fail('Preparation changed; reload newer work',409,'40001');
    const row={id:payload.id,actor_id:USER,unit_id:payload.data.state.unitId,lease_id:payload.data.leaseId,version:(prior?.version||0)+1,status:payload.status,data:clone(payload.data),last_request:payload.request_ref,receipt:null,updated_at:'2026-11-16T12:00:00Z'};s.cases.set(row.id,row);
    if(s.lostSaveReply){s.lostSaveReply=false;return fail('Fictional lost save response',503,'upstream')}return reply(row);
   }
   if(action==='approve'){
    s.approveCalls.push(clone(payload));const row=s.cases.get(payload.id);if(!row)return fail('Preparation unavailable',404,'P0002');
    if(row.approval_ref===payload.request_ref)return reply(row);
    if(!payload.reviewed||payload.confirmation!=='APPROVE '+row.id+' VERSION '+row.version)return fail('Exact native review required');
    if(row.version!==payload.expected_version||row.status!=='ready')return fail('Preparation changed or not ready',409,'40001');
    row.version++;row.status='approved';row.approval_ref=payload.request_ref;row.receipt={schema_version:'oaktown.lease-preparation-receipt.v1',id:row.id,version:row.version,approved_by:USER,approved_at:'2026-11-16T12:00:00Z',data_sha256:'b'.repeat(64),template_sha256:row.data.template.map.templateSha256,executed:false};s.approvals.push(clone(row));return reply(row);
   }
   return fail('Unexpected fictional preparation operation');
  }
  if(p==='/rest/v1/rpc/ops_bill_reminders')return reply({rules:[],occurrences:[],can_edit:false});
  return reply([]);
 });
 await page.goto(ORIGIN+'/');await page.locator('#account-button').click();await page.locator('#pilot-email').fill('fictional@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#account-label')).toHaveText('Signed in');
 await navigate(page,'leases');await page.locator('#lease-tab-new').click();await expect(page.locator('#newlease-unit option[value="'+UNIT+'"]').first()).toHaveCount(1);return s;
}
async function prepare(page,s){
 await page.evaluate(state=>window.OpsLeaseDraft.restore(state),s.fixture.state);
 await page.locator('#lease-template-file').setInputFiles({name:'Fictional Approved Blank.pdf',mimeType:'application/pdf',buffer:Buffer.from(s.fixture.bytes)});
 await expect(page.locator('#lease-template-source-status')).toContainText('10 original pages');
 await expect(page.locator('#lease-template-canvas')).toHaveAttribute('data-view','original');
 await page.locator('.lease-template-advanced').evaluate(n=>n.open=true);
 await page.locator('#lease-template-map-import').setInputFiles({name:'fictional-reviewed-map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s.fixture.data.template.map))});
 await expect(page.locator('#lease-template-status')).toContainText('Mapping loaded');
 await page.locator('#lease-template-reference').fill('Fictional approved blank original and reviewed mapping');await page.locator('#lease-template-original-reviewed').check();await page.locator('#lease-template-map-reviewed').check();
 await page.getByRole('button',{name:'Preview mapped ten-page lease',exact:true}).click();await expect(page.locator('#lease-template-status')).toContainText('Ten-page draft preview ready');await expect(page.locator('#lease-template-canvas')).toHaveAttribute('data-view','preview');
}
module.exports={open,prepare,UNIT,UNIT2};
