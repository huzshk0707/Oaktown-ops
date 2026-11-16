'use strict';
// Review-only browser reproduction; every API response/write is a fictional fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const root=process.argv[2],output=process.argv[3];if(!root||!output)throw Error('Usage: node reproduce-focus-defer-midnight.cjs <phase3-export> <result.json>');
const {actionMock,ORIGIN,signIn}=require(path.resolve(root,'tests/focus-actions-fixtures.cjs'));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1440,height:1080}}),s=await actionMock(page);
 await page.clock.setFixedTime(new Date('2026-11-15T23:59:00-05:00'));await page.goto(ORIGIN+'/#/focus');await signIn(page);await page.locator('.focus-card[data-offset="0"]').waitFor();
 const served=await (await page.request.get(ORIGIN+'/focus-actions.js')).body();assert.equal(served.compare(fs.readFileSync(path.join(root,'focus-actions.js'))),0);
 await page.locator('#focus-board-defer').click();await page.locator('#focus-followup-date').waitFor({state:'visible'});await page.locator('#focus-followup-date').fill('2026-11-16');
 await page.waitForFunction(()=>!document.querySelector('#focus-action-confirm').disabled);const beforeDay=await page.evaluate(()=>window.OpsTodayModel.today());assert.equal(beforeDay,'2026-11-15');assert.equal(s.saveCalls.length,0);
 await page.clock.setFixedTime(new Date('2026-11-16T00:01:00-05:00'));const afterDay=await page.evaluate(()=>window.OpsTodayModel.today());assert.equal(afterDay,'2026-11-16');
 await page.locator('#focus-action-confirm').click();await page.locator('#focus-action-dialog').waitFor({state:'hidden'});
 assert.equal(s.saveCalls.length,1);assert.equal(s.tasks[0].intake_details.follow_up.date,afterDay);assert.equal(s.tasks[0].status,'pending');
 const evidence={sourceCommit:'536ebcade697e5c7aa59e76e7e65f3c89535cdb1',outcome:'reproduced',fictionalOnly:true,reviewEasternDay:beforeDay,confirmEasternDay:afterDay,savedFollowUp:s.tasks[0].intake_details.follow_up.date,simulatedSaveCalls:s.saveCalls.length,realOperationalWrites:0,successMessage:await page.locator('#focus-recent-message').textContent()};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');await browser.close();console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e);process.exitCode=1});
