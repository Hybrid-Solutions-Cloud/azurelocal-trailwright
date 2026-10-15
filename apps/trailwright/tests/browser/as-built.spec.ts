import { step } from './nav';
import { expect, test } from '@playwright/test';

test('an as-built snapshot is compared with the design: matches, drift and a downloadable compare', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load the example project' }).click();
  await page.getByRole('button', { name: 'Replace my design with the example' }).click();
  await step(page, 'As-built compare').click();
  await expect(page.getByRole('heading', { name: 'As-built compare' })).toBeVisible();

  await page.getByLabel('As-built snapshot (JSON)').setInputFiles('tests/fixtures/as-built/from-ranger.snapshot.json');
  await expect(page.getByRole('status')).toContainText('match');
  await expect(page.getByRole('row', { name: /node2 serial number/ })).toContainText('drift');
  await expect(page.getByRole('row', { name: /VLAN 100/ })).toContainText('match');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download compare (CSV)' }).click();
  expect((await download).suggestedFilename()).toBe('example-lab-as-built-compare.csv');
});

test('a file that is not an as-built snapshot is refused with a reason', async ({ page }) => {
  await page.goto('/#/as-built');
  await page.getByLabel('As-built snapshot (JSON)').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"other"}') });
  await expect(page.getByRole('alert')).toContainText('as-built-snapshot.v1');
});
