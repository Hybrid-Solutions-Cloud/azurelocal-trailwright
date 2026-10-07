import { expect, test } from '@playwright/test';
import { step } from './nav';

test('the network design follows the node count, storage connectivity and switches', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();

  await step(page, 'Network design').click();
  await expect(page.getByText('Two nodes, storage switched, non-converged, two TOR switches').first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Fully converged' })).toBeVisible();
  await expect(page.getByLabel('Links between nodes')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Fully converged' }).check();
  await expect(page.getByText('Two nodes, storage switched, fully converged, two TOR switches').first()).toBeVisible();

  // Switchless with one TOR switch is a documented two-node pattern; the storage layout question goes away.
  await page.getByRole('radio', { name: 'Storage switchless' }).check();
  await page.getByRole('radio', { name: 'One TOR switch' }).check();
  await expect(page.getByText('Two nodes, storage switchless, one TOR switch').first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Fully converged' })).toHaveCount(0);

  // Three nodes switchless asks about links and needs storage subnets and StorageAutoIP off.
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Network design').click();
  await page.getByRole('radio', { name: 'Two TOR switches' }).check();
  await expect(page.getByRole('radio', { name: 'Single link' })).toBeVisible();
  await expect(page.getByLabel('Storage subnets')).toBeVisible();
  await expect(page.getByLabel('Findings')).toContainText('StorageAutoIP off');

  // A port count below the pattern is an error.
  await page.getByRole('radio', { name: 'Dual link' }).check();
  await page.getByRole('radio', { name: '4 ports' }).check();
  await expect(page.getByLabel('Findings')).toContainText('needs 6 network ports');
});

test('intent groupings that need a switch are offered only where supported', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Network design').click();
  await expect(page.getByRole('radio', { name: 'Group all traffic' })).toBeEnabled();
  await page.getByRole('radio', { name: 'Storage switchless' }).check();
  await expect(page.getByRole('radio', { name: 'Group all traffic' })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'Group compute and storage' })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'Group management and compute' })).toBeEnabled();
  await expect(page.getByRole('radio', { name: /Custom/ })).toBeEnabled();
});

test('a disaggregated node shows its Ethernet ports and standalone cluster networks', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Disaggregated', exact: true }).check();
  await step(page, 'Network design').click();
  await expect(page.getByText('Cluster network 1: standalone port, VLAN 1711')).toBeVisible();
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'IP-based SAN (iSCSI)' }).check();
  await step(page, 'Network design').click();
  await expect(page.getByText('iSCSI path A: standalone port, VLAN 300')).toBeVisible();
  await expect(page.getByRole('radio', { name: '6 ports' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '2 ports' })).toHaveCount(0);
});

test('applying the reference pattern fills the intents and ports', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Network design').click();
  await page.getByRole('button', { name: /Use this pattern/ }).click();
  await step(page, 'Intents, VLANs and IP plan').click();
  await expect(page.getByLabel('Intent 1 name')).toHaveValue('Management_Compute');
  await expect(page.getByLabel('Intent 2 adapters')).toHaveValue('pNIC03, pNIC04');
});