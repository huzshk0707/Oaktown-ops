'use strict';
// Desktop-only captures, isolated contexts, fictional API responses and sources.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const {open,addMessage,reviewFirst,draft,approvePlan,morningMock,signIn,ORIGIN}=require('../tests/morning-fixtures.cjs');
async function main(){
 const browser=await chromium.launch({...(process.env.OAKTOWN_CHROMIUM?{executablePath:process.env.OAKTOWN_CHROMIUM}:{}),args:['--no-sandbox']}),out=path.resolve(process.env.OAKTOWN_MORNING_CAPTURE_DIR||'test-results/ui-review/focus-board-phase-4');fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),s=await open(page);
 const capture=async(name)=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});};
 await addMessage(page);await reviewFirst(page);await page.locator('#morning-proposals').getByRole('button',{name:'Accept for SOD draft'}).click();
 await addMessage(page,{kind:'staff',subject:'Fictional staff request',body:'Leslie asked us to review the new maintenance report. Confirm the property before preparing a notice.',ref:'fictional-staff-002'});
 await page.locator('#morning-incoming').getByRole('button',{name:'Review IN-002'}).click();await page.locator('#morning-review-confirm').check();await page.locator('#morning-review-save').click();
 await page.locator('#morning-proposals').getByRole('button',{name:'Accept for SOD draft'}).last().click();
 await addMessage(page,{kind:'call',subject:'Fictional deposit failure',body:'Deposit failed: USD 500. Please review the original report.',ref:'fictional-call-003'});
 for(const col of await page.locator('.morning-column').all())await col.evaluate(n=>n.scrollTop=0);
 await capture('desktop-overview-1440');
 await page.setViewportSize({width:1920,height:1080});await capture('desktop-overview-1920');await page.setViewportSize({width:1280,height:1080});await capture('desktop-overview-1280');await page.setViewportSize({width:1440,height:1080});
 await page.locator('#morning-incoming').getByRole('button',{name:'Review IN-001'}).click();await capture('incoming-source-review');await page.locator('#morning-review-close').click();
 await page.locator('#morning-deposits').scrollIntoViewIfNeeded();await capture('deposit-classification');
 await page.locator('#morning-proposals').scrollIntoViewIfNeeded();await capture('staff-task-proposals');
 await draft(page);await page.locator('#sod-output').scrollIntoViewIfNeeded();await capture('draft-sod');
 await approvePlan(page);await page.getByText('Approved SOD',{exact:true}).click();await page.locator('#morning-approved-text').scrollIntoViewIfNeeded();await capture('approved-sod');
 await page.locator('#morning-start-open').click();await capture('start-focus-confirmation');await page.locator('#morning-start-confirm').click();await page.locator('#focus-morning-plan').waitFor({state:'visible'});await capture('approved-focus-board');
 const empty=await browser.newContext({viewport:{width:1440,height:1080}}),ep=await empty.newPage(),es=await morningMock(ep,0);await ep.goto(ORIGIN+'/#/morning');await signIn(ep);await ep.locator('#morning-secondary').evaluate(n=>n.open=true);await ep.locator('#morning-grid').waitFor({state:'visible'});await ep.screenshot({path:path.join(out,'empty-state.png'),animations:'disabled'});
 es.fail=true;await ep.locator('#morning-command-refresh').click();await ep.waitForFunction(()=>document.querySelector('#morning-state').textContent.includes('could not be loaded'));await ep.screenshot({path:path.join(out,'error-state.png'),animations:'disabled'});
 const operational=s.writes.filter(w=>w.path!=='/rest/v1/rpc/ops_morning_plan'||JSON.parse(w.body).action!=='approve').concat(es.writes);if(operational.length||s.events.length!==1)throw Error('Capture boundary failed: expected one approval and no operational write requests.');
 fs.writeFileSync(path.join(out,'capture-evidence.json'),JSON.stringify({fictional:true,desktopOnly:true,widths:[1280,1440,1920],productionRecordsUsed:0,operationalWrites:operational.length,fictionalApprovalEvents:s.events.length,writePaths:s.writes.map(w=>w.path)},null,2));
 await browser.close();console.log('Desktop Morning Command Center captures complete: fictional records, one explicit approval event, zero operational writes.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
