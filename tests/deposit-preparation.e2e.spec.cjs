'use strict';
const {test,expect}=require('@playwright/test'),fs=require('node:fs/promises'),Zip=require('../vendor/jszip-3.10.1.min.js');
const {navigate,chooseTheme}=require('./ui-helpers.cjs');
const ORIGIN='http://127.0.0.1:8765',HOST='wjdzaexhhjsjtdgxivyw.supabase.co',USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function setup(page){
 let writes=0;await page.route('**/*',route=>{
  const r=route.request(),u=new URL(r.url());if(u.origin===ORIGIN)return route.continue();if(u.hostname!==HOST)return route.abort();
  const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(r.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  let data=[];if(u.pathname==='/auth/v1/token')data={access_token:'fictional-token',refresh_token:'fictional-refresh',expires_in:3600,user:{id:USER,email:'staff@example.invalid'}};
  else if(u.pathname==='/auth/v1/user')data={id:USER,email:'staff@example.invalid'};
  else if(u.pathname==='/auth/v1/logout')data={};
  else if(u.pathname==='/rest/v1/staff_memberships')data=[{user_id:USER,role:'admin',is_active:true}];
  else if(u.pathname.startsWith('/rest/')&&r.method()!=='GET')writes++;
  return route.fulfill({headers,body:JSON.stringify(data)});
 });await page.goto(ORIGIN+'/');await navigate(page,'applications');await page.locator('#application-deposit-open').click();
 await expect(page.locator('#deposit-address')).toBeDisabled();await page.locator('#deposit-signin').click();
 await page.locator('#pilot-email').fill('staff@example.invalid');await page.locator('#pilot-password').fill('fictional-password');await page.locator('#pilot-login').click();await expect(page.locator('#deposit-address')).toBeEnabled();return ()=>writes;
}
async function fill(page,pets='1'){
 for(const [id,value] of [['address','100 Fictional Road, Louisville, KY 40000'],['security','1000'],['rent','1025'],['pets',pets],['move-in','2027-02-20'],['greeting','Example']])await page.locator('#deposit-'+id).fill(value);
 await page.locator('[data-signer="name"]').fill('Example Applicant');await page.locator('[data-signer="email"]').fill('applicant@example.invalid');await page.locator('#deposit-approved').check();await page.locator('#deposit-review').click();await expect(page.locator('#deposit-status')).toContainText('Draft ready');
}
test('reviewed pet packet contains the correctly filled DOCX, fixed vendor sheet and exact editable email',async({page})=>{
 const writes=await setup(page);await fill(page);
 await expect(page.locator('.deposit-summary')).toContainText('$1,150.00');await expect(page.locator('.deposit-summary')).toContainText('$1,025.00');await expect(page.locator('.deposit-credit')).toContainText('$ 150.00');
 const email=await page.locator('#deposit-email').inputValue();expect(email).toContain('Hi Example,');expect(email).toContain('Move-In Vendors Sheet');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#deposit-copy').click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(email);
 const edited=email+'\nFictional staff clarification.';await page.locator('#deposit-email').fill(edited);
 const promise=page.waitForEvent('download');await page.locator('#deposit-packet').click();const download=await promise,zip=await Zip.loadAsync(await fs.readFile(await download.path()));
 expect(await zip.file('Deposit email.txt').async('string')).toBe(edited);
 expect(Buffer.from(await zip.file('Move-In Vendors.pdf').async('uint8array'))).toEqual(await fs.readFile('assets/deposit/move-in-vendors.pdf'));
 const form=await Zip.loadAsync(await zip.file(Object.keys(zip.files).find(n=>n.endsWith('.docx'))).async('uint8array')),xml=await form.file('word/document.xml').async('string');expect(xml).toContain('1,150.00');expect(xml).toContain('1,025.00');expect(xml).toContain('Example Applicant');expect(xml).toContain('02/20/2027');expect(xml).not.toContain('{{');expect(writes()).toBe(0);
});
test('no-pet and multiple-signer drafts keep the credit line; changed inputs and sign-out clear reviewed output',async({page})=>{
 const writes=await setup(page);await fill(page,'0');await expect(page.locator('.deposit-credit')).toContainText('upon lease signing.');await expect(page.locator('.deposit-credit')).not.toContainText('pet deposit');
 await page.locator('#deposit-add-signer').click();await page.locator('[data-signer="name"]').nth(1).fill('Second Example');await page.locator('[data-signer="email"]').nth(1).fill('second@example.invalid');await page.locator('#deposit-review').click();await expect(page.locator('#deposit-preview')).toContainText('Second Example');
 await page.locator('#deposit-pets').fill('2');await expect(page.locator('#deposit-packet')).toBeDisabled();await expect(page.locator('#deposit-preview')).toBeEmpty();await page.locator('#deposit-review').click();await expect(page.locator('.deposit-summary')).toContainText('$1,300.00');
 await page.evaluate(()=>window.OpsCloud.signOut());await expect(page.locator('#deposit-address')).toHaveValue('');await expect(page.locator('#deposit-email')).toHaveValue('');await expect(page.locator('#deposit-preview')).toBeEmpty();await expect(page.locator('#deposit-address')).toBeDisabled();expect(writes()).toBe(0);
});
test('deposit form fits all six themes on phone and desktop and includes an optional payment image only in the packet',async({page})=>{
 await setup(page);await fill(page);
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await chooseTheme(page,theme);for(const width of [1440,390,320]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,width:innerWidth,page:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('#deposit-preparation *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>el.id||el.tagName).slice(0,12)})),{message:theme+' at '+width+'px'}).toMatchObject({fits:true});}
 }
 await page.locator('#deposit-image').setInputFiles({name:'fictional-payment.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nSIAAAAASUVORK5CYII=','base64')});await page.locator('#deposit-review').click();await expect(page.locator('#deposit-image-preview')).toBeVisible();
 const promise=page.waitForEvent('download');await page.locator('#deposit-packet').click();const zip=await Zip.loadAsync(await fs.readFile(await (await promise).path()));expect(zip.file('Payment details.png')).toBeTruthy();expect(await zip.file('Deposit email.txt').async('string')).toContain('Payment details are included in the attached image.');
});

test('a late template response after sign-out cannot download applicant details',async({page})=>{
 await setup(page);await fill(page);let release,downloads=0;const held=new Promise(resolve=>release=resolve);
 await page.route('**/assets/deposit/holding-template.docx',async route=>{await held;await route.continue()});page.on('download',()=>downloads++);
 await page.locator('#deposit-docx').click();await expect(page.locator('#deposit-status')).toContainText('Preparing the download');
 await page.evaluate(()=>window.OpsCloud.signOut());const response=page.waitForResponse('**/assets/deposit/holding-template.docx');release();await (await response).finished();
 await page.waitForTimeout(300);await expect(page.locator('#deposit-status')).toContainText('Sign in');await expect(page.locator('#deposit-preview')).toBeEmpty();expect(downloads).toBe(0);
});

test('signing preview aligns identity, yellow blank areas and labels in two columns',async({page})=>{
 await setup(page);await fill(page);await page.locator('#deposit-add-signer').click();await page.locator('[data-signer="name"]').nth(1).fill('Second Fictional Applicant With A Longer Name');await page.locator('[data-signer="email"]').nth(1).fill('longer.fictional.email.address@example.invalid');await page.locator('#deposit-review').click();
 for(const width of [390,1440]){await page.setViewportSize({width,height:950});const geometry=await page.locator('.deposit-signature-grid').evaluateAll(blocks=>blocks.map(block=>{const c=[...block.children],b=c.map(e=>e.getBoundingClientRect());return {aligned:Math.abs(b[0].left-b[2].left)<1&&Math.abs(b[1].left-b[3].left)<1&&Math.abs(b[2].top-b[3].top)<1&&Math.abs(b[4].top-b[5].top)<1,colors:[getComputedStyle(c[2]).backgroundColor,getComputedStyle(c[3]).backgroundColor],blank:c[2].textContent===''&&c[3].textContent===''};}));expect(geometry).toHaveLength(2);for(const g of geometry){expect(g.aligned).toBe(true);expect(g.colors).toEqual(['rgb(255, 255, 0)','rgb(255, 255, 0)']);expect(g.blank).toBe(true);}}
});
