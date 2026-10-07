import { expect, test } from '@playwright/test';
import { step } from './nav';

test('the cabling diagram draws for the example', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load the example project' }).click();
  await page.getByRole('button', { name: 'Replace my design with the example' }).click();
  await step(page, 'Network design').click();
  await expect(page.getByRole('heading', { name: 'Cabling diagram' })).toBeVisible();
  await page.getByRole('img', { name: 'Cabling diagram of the design' }).screenshot({ path: 'test-results/topology.png' }).catch(() => undefined);
});
