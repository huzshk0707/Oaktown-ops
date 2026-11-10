'use strict';
const {test,expect}=require('@playwright/test'),fs=require('node:fs/promises'),Zip=require('../vendor/jszip-3.10.1.min.js');
const {chooseTheme}=require('./ui-helpers.cjs');
const ORIGIN='http://127.0.0.1:8765';
async function setup(page,windows=true){
 await page.addInitScript(value=>{Object.defineProperty(navigator,'platform',{value:value?'Win32':'Linux x86_64'});Object.defineProperty(navigator,'userAgentData',{value:undefined});},windows);
 await page.route('**/*',route=>new URL(route.request().url()).origin===ORIGIN?route.continue():route.abort());
 await page.goto(ORIGIN+'/');await page.locator('#desktop-apps-open').click();await expect(page.locator('#desktop-apps-dialog')).toBeVisible();
}
test('PDFCraft is a native app link; setup is configured locally and imports back without transmitting the path',async({page})=>{
 await setup(page);const link=page.getByRole('link',{name:'Open PDFCraft'});await expect(link).toHaveAttribute('href','oaktown-ops://launch/pdfcraft');
 await page.evaluate(()=>document.querySelector('[data-desktop-launch]').addEventListener('click',e=>e.preventDefault(),{capture:true}));await link.click();await expect(page.locator('#desktop-apps-status')).toContainText('Requested PDFCraft from Windows');
 await page.locator('#desktop-apps-setup>summary').click();
 await page.locator('#desktop-apps-download').click();await expect(page.locator('#desktop-apps-editor')).toBeVisible();
 await page.locator('#desktop-apps-path').fill('"C:\\Tools\\PDF editor & tools\\tool.exe"');await page.locator('#desktop-apps-save').click();
 const requests=[];page.on('request',r=>requests.push(r.url()));const pending=page.waitForEvent('download');await page.locator('#desktop-apps-download').click();const zip=await Zip.loadAsync(await fs.readFile(await (await pending).path()));
 const config=JSON.parse(await zip.file('apps.json').async('string'));expect(config.apps[0].executable).toBe('C:\\Tools\\PDF editor & tools\\tool.exe');expect(requests.every(url=>!url.includes('PDF%20editor')&&!url.includes('tool.exe'))).toBe(true);expect(zip.file('Launcher.cs')).toBeTruthy();expect(zip.file('Uninstall.cmd')).toBeTruthy();
 await page.locator('#desktop-apps-close').click();await page.reload();await page.locator('#desktop-apps-open').click();await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.locator('#desktop-apps-path')).toHaveValue(config.apps[0].executable);
 await page.locator('#desktop-apps-cancel-edit').click();await page.getByRole('button',{name:'Remove',exact:true}).click();await expect(page.locator('#desktop-apps-list')).not.toContainText('PDFCraft');
 await page.locator('#desktop-apps-import').setInputFiles({name:'apps.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});await expect(page.locator('#desktop-apps-list')).toContainText('PDFCraft');
 await page.keyboard.press('Escape');await expect(page.locator('#desktop-apps-open')).toBeFocused();
});
test('non-Windows launch is disabled; malicious app lists are rejected and late setup downloads are cancelled when closed',async({page})=>{
 await setup(page,false);await expect(page.getByRole('link',{name:'Open PDFCraft'})).toHaveAttribute('aria-disabled','true');
 await page.locator('#desktop-apps-setup').evaluate(e=>e.open=true);await page.locator('#desktop-apps-import').setInputFiles({name:'apps.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,apps:[{id:'bad?x=1',name:'Bad',executable:'C:\\tool.exe'}]}))});await expect(page.locator('#desktop-apps-status')).toContainText('Could not import');
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#desktop-apps-path').fill('C:\\Tools\\tool.exe');await page.locator('#desktop-apps-save').click();
 let release;const held=new Promise(r=>release=r);await page.route('**/assets/windows-launcher/Launcher.cs',async route=>{await held;await route.continue()});let downloads=0;page.on('download',()=>downloads++);
 await page.locator('#desktop-apps-download').click();await expect(page.locator('#desktop-apps-status')).toContainText('Preparing');await page.locator('#desktop-apps-close').click();const response=page.waitForResponse('**/assets/windows-launcher/Launcher.cs');release();await (await response).finished();await page.waitForTimeout(200);expect(downloads).toBe(0);
});
test('PC app dialog is keyboard accessible and fits all six themes on phone and desktop',async({page})=>{
 await setup(page);for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){await page.locator('#desktop-apps-close').click();await chooseTheme(page,theme);await page.locator('#desktop-apps-open').click();await page.locator('#desktop-apps-setup').evaluate(e=>e.open=true);
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:950});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#desktop-apps-dialog').scrollWidth<=document.querySelector('#desktop-apps-dialog').clientWidth)).toBe(true);if(process.env.OAKTOWN_UI_SCREENSHOTS==='1'&&width!==320)await page.locator('#desktop-apps-dialog').screenshot({path:test.info().outputPath('desktop-apps-'+theme+'-'+width+'-workspace.png')});}
 }
});
