import { expect, test } from '@playwright/test';
import { step } from './nav';

test('three cards with two ports each: name them, propose roles, and the intents follow', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Hardware and topology').click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await page.getByRole('button', { name: 'Add node' }).click();
  await step(page, 'Network design').click();

  await page.getByRole('button', { name: '3 cards, 2 ports each' }).click();
  await expect(page.getByLabel('Card 3 port 2 name')).toHaveValue('NIC3-P2');

  // Name the ports as the operating system shows them.
  await page.getByLabel('Card 1 port 1 name').fill('SLOT 3 Port 1');
  await page.getByLabel('Card 1 port 2 name').fill('SLOT 3 Port 2');

  await page.getByRole('button', { name: /Propose an assignment/ }).click();
  await expect(page.getByLabel('Role of SLOT 3 Port 1')).toHaveValue(/intent:/);

  // The intents follow the roles, using the confirmed names.
  await step(page, 'Intents, VLANs and IP plan').click();
  await expect(page.getByLabel('Intent 1 adapters')).not.toHaveValue('');
  const all = (await page.getByLabel(/Intent \d adapters/).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).join(',');
  expect(all).toContain('SLOT 3 Port 1');

  // A port with a role from another design is flagged, and a duplicate name is an error.
  await step(page, 'Network design').click();
  await page.getByLabel('Card 2 port 1 name').fill('SLOT 3 Port 1');
  await expect(page.getByLabel('Findings')).toContainText('must be unique');
});

test('a disaggregated iSCSI node needs one port for each cluster network and each iSCSI path', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Connectivity mode and architecture').click();
  await page.getByRole('radio', { name: 'Disaggregated', exact: true }).check();
  await page.getByRole('radio', { name: 'IP-based SAN (iSCSI)' }).check();
  await step(page, 'Network design').click();
  await page.getByRole('button', { name: '3 cards, 2 ports each' }).click();
  await page.getByRole('button', { name: /Propose an assignment/ }).click();
  await expect(page.getByRole('group', { name: 'Role iSCSI path A' })).toContainText('NIC');
  await expect(page.getByRole('group', { name: 'Role iSCSI path B' })).toContainText('NIC');
  await expect(page.getByLabel('Findings')).not.toContainText('needs exactly one standalone port');
});