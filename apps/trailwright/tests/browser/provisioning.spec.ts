import { expect, test } from '@playwright/test';
import { step } from './nav';

test('simplified machine provisioning asks its own questions and conflicts with the Arc gateway', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByLabel('Site time zone')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Simplified machine provisioning (preview)' }).check();
  await expect(page.getByLabel('Site time zone')).toBeVisible();
  await expect(page.getByLabel('Hardware')).toBeVisible();
  await expect(page.getByLabel('Findings')).toContainText('preview');
  await expect(page.getByLabel('Findings')).toContainText('Lenovo ThinkAgile MX650');

  await step(page, 'Outbound connectivity').click();
  await page.getByRole('radio', { name: 'Arc gateway', exact: true }).check();
  await step(page, 'Provisioning and deployment method').click();
  await expect(page.getByLabel('Findings')).toContainText('not supported with simplified machine provisioning');
  await expect(page.getByText('register the machines with the Arc gateway (step 5B)')).toBeVisible();
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