import { step } from './nav';
import { expect, test } from '@playwright/test';

test('the storage questions follow the architecture chosen under connectivity mode and architecture', async ({ page }) => {
  await page.goto('/');
  const choose = async (name: string) => {
    await step(page, 'Connectivity mode and architecture').click();
    await page.getByRole('radio', { name, exact: true }).check();
    await step(page, 'Storage').click();
  };

  // Hyperconverged (the default): volumes, no LUNs.
  await step(page, 'Storage').click();
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toHaveCount(0);

  // Disaggregated: LUNs, no S2D volumes.
  await choose('Disaggregated');
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toHaveCount(0);

  // Hyperconverged with an external SAN: both lists.
  await choose('Hyperconverged with an external SAN');
  await expect(page.getByRole('heading', { name: 'SAN LUNs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Spaces Direct volumes' })).toBeVisible();
});

test('a disaggregated design drops the drive and storage-network questions', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await expect(page.getByLabel('Node 1 drives')).toBeVisible();

  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Disaggregated', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Fibre Channel SAN' })).toBeVisible();

  await step(page, 'Hardware and topology').click();
  await expect(page.getByLabel('Node 1 drives')).toHaveCount(0);
  await expect(page.getByLabel('Racks (1 to 8)')).toBeVisible();
  await expect(step(page, 'Network design')).toHaveCount(0);
});
test('the region list offers only Azure Local regions', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Connectivity mode and architecture').click();
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