import { step } from './nav';
import { expect, test } from '@playwright/test';

test('a file share witness is offered only for disconnected operations', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: /file share/i })).toHaveCount(0);

  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Disconnected (air-gapped)' }).check();
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: 'File share witness' })).toBeVisible();

  // Going back to connected removes the choice and resets a file share witness to a cloud witness.
  await page.getByRole('radio', { name: 'File share witness' }).check();
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Connected', exact: true }).check();
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: 'Cloud witness' })).toBeChecked();
});

test('the rack-aware choices follow the architecture', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('radio', { name: 'Rack-aware (two rooms)' }).check();
  await expect(page.getByRole('radio', { name: 'Dedicated storage links' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Cross-room node connectivity' })).toBeVisible();

  // An external SAN with the hyperconverged architecture is not supported with rack-aware: the topology goes back to a single rack.
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Hyperconverged with an external SAN' }).check();
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('radio', { name: 'Single rack' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Rack-aware (two rooms)' })).toHaveCount(0);
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
  await page.getByRole('link', { name: 'Next: Connectivity mode and architecture' }).click();
  await expect(page.getByRole('heading', { name: 'Connectivity mode and architecture' })).toBeVisible();
  await page.getByRole('link', { name: 'Back: Project' }).click();
  await expect(page.getByRole('heading', { name: 'Project' })).toBeVisible();
});