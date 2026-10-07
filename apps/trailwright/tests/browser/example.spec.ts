import { expect, test } from '@playwright/test';

test('the bundled example loads after confirmation and has no errors on the review screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load the example project' }).click();
  await page.getByRole('button', { name: 'Replace my design with the example' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Example lab');

  await page.getByRole('link', { name: 'Review and export' }).click();
  await expect(page.getByRole('status')).toContainText('0 errors, 0 warnings');
});