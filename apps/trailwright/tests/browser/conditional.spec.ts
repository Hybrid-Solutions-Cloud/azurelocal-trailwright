import { step } from './nav';
import { expect, test } from '@playwright/test';

test('the storage questions follow the storage architecture', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Storage').click();

  // Storage Spaces Direct only (the default): volumes, no LUNs.
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toHaveCount(0);

  // SAN only: LUNs, no S2D volumes.
  await page.getByRole('radio', { name: 'SAN (disaggregated)' }).check();
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toHaveCount(0);

  // Both: both lists.
  await page.getByRole('radio', { name: 'Both: S2D and SAN' }).check();
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toBeVisible();
});

test('a SAN design drops the drive and storage-network questions', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await expect(page.getByLabel('Node 1 drives')).toBeVisible();

  await step(page, 'Storage').click();
  await page.getByRole('radio', { name: 'SAN (disaggregated)' }).check();

  await step(page, 'Hardware and topology').click();
  await expect(page.getByLabel('Node 1 drives')).toHaveCount(0);

  await step(page, 'Networking').click();
  await expect(page.getByText('Storage runs on the SAN')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Switchless' })).toHaveCount(0);
});

test('the region list offers only Azure Local regions', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Deployment type and region').click();
  const options = await page.getByLabel('Azure region').locator('option').allTextContents();
  expect(options).toEqual(['East US', 'West Europe', 'Australia East', 'Southeast Asia', 'India Central', 'Canada Central', 'Japan East', 'South Central US']);
  await page.getByRole('radio', { name: 'Azure Government' }).check();
  expect(await page.getByLabel('Azure region').locator('option').allTextContents()).toEqual(['US Gov Virginia']);
});

test('a design can start clean or from the bundled example', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load the example project' }).click();
  await page.getByRole('button', { name: 'Replace my design with the example' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Example lab');
  await page.getByRole('button', { name: 'Start a clean design' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Untitled project');
});