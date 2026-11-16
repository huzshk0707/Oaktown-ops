'use strict';
// Desktop-only fictional records. No production requests or writes.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const {morningMock,signIn,ORIGIN}=require('../tests/morning-fixtures.cjs'),{saved}=require('../tests/daily-fixtures.cjs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']}),out=path.resolve('docs/phase-5-desktop');fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),s=await morningMock(page);s.events=[saved(s)];
 await page.goto(ORIGIN+'/#/morning');await signIn(page);await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Approved');
 const capture=async(name)=>page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});
 await capture('command-center-1440');await page.setViewportSize({width:1920,height:1080});await capture('command-center-1920');await page.setViewportSize({width:1280,height:1080});await capture('command-center-1280');await page.setViewportSize({width:1440,height:1080});
 for(const [id,name]of [['daily-plan-panel','approved-sod'],['daily-priorities-panel','priorities'],['daily-blockers-panel','blockers']])await page.locator('.'+id).screenshot({path:path.join(out,name+'.png'),animations:'disabled'});
 await page.locator('#daily-assignments').locator('..').screenshot({path:path.join(out,'assignments.png'),animations:'disabled'});await page.locator('#daily-deposit-title').locator('../..').screenshot({path:path.join(out,'deposits-not-connected.png'),animations:'disabled'});
 await page.locator('#daily-start').click();await page.waitForURL(/#\/focus$/);await page.locator('#focus-deck').waitFor({state:'visible'});await capture('focus-transition');
 await page.locator('#focus-morning-review').click();s.historyFail=true;await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Stale / unavailable');await capture('stale-error');
 let release;s.historyFail=false;s.historyHold=new Promise(r=>release=r);await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='Loading');await capture('loading');s.events=[];s.tasks=[];s.historyHold=null;release();await page.waitForFunction(()=>document.querySelector('#daily-plan-status').textContent==='No approved SOD');await page.locator('#morning-command-refresh').click();await page.waitForFunction(()=>document.querySelector('#daily-counts').textContent.startsWith('0 active'));await capture('empty');
 if(s.writes.length)throw Error('Screenshot flow attempted a write');
 fs.writeFileSync(path.join(out,'README.md'),'# Phase 5 desktop review\n\nAll screenshots use fictional API fixtures, with zero write requests. Capture with `node scripts/capture-daily-center.cjs` using the CI Playwright version and the local app server on port 8765.\n\nWidths: 1280, 1440 and 1920. Covers the main dashboard, approved SOD, priorities, assignments, blockers, disconnected deposit source, Focus transition, loading, empty and stale-error states.\n');
 await browser.close();console.log('Phase 5 desktop captures completed with fictional records and zero writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
