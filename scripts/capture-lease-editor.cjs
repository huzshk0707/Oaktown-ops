'use strict';
// Local fictional API/browser fixtures only. Never reads a real staff session.
const {chromium}=require('@playwright/test'),fs=require('node:fs'),path=require('node:path');
const {open,prepare}=require('../tests/lease-template-browser-fixtures.cjs'),{variant,names}=require('../tests/lease-template-variants.cjs'),E=require('../lease-template-pdf.js');
(async()=>{
 const out=path.resolve('docs/lease-editor-examples');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1440,height:1080}});
 const s=await open(page);s.fixture=await variant('five-bedroom-master-bath');await prepare(page,s);await page.locator('.lease-template-advanced').evaluate(n=>n.open=false);
 await page.locator('#newlease-room').selectOption('bathroom-3');
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1080});await page.locator('[data-new-lease-step="3"]>h3').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'page8-editor-'+width+'.png'),animations:'disabled'});}
 await page.setViewportSize({width:1440,height:1080});await page.locator('.lease-original-editor').screenshot({path:path.join(out,'original-pdf-preview-1440.png'),animations:'disabled'});
 await page.locator('#new-lease-panel .guide-form-jump').nth(4).click();await page.getByRole('button',{name:'Mark Ready for Review',exact:true}).click();await page.locator('#lease-template-status').filter({hasText:'Ready for Review'}).waitFor();await page.locator('.lease-preparation-save').screenshot({path:path.join(out,'ready-review-1440.png'),animations:'disabled'});
 for(const name of names){
  const f=await variant(name),result=await E.generate(f.bytes,f.data,{viewerUser:()=> 'fictional-staff'});fs.writeFileSync(path.join(out,name+'-DRAFT.pdf'),result.bytes);
  const png=await page.evaluate(async bytes=>{
   const pdfjs=await import('/vendor/lease-pdf/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/lease-pdf/pdfjs/pdf.worker.mjs';const doc=await pdfjs.getDocument({data:Uint8Array.from(bytes),isEvalSupported:false,useSystemFonts:false,standardFontDataUrl:location.origin+'/vendor/lease-pdf/pdfjs/standard_fonts/'}).promise;
   const p=await doc.getPage(8),v=p.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;const png=c.toDataURL('image/png').split(',')[1];await doc.destroy();return png;
  },Array.from(result.bytes));fs.writeFileSync(path.join(out,name+'-page8.png'),Buffer.from(png,'base64'));
 }
 const profile=require('../lease-template-profile.js'),L=require('../vendor/lease-pdf/pdf-lib-1.17.1.min.js');
 for(const name of names){const f=await variant(name);f.state.roomPlacements=profile.suggestPlacements(f.state,name.includes('master')?'master':'columns');for(const key of Object.keys(f.state.conditions))f.state.conditions[key]='Good';f.state.roomLabels={};f.state.roomLocations={};const bytes=await profile.page8Preview(f.state,{PDFLib:L,E,viewerUser:()=> 'fictional'});fs.writeFileSync(path.join(out,'original-'+name+'-DRAFT.pdf'),bytes);}
 await browser.close();console.log('Fictional lease editor desktop/PDF examples captured; no live records used.');
})().catch(e=>{console.error(e);process.exitCode=1});
