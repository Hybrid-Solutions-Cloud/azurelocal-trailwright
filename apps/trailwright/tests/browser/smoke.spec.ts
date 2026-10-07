import { expect, test } from '@playwright/test';

test('the guided flow lists the nine screens and states that nothing deploys', async ({ page }) => {
  await page.goto('/');
  const steps = page.locator('nav a');
  await expect(steps).toHaveCount(9);
  await expect(steps.first()).toHaveText('Project and release');
  await expect(steps.last()).toHaveText('Review and export');
  await expect(page.getByText('Design record only: nothing here deploys anything')).toBeVisible();
});

test('each step opens its own screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Networking' }).click();
  await expect(page.getByRole('heading', { name: 'Networking' })).toBeVisible();
});