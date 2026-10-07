import { expect, test } from '@playwright/test';

test('a two-node cluster without a witness is flagged and the flag clears with a cloud witness', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Hardware and topology' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();

  const findings = page.getByLabel('Findings');
  await page.getByRole('radio', { name: 'No witness' }).check();
  await expect(findings).toContainText('requires a witness');

  await page.getByRole('radio', { name: 'Cloud witness' }).check();
  await expect(findings).not.toContainText('requires a witness');
});

test('local identity without a Key Vault name is flagged, with the Learn source', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Identity' }).click();
  await page.getByRole('radio', { name: 'Local identity with Key Vault' }).check();

  const findings = page.getByLabel('Findings');
  await expect(findings).toContainText('requires a Key Vault name');
  await expect(findings.getByRole('link', { name: 'Microsoft Learn' }).first()).toHaveAttribute('href', /^https:\/\/learn\.microsoft\.com\//);

  await page.getByLabel('Key Vault name').fill('kv-example');
  await expect(findings).not.toContainText('requires a Key Vault name');
});

test('the project file survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project name').fill('Example design');
  await page.reload();
  await expect(page.getByLabel('Project name')).toHaveValue('Example design');
});