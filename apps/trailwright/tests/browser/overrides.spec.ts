import { expect, test } from '@playwright/test';
import { step } from './nav';

test('intent overrides and storage VLANs can be set and are flagged for OEM guidance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load the example project' }).click();
  await page.getByRole('button', { name: 'Replace my design with the example' }).click();
  await step(page, 'Intents, VLANs and IP plan').click();
  await expect(page.getByRole('heading', { name: 'Storage VLANs' })).toBeVisible();
  await page.getByLabel('Storage network 1 VLAN').fill('721');
  await page.getByText(/Advanced overrides for intent 1/).click();
  await page.getByLabel('Override virtual switch for intent 1').check();
  await page.getByLabel('Load balancing algorithm', { exact: true }).selectOption('HyperVPort');
  await expect(page.getByText(/Network ATC overrides are set/)).toBeVisible();
});
