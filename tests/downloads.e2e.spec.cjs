'use strict';
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test.use({ browserName: 'chromium', acceptDownloads: true });
test.setTimeout(90000);

function pdfSummary(bytes) {
  const str = bytes.toString('latin1');
  if (!str.startsWith('%PDF-')) throw Error('Downloaded file is not a PDF');
  const pageCount=(str.match(/\/Type\s*\/Page\b/g)||[]).length;
  if (!str.includes('/XObject')) throw Error('PDF pages are missing rendered images');
  return { pageCount, byteCount: bytes.length };
}
async function fillNotice(page, {tenant,street,amount}) {
  await page.locator('#tenant').fill(tenant);
  await page.locator('#street').fill(street);
  await page.locator('#cityline').fill('Louisville, KY 40220');
  await page.locator('#owner').fill('Fictional Test Landlord');
  await page.locator('#charges [data-key="amount"]').first().fill(amount);
  await page.locator('#charges [data-key="amountDue"]').first().fill(amount);
}
async function getDownload(page, button) {
  page.once('dialog',dialog=>dialog.accept());
  const promise=page.waitForEvent('download',{timeout:45000});
  await page.locator(button).click();
  const download=await promise;
  if(download.failure() && await download.failure())throw Error(await download.failure());
  return download;
}

test('single notice PDF uses property filename and correct PDF page geometry', async ({page}) => {
  await page.goto('file://'+path.resolve('generator.html'));
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await fillNotice(page,{tenant:'Example Tenant',street:'11 Edmonia Ave',amount:'950.00'});
  const download=await getDownload(page,'#downloadOne');
  expect(download.suggestedFilename()).toBe('11 Edmonia Ave.pdf');
  const file=path.join(os.tmpdir(),'oaktown-single-verified.pdf');
  await download.saveAs(file);
  const bytes=fs.readFileSync(file);
  expect(pdfSummary(bytes).pageCount).toBe(1);
  expect(bytes.length).toBeGreaterThan(5000);
  const text=bytes.toString('latin1');
  expect(text).toContain('/MediaBox [0 0 612 792]');
  await expect(page.locator('#downloadStatus')).toContainText('PDF downloaded');
});

test('multi-charge notice yields a continuation page', async ({page}) => {
  await page.goto('file://'+path.resolve('generator.html'));
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await fillNotice(page,{tenant:'Second Example',street:'5413 Wintergreen Road',amount:'1000.00'});
  await page.locator('#addCharge').click();
  await page.locator('#charges [data-key="category"]').nth(1).fill('LATE FEE');
  await page.locator('#charges [data-key="description"]').nth(1).fill('Prior late fee');
  await page.locator('#charges [data-key="status"]').nth(1).fill('DUE');
  await page.locator('#charges [data-key="amount"]').nth(1).fill('50.00');
  await page.locator('#charges [data-key="amountDue"]').nth(1).fill('50.00');
  const d=await getDownload(page,'#downloadOne');
  const file=path.join(os.tmpdir(),'oaktown-two-page-verified.pdf');
  await d.saveAs(file);
  expect(pdfSummary(fs.readFileSync(file)).pageCount).toBe(2);
});

test('batch ZIP contains individual property-named PDFs, and handles duplicate property names', async ({page}) => {
  await page.goto('file://'+path.resolve('generator.html'));
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await fillNotice(page,{tenant:'Example One',street:'11 Edmonia Ave',amount:'900.00'});
  await page.locator('#addNotice').click();
  await fillNotice(page,{tenant:'Example Two',street:'1715 Baird Ave',amount:'1100.00'});
  await page.locator('#addNotice').click();
  await fillNotice(page,{tenant:'Example Three',street:'1715 Baird Ave',amount:'1200.00'});
  const d=await getDownload(page,'#downloadBatch');
  expect(d.suggestedFilename()).toMatch(/^Oaktown_7_Day_Notices_\d{4}-\d{2}-\d{2}\.zip$/);
  const file=path.join(os.tmpdir(),'oaktown-batch-verified.zip');
  await d.saveAs(file);
  const bytes=fs.readFileSync(file);
  const names=await page.evaluate(async base64=>{
    const binary=atob(base64);
    const data=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
    const archive=await JSZip.loadAsync(data);
    const names=Object.keys(archive.files).sort();
    const pdfHeaders={};
    for(const name of names){
      const content=await archive.file(name).async('uint8array');
      pdfHeaders[name]=String.fromCharCode(...content.slice(0,5));
    }
    return {names,pdfHeaders};
  },bytes.toString('base64'));
  expect(names.names).toEqual(['11 Edmonia Ave.pdf','1715 Baird Ave (2).pdf','1715 Baird Ave.pdf']);
  for(const name of names.names)expect(names.pdfHeaders[name]).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(10000);
});