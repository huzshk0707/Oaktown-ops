'use strict';
const { test, expect } = require('@playwright/test');
test.use({ browserName: 'chromium' });
const ORIGIN = 'http://127.0.0.1:8765';

async function openDraft(page) {
  await page.route('**/wjdzaexhhjsjtdgxivyw.supabase.co/**', route => route.abort());
  await page.goto(ORIGIN + '/');
  const dialog=page.locator('#account-dialog');
  if(await dialog.isVisible())await page.locator('#account-close').click();
  await page.locator('[data-workspace="leads"]').click();
  await expect(page.locator('#leads-workflow')).toBeVisible();
}

test('Lead Copilot is a distinct tab; Notices remains unchanged', async ({page}) => {
  await openDraft(page);
  await expect(page.locator('#lead-incoming')).toBeVisible();
  await page.locator('[data-workspace="notices"]').click();
  await expect(page.locator('#notices-workflow')).toBeVisible();
  await expect(page.locator('#leads-workflow')).not.toBeVisible();
});

test('initial reply is Leslie script, but does not claim unverified availability', async ({page}) => {
  await openDraft(page);
  await page.locator('#lead-draft').click();
  await expect(page.locator('#lead-response')).toHaveValue(/DO NOT SEND ME YOUR LICENSE BEFORE THE QUESTIONS ARE ANSWERED AND I ASK FOR IT!/);
  await expect(page.locator('#lead-response')).not.toHaveValue(/Home is available and ready to go\./);
  await expect(page.locator('#lead-flags')).toContainText('availability has not been verified');
});

test('pasted tenant reply provides confirmable candidates, not automatic qualifications', async ({page}) => {
  await openDraft(page);
  await page.locator('#lead-incoming').fill('Our monthly income is $6,000 and we have one dog. We rent now.');
  await page.locator('#lead-detect').click();
  await expect(page.locator('.lead-candidate')).toHaveCount(3);
  await expect(page.locator('#lead-income')).toHaveValue('');
  await page.locator('.lead-candidate').first().getByRole('button',{name:'Confirm & apply'}).click();
  await expect(page.locator('#lead-income')).toHaveValue('6,000');
  await expect(page.locator('#lead-incomeBasis')).toHaveValue('unknown');
});

test('unlinked drafts do not create remote lead records', async ({page}) => {
  await openDraft(page);
  await page.locator('#lead-save').click();
  await expect(page.locator('#lead-save-status')).toContainText('Sign in');
});
