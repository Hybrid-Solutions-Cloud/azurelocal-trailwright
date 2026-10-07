import { expect, test } from '@playwright/test';
import { step } from './nav';

test('simplified machine provisioning asks for the site, the machines and the preview limits', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByLabel('Time zone')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Simplified machine provisioning (preview)' }).check();
  for (const label of ['Machine model', 'Site name', 'Site resource group', 'Time zone', 'Time server', 'Proxy server', 'Key Vault for administrator credentials', 'Software version']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel('Findings')).toContainText('preview');
  await expect(page.getByLabel('Findings')).toContainText('Lenovo ThinkAgile MX650');
  await expect(page.getByText('Add the machines on Hardware and topology first.')).toBeVisible();

  // Each machine needs a serial number: the ownership voucher is named after it.
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByLabel('Findings')).toContainText('needs its serial number');
  await page.getByLabel('Machine 1 serial number').fill('ABC1234');
  await expect(page.getByText('vouchers/ABC1234/ABC1234.pem')).toBeVisible();
  await expect(page.getByLabel('Findings')).not.toContainText('needs its serial number');
});

test('the Arc gateway conflicts with simplified provisioning, and the ISO path registers with it', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Outbound connectivity').click();
  await page.getByRole('radio', { name: 'Arc gateway', exact: true }).check();
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByText('register the machines with the Arc gateway (step 5B)')).toBeVisible();
  await page.getByRole('radio', { name: 'Simplified machine provisioning (preview)' }).check();
  await expect(page.getByLabel('Findings')).toContainText('not supported with simplified machine provisioning');
  await expect(page.getByText('registers the machines with Azure Arc as part of the provisioning')).toBeVisible();
});

test('the portal cannot deploy a three-node switchless cluster', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Network design').click();
  await page.getByRole('radio', { name: 'Storage switchless' }).check();
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByLabel('Findings')).toContainText('only with ARM templates');
  await page.getByRole('radio', { name: 'ARM template' }).check();
  await expect(page.getByLabel('Findings')).not.toContainText('only with ARM templates');
});