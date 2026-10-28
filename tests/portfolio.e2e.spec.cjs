'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});
const P='00000000-0000-4000-8000-000000000001',U1='00000000-0000-4000-8000-000000000002',U8='00000000-0000-4000-8000-000000000003',T='00000000-0000-4000-8000-000000000004',H='00000000-0000-4000-8000-000000000005',R='00000000-0000-4000-8000-000000000006';
const fixtures={
 properties:[{id:P,street_address:'111 Fictional Road',city:'Louisville',state:'KY',postal_code:'40219',portfolio_id:'PROP-TEST',portfolio_state:'Active',updated_at:'2026-10-27T00:00:00Z'}],
 property_addressees:[],
 units:[{id:U1,property_id:P,unit_code:'UNIT-FAKE-1',unit_label:'Unit 1',unit_class:'Residential',occupancy_status:'Leased — verify',managed_by:'Ops',verification_status:'user_confirmed'},{id:U8,property_id:P,unit_code:'UNIT-FAKE-8',unit_label:'Unit 8',unit_class:'Residential',occupancy_status:'Vacant',managed_by:'Ops',verification_status:'user_confirmed'}],
 leases:[{id:H,unit_id:U8,tenancy_id:T,source_lease_key:'LEASE-FAKE',lease_label:'Old fictional lease',term_start:'2025-01-01',term_end:'2025-12-31',lease_status:'historical',verification_status:'unverified'}],
 bookings:[],people:[{id:'00000000-0000-4000-8000-000000000007',display_name:'Avery Example',phone:'5550100',email:'avery@example.invalid',contact_verification:'unverified'}],
 tenancy_people:[{tenancy_id:T,person_id:'00000000-0000-4000-8000-000000000007'}],
 renewal_cases:[{id:R,unit_id:U1,property_id:P,oak_record_id:'OAK-TEST',category:'Signature pending',current_status:'Await tenant',action_status:'Pending',signature_status:'Not signed',turbo_tenant_status:'Not verified',next_action:'Ask sample tenant to sign',action_owner_label:'Ops'}],
 ops_tasks:[{id:'00000000-0000-4000-8000-000000000008',unit_id:U1,renewal_case_id:R,workflow_key:'renewal',task_title:'Contact example',status:'pending',assigned_label:'Ops'}]
};
async function login(page){
 const activity=[];
 await page.route('https://wjdzaexhhjsjtdgxivyw.supabase.co/**',route=>{
  const u=new URL(route.request().url()),path=u.pathname,h={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'apikey,authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:h,body:''});
  let body;
  if(path==='/auth/v1/token')body={access_token:'fictional-access-token',refresh_token:'fictional-refresh-token',expires_in:3600};
  else if(path==='/auth/v1/user')body={id:'00000000-0000-4000-8000-000000000009',email:'sample@example.invalid'};
  else if(path==='/rest/v1/staff_memberships')body=[{role:'admin',is_active:true}];
  else if(path==='/auth/v1/logout')body={};
  else if(path==='/rest/v1/ops_events'){
   if(route.request().method()==='POST'){
    const item=route.request().postDataJSON();
    const id='00000000-0000-4000-8000-'+String(activity.length+10).padStart(12,'0');
    const row={...item,id,occurred_at:new Date(Date.UTC(2026,9,27,12,0,activity.length)).toISOString()};
    activity.unshift(row);body=[row];
   }else{
    const filter=u.searchParams.get('entity_id')?.replace(/^eq\./,'');
    body=activity.filter(row=>!filter||row.entity_id===filter);
   }
  }
  else if(path.startsWith('/rest/v1/'))body=fixtures[path.split('/').pop()]||[];
  else throw Error('Unexpected test API: '+path);
  return route.fulfill({status:200,headers:h,body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#staff-access-signin').click();
 await page.locator('#pilot-email').fill('tester@example.invalid');
 await page.locator('#pilot-password').fill('fictional-password');
 await page.locator('#pilot-login').click();
 await expect(page.locator('#account-label')).toContainText('Signed in');
 return activity;
}
test('full portfolio shows multiple units at one street and keeps historical contact distinct from notice addressee',async({page})=>{
 await login(page);
 await page.locator('[data-workspace="properties"]').click();
 await expect(page.locator('#ops-portfolio-status')).toContainText('2 of 2 units/lots shown');
 await expect(page.locator('#ops-portfolio-summary')).toContainText('2Units / lots');
 await page.locator('#ops-portfolio-search').fill('Unit 8');
 await expect(page.locator('#ops-portfolio-list .property-record')).toHaveCount(1);
 await page.locator('#ops-portfolio-list .property-record').click();
 await expect(page.locator('#ops-portfolio-detail')).toContainText('Vacant');
 await expect(page.locator('#ops-portfolio-detail')).toContainText('Old fictional lease');
 await expect(page.locator('#ops-portfolio-detail')).toContainText('Avery Example');
 await expect(page.locator('#property-directory-count')).toContainText('0 have a notice recipient');
});
test('renewals screen shows pending case and task from normalized Supabase tables',async({page})=>{
 await login(page);
 await page.locator('[data-workspace="leases"]').click();
 await expect(page.locator('#ops-renewals-panel')).toBeVisible();
 await expect(page.locator('#ops-renewals-status')).toContainText('1 of 1 renewal/asset cases shown');
 await page.locator('#ops-renewals-list .property-record').click();
 await expect(page.locator('#ops-renewals-detail')).toContainText('Ask sample tenant to sign');
 await expect(page.locator('#ops-renewals-detail')).toContainText('Contact example');
});


test('renewal preparation uses selected unit, validates choices and formats late fees without writing records',async({page})=>{
 await login(page);
 await page.locator('[data-workspace="leases"]').click();
 await expect(page.locator('#ops-renewal-generator')).toBeVisible();
 await page.locator('#renewal-unit').selectOption(U8);
 await expect(page.locator('#renewal-lease')).toHaveValue(H);
 await expect(page.locator('#renewal-tenant')).toHaveValue('Avery Example');
 await expect(page.locator('#renewal-start')).toHaveValue('2026-01-01');
 await expect(page.locator('#renewal-end')).toHaveValue('2026-12-31');
 await page.locator('#renewal-rent').fill('4,000.00');
 await expect(page.locator('#renewal-fees')).toHaveValue('$200.00 / $400.00');
 await page.locator('#renewal-form button[type="submit"]').click();
 await expect(page.locator('#renewal-output')).toBeHidden();
 for(let i=0;i<5;i++)await page.locator('#renewal-utility-'+i).selectOption('Tenant');
 for(let i=0;i<7;i++)await page.locator('#renewal-appliance-'+i).selectOption(i===4?'Yes':'No');
 await page.locator('#renewal-verified').check();
 await page.locator('#renewal-form button[type="submit"]').click();
 await expect(page.locator('#renewal-output')).toBeVisible();
 await expect(page.locator('#renewal-preview')).toContainText('$4,000.00');
 await expect(page.locator('#renewal-preview')).toContainText('Microwave: Yes');
 await expect(page.locator('#renewal-preview')).toContainText('Water [X Tenant]');
 await expect(page.locator('#renewal-output')).toContainText('No renewal record is saved');
});


test('renewal generator downloads a five-page unsigned PDF from approved inputs',async({page})=>{
 await login(page);
 await page.locator('[data-workspace="leases"]').click();
 await page.locator('#renewal-unit').selectOption(U8);
 await expect(page.locator('#renewal-lease')).toHaveValue(H);
 await page.locator('#renewal-rent').fill('4,000.00');
 for(let i=0;i<5;i++)await page.locator('#renewal-utility-'+i).selectOption('Tenant');
 for(let i=0;i<7;i++)await page.locator('#renewal-appliance-'+i).selectOption(i===4?'Yes':'No');
 await page.locator('#renewal-verified').check();
 await page.locator('#renewal-form button[type="submit"]').click();
 await expect(page.locator('#renewal-download-pdf')).toBeVisible();
 const downloadEvent=page.waitForEvent('download');
 await page.locator('#renewal-download-pdf').click();
 const download=await downloadEvent;
 expect(download.suggestedFilename()).toMatch(/Renewal Rental Lease.*\.pdf$/);
 const fs=require('node:fs'),buf=fs.readFileSync(await download.path());
 expect(buf.subarray(0,5).toString('ascii')).toBe('%PDF-');
 const text=buf.toString('latin1');
 expect((text.match(/\/Type\s*\/Page\b/g)||[]).length).toBe(5);
 await expect(page.locator('#renewal-pdf-status')).toContainText('Five-page unsigned PDF downloaded');
});


test('one-line renewal update saves status, next action and optional note in the staff event journal',async({page})=>{
 const activity=await login(page);
 await page.locator('[data-workspace="leases"]').click();
 await expect(page.locator('#ops-renewals-status')).toContainText('1 of 1');
 await page.locator('#ops-renewals-list .property-record').click();
 await expect(page.locator('#ops-renewal-tracker')).toBeVisible();
 await page.locator('#tracker-message').fill('I just sent a lease to sign');
 await expect(page.locator('#tracker-status')).toHaveValue('sent_for_signature');
 await expect(page.locator('#tracker-suggestion')).toContainText('Sent for signature');
 await page.locator('#tracker-note').fill('Tenant should check their email; follow up Wednesday.');
 await page.locator('#tracker-save').click();
 await expect(page.locator('#tracker-feedback')).toContainText('Saved to renewal history');
 await expect(page.locator('.tracker-history')).toContainText('Tenant should check their email');
 await expect(page.locator('#ops-renewals-list')).toContainText('Sent for signature');
 expect(activity).toHaveLength(1);
 expect(activity[0].event_metadata.status).toBe('sent_for_signature');
 expect(activity[0].event_metadata.note).toContain('follow up Wednesday');
 expect(activity[0].entity_id).toBe(R);
 await page.reload();
 await page.locator('[data-workspace="leases"]').click();
 await page.locator('#ops-renewals-list .property-record').click();
 await expect(page.locator('#ops-renewal-tracker')).toContainText('Tenant should check their email');
 await expect(page.locator('#tracker-status')).toHaveValue('sent_for_signature');
});
test('renewal workflow never interprets not sent as sent and allows optional notes',async({page})=>{
 const activity=await login(page);
 await page.locator('[data-workspace="leases"]').click();
 await page.locator('#ops-renewals-list .property-record').click();
 await page.locator('#tracker-message').fill('I have not sent the lease yet');
 await expect(page.locator('#tracker-status')).toHaveValue('unreviewed');
 await expect(page.locator('#tracker-suggestion')).toContainText('No confident status');
 await page.locator('#tracker-note').fill('Waiting on confirmation');
 await page.locator('#tracker-save').click();
 await expect(page.locator('#tracker-feedback')).toContainText('Saved');
 expect(activity[0].event_metadata.status).toBe('unreviewed');
});
