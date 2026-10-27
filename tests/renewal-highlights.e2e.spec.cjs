'use strict';
const {test,expect}=require('@playwright/test');
test.use({browserName:'chromium'});
test('renewal lease initials become yellow while black glyphs and lines remain intact',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 const result=await page.evaluate(async()=>{
  const P=window.OpsRenewalPDF;
  if(!P)throw Error('Renewal PDF module did not load');
  const pageNo=2,rect=P.INITIALS_HIGHLIGHTS[1][1];
  const response=await fetch(P.BASE+pageNo+'.png');
  if(!response.ok)throw Error('Master asset unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer());
  const original=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  const restored=await P.restoreInitialHighlights(bytes,pageNo);
  const changed=await createImageBitmap(await (await fetch(restored)).blob());
  function pixels(image){
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const context=canvas.getContext('2d');
   context.drawImage(image,0,0);
   const scale=image.width/612;
   return context.getImageData(Math.floor(rect[0]*scale),Math.floor(rect[1]*scale),
     Math.floor((rect[2]-rect[0])*scale),Math.floor((rect[3]-rect[1])*scale)).data;
  }
  const before=pixels(original),after=pixels(changed);
  let yellow=0,blackWas=0,blackPreserved=0;
  for(let i=0;i<before.length;i+=4){
   if(after[i]>170&&after[i+1]>170&&after[i+2]<90)yellow++;
   if(before[i]<70&&before[i+1]<70&&before[i+2]<70){
    blackWas++;
    if(after[i]<70&&after[i+1]<70&&after[i+2]<70)blackPreserved++;
   }
  }
  original.close();changed.close();
  return {yellow,blackWas,blackPreserved};
 });
 expect(result.yellow).toBeGreaterThan(100);
 expect(result.blackWas).toBeGreaterThan(15);
 expect(result.blackPreserved).toBe(result.blackWas);
});
