'use strict';
// Independent desktop acceptance against the exact Phase 2 source export.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('@playwright/test');
const root=process.argv[2],out=process.argv[3];if(!root||!out)throw Error('Usage: node capture-focus-desktop.cjs <phase2-export> <output-directory>');
const {mock,signIn,ORIGIN}=require(path.resolve(root,'tests/focus-board-fixtures.cjs'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({args:['--no-sandbox']}),context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),s=await mock(page);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 s.tasks[0].notes='Fictional review evidence only. Confirm the saved source before proceeding.';
 s.tasks[0].intake_details.next_action='Review the fictional inspection follow-up.';
 const before=JSON.stringify(s.tasks);await page.goto(ORIGIN+'/#/focus');await signIn(page);await page.locator('.focus-open-task').waitFor();
 const served=await (await page.request.get(ORIGIN+'/focus-board.js')).body(),source=fs.readFileSync(path.join(root,'focus-board.js'));assert.equal(served.compare(source),0,'Server must serve the exact exported Phase 2 controller');
 const evidence={sourceCommit:'70f63c43232f8efe7ec58ac769b949dbc31498b9',controllerSHA256:crypto.createHash('sha256').update(source).digest('hex'),fictional:true,desktopOnly:true,widths:[],writes:0,pageErrors:[]};
 for(const width of [1280,1440,1920]){
  await page.setViewportSize({width,height:1080});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const board=await page.locator('.focus-card[data-offset="0"]').evaluate(n=>{const r=n.getBoundingClientRect();return {centerError:Math.abs(r.x+r.width/2-innerWidth/2),documentFits:document.documentElement.scrollWidth<=innerWidth}});assert.ok(board.centerError<2&&board.documentFits);
  await page.screenshot({path:path.join(out,'phase2-board-'+width+'.png'),animations:'disabled'});
  await page.locator('.focus-open-task').click();await page.locator('#focus-detail-dialog').waitFor({state:'visible'});
  const modal=await page.locator('#focus-detail-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,bodyFits:document.querySelector('#focus-detail-body').scrollWidth<=document.querySelector('#focus-detail-body').clientWidth}});assert.ok(modal.fits&&modal.bodyFits);
  await page.screenshot({path:path.join(out,'phase2-center-'+width+'.png'),animations:'disabled'});await page.keyboard.press('Escape');await page.locator('#focus-detail-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('.focus-open-task').evaluate(n=>n===document.activeElement),true);
  evidence.widths.push({width,height:1080,board,modal,focusRestored:true});
 }
 assert.equal(JSON.stringify(s.tasks),before);assert.equal(s.writes.length,0);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'desktop-acceptance.json'),JSON.stringify(evidence,null,2)+'\n');await browser.close();console.log('Desktop acceptance passed at 1280/1440/1920px: exact Phase 2 source, centered cards, fitting modal, Escape focus restore, zero writes or page errors.');
})().catch(e=>{console.error(e);process.exitCode=1});
