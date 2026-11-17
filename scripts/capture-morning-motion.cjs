'use strict';
// Fictional API fixtures only. No production login, records or write requests.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const {morningMock,signIn,ORIGIN}=require('../tests/morning-fixtures.cjs'),{saved}=require('../tests/daily-fixtures.cjs');
(async()=>{
 const out=path.resolve('docs/ui-review/morning-motion');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({...(process.env.OAKTOWN_CHROMIUM_PATH?{executablePath:process.env.OAKTOWN_CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),s=await morningMock(page);s.events=[saved(s)];
 const capture=async name=>page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});
 await page.goto(ORIGIN+'/');await page.locator('#morning-signin').waitFor();await capture('staff-entry');await signIn(page);await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Approved');
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1000});await capture('overview-'+width)}
 await page.setViewportSize({width:1440,height:1000});await page.locator('#daily-prepare').click();await page.locator('#sod-extras').fill('Fictional planning note: verify the appointment before confirming.');await capture('planner-1440');await page.locator('#daily-overview').click();
 let release;s.historyHold=new Promise(r=>release=r);await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-sod-step').dataset.state==='loading');await capture('reading-approved-plan');s.historyHold=null;release();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Approved');
 s.historyFail=true;await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Stale / unavailable');await capture('refresh-error');s.historyFail=false;await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Approved');
 await page.emulateMedia({reducedMotion:'reduce'});await capture('reduced-motion');await page.locator('#daily-start').click();await page.locator('#focus-deck').waitFor({state:'visible'});await capture('focus-board');
 if(s.writes.length)throw Error('Capture attempted a write');await context.close();await browser.close();console.log('Desktop UX screenshots: fictional records, zero writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
