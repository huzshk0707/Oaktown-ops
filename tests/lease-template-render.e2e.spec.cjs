'use strict';
const {test,expect}=require('@playwright/test'),{open,prepare}=require('./lease-template-browser-fixtures.cjs'),{variant,names}=require('./lease-template-variants.cjs'),E=require('../lease-template-pdf.js');
const AxeBuilder=require('@axe-core/playwright').default,{chooseTheme}=require('./ui-helpers.cjs');
test('rendered three/four/five bedroom samples retain every original pixel outside their reviewed fields',async({page},testInfo)=>{
 test.setTimeout(120000);await page.goto('http://127.0.0.1:8765/');
 for(const name of [...names,...names.map(n=>'original:'+n)]){
  const originalCase=name.startsWith('original:'),f=await variant(name.replace('original:',''));if(originalCase){const profile=require('../lease-template-profile.js'),L=require('../vendor/lease-pdf/pdf-lib-1.17.1.min.js');f.state.roomPlacements=profile.suggestPlacements(f.state,name.includes('master')?'master':'columns');for(const k of Object.keys(f.state.conditions))f.state.conditions[k]='Good';f.state.roomLabels={};f.state.roomLocations={};f.bytes=await profile.prepare(f.bytes,L);const source=await E.inspect(f.bytes);f.data.template.map={...f.data.template.map,templateSha256:source.sha256,fields:[...f.data.template.map.fields.filter(x=>x.page!==8),...profile.page8Fields(f.state)],protectedAreas:profile.map(source,f.state,null).protectedAreas.filter(p=>p.page===8)};}expect(E.coverage(f.data),name).toEqual([]);const result=await E.generate(f.bytes,f.data,{viewerUser:()=> 'fictional-staff'});
  const comparison=await page.evaluate(async({original,filled,fields})=>{
   const pdfjs=await import('/vendor/lease-pdf/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/lease-pdf/pdfjs/pdf.worker.mjs';
   const settings={isEvalSupported:false,useSystemFonts:false,standardFontDataUrl:location.origin+'/vendor/lease-pdf/pdfjs/standard_fonts/',wasmUrl:location.origin+'/vendor/lease-pdf/pdfjs/wasm/'};
   const a=await pdfjs.getDocument({...settings,data:Uint8Array.from(atob(original),c=>c.charCodeAt(0))}).promise,b=await pdfjs.getDocument({...settings,data:Uint8Array.from(atob(filled),c=>c.charCodeAt(0))}).promise;const diffs=[];
   for(let n=1;n<=10;n++){
    const render=async doc=>{const p=await doc.getPage(n),v=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;return c};
    const before=await render(a),after=await render(b),x=before.getContext('2d').getImageData(0,0,before.width,before.height).data,y=after.getContext('2d').getImageData(0,0,after.width,after.height).data,rects=fields.filter(f=>f.page===n);let outside=0,inside=0;
    for(let i=0;i<x.length;i+=4){if(x[i]===y[i]&&x[i+1]===y[i+1]&&x[i+2]===y[i+2])continue;const px=(i/4)%before.width,py=Math.floor(i/4/before.width);const covered=rects.some(r=>px>=r.x-1&&px<=r.x+r.width+1&&py>=before.height-r.y-r.height-1&&py<=before.height-r.y+1);covered?inside++:outside++;}
    diffs.push({page:n,outside,inside,width:after.width,height:after.height});
   }
   await a.destroy();await b.destroy();return diffs;
  },{original:Buffer.from(f.bytes).toString("base64"),filled:Buffer.from(result.bytes).toString("base64"),fields:f.data.template.map.fields});
  expect(comparison.map(x=>x.outside),name).toEqual(Array(10).fill(0));expect(comparison.every(x=>x.width===612&&x.height===792)).toBe(true);expect(comparison.find(x=>x.page===8).inside).toBeGreaterThan(0);
  await testInfo.attach(name+'-pixel-comparison',{body:Buffer.from(JSON.stringify(comparison)),contentType:'application/json'});
 }
});
test('original PDF editor fits 1280/1440/1920 and remains accessible in all six desktop themes',async({page})=>{
 test.setTimeout(120000);const s=await open(page);await prepare(page,s);await page.locator('.lease-template-advanced').evaluate(n=>n.open=false);
 for(const theme of ['veyra','oryn','nilo','ember','verdant','pearl']){
  await chooseTheme(page,theme);
  for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1080});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#lease-template-canvas')).toBeVisible();}
  const scan=await new AxeBuilder({page}).include('#new-lease-panel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),theme).toEqual([]);
 }
});
