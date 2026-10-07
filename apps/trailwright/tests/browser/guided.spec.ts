import { step } from './nav';
import { expect, test } from '@playwright/test';

test('a file share witness is offered only for disconnected operations', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: /file share/i })).toHaveCount(0);

  await step(page, 'Deployment type and region').click();
  await page.getByRole('radio', { name: 'Hyperconverged, disconnected operations' }).check();
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: 'File share witness' })).toBeVisible();

  // Going back to connected removes the choice and resets a file share witness to a cloud witness.
  await page.getByRole('radio', { name: 'File share witness' }).check();
  await step(page, 'Deployment type and region').click();
  await page.getByRole('radio', { name: 'Hyperconverged, connected' }).check();
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: 'Cloud witness' })).toBeChecked();
});

test('a disaggregated deployment selects SAN storage', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Deployment type and region').click();
  await page.getByRole('radio', { name: 'Disaggregated, external SAN' }).check();
  await step(page, 'Storage').click();
  await expect(page.getByRole('radio', { name: 'SAN (disaggregated)' })).toBeChecked();
});

test('operations asks backup and disaster recovery follow-ups only when chosen', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Operations').click();
  await expect(page.getByLabel('Backup solution')).toHaveCount(0);
  await page.getByLabel('Back up VMs').check();
  await expect(page.getByLabel('Backup solution')).toBeVisible();
  await expect(page.getByLabel('Findings')).toContainText('Name the backup solution');
  await page.getByRole('radio', { name: 'Azure Site Recovery' }).check();
  await expect(page.getByLabel('Findings')).toContainText('Recovery Services vault');
});

test('next and back move through the steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Next: Deployment type and region' }).click();
  await expect(page.getByRole('heading', { name: 'Deployment type and region' })).toBeVisible();
  await page.getByRole('link', { name: 'Back: Project' }).click();
  await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible();
});