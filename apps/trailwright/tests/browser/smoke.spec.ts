import { step } from './nav';
import { expect, test } from '@playwright/test';

test('the guided flow lists the guided steps and states that nothing deploys', async ({ page }) => {
  await page.goto('/');
  const steps = page.locator('nav a');
  await expect(steps).toHaveCount(14);
  await expect(steps.first()).toContainText('Project');
  await expect(steps.last()).toContainText('Review and export');
  await expect(page.getByText('Design record only: nothing here deploys anything')).toBeVisible();
});

test('each step opens its own screen', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Intents, VLANs and IP plan').click();
  await expect(page.getByRole('heading', { name: 'Networking' })).toBeVisible();
});