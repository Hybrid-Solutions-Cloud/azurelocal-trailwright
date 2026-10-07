import { expect, test } from '@playwright/test';
import { step } from './nav';

test('the disconnected operations step appears only for a disconnected design', async ({ page }) => {
  await page.goto('/');
  await expect(step(page, 'Disconnected operations')).toHaveCount(0);
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByText('Disconnected (air-gapped)').click();
  await expect(step(page, 'Disconnected operations')).toBeVisible();
  await step(page, 'Disconnected operations').click();
  await expect(page.getByRole('heading', { name: 'Disconnected operations' })).toBeVisible();
  await expect(page.getByLabel('External domain suffix (FQDN)')).toBeVisible();
});
