import { step } from './nav';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const manifest = {
  schemaVersion: '1.0',
  inputs: {
    hardware: { nodeCount: 3, capacityDrivesPerNode: 4, cacheDrivesPerNode: 0, coresPerNode: 16, memoryPerNodeGB: 256 },
    volumes: [{ name: 'Fast', resiliency: 'two-way-mirror', plannedSizeTB: 2 }],
  },
};

test('review lists findings with Learn sources and exports files', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('radio', { name: 'No witness' }).check();
  await step(page, 'Review and export').click();

  await expect(page.getByText('requires a witness')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Microsoft Learn' }).first()).toHaveAttribute('href', /^https:\/\/learn\.microsoft\.com\//);

  const handoff = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Design handoff (Markdown)' }).click();
  expect((await handoff).suggestedFilename()).toMatch(/-handoff\.md$/);

  const infra = page.waitForEvent('download');
  await page.getByRole('button', { name: /infrastructure\.yml/ }).click();
  expect((await infra).suggestedFilename()).toBe('infrastructure.yml');
});

test('a Surveyor plan shows its conflicts and applies on confirmation', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Review and export').click();
  await page.getByLabel('Open a Surveyor plan or a Trailwright project (JSON)').setInputFiles({
    name: 'plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(manifest)),
  });
  await expect(page.getByText(/Conflicts|No conflicts/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply import' }).click();

  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('button', { name: /Remove node/ })).toHaveCount(3);
  await step(page, 'Storage').click();
  await expect(page.getByLabel('Volume 1 name')).toHaveValue('Fast');
});

test('a file that is neither a project nor a plan is refused with a reason', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Review and export').click();
  await page.getByLabel('Open a Surveyor plan or a Trailwright project (JSON)').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  });
  await expect(page.getByRole('alert')).toContainText('Not a Trailwright project');
});

test('a saved Surveyor project file (as Surveyor 2.8.0 writes it) imports from the first screen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Open a Surveyor plan or a Trailwright project (JSON)').setInputFiles(resolve(process.cwd(), 'tests', 'fixtures', 'surveyor-project.json'));
  await expect(page.getByText(/Conflicts|No conflicts/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply import' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Azure Local plan');
  await step(page, 'Hardware and topology').click();
  await expect(page.getByRole('button', { name: /Remove node/ })).toHaveCount(2);
  await step(page, 'Storage').click();
  await expect(page.getByLabel('Volume 1 name')).toHaveValue('Volume1');
});