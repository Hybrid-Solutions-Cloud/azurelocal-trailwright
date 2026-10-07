import { step } from './nav';
import { expect, test } from '@playwright/test';

test('private path asks for its own questions and flags what is missing', async ({ page }) => {
  await page.goto('/');
  await step(page, 'Outbound connectivity').click();

  // Direct outbound: no gateway, no private path questions.
  await expect(page.getByLabel('Arc gateway resource name')).toHaveCount(0);
  await expect(page.getByLabel('Azure Firewall private IP address')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Private path' }).check();
  await expect(page.getByLabel('Arc gateway resource name')).toBeVisible();
  await expect(page.getByLabel('Azure Firewall private IP address')).toBeVisible();

  const findings = page.getByLabel('Findings');
  await expect(findings).toContainText('ExpressRoute or site-to-site VPN');
  await expect(findings).toContainText('private IP address and port');

  await page.getByLabel('Private connection to Azure').selectOption('expressroute');
  await page.getByLabel('Azure Firewall private IP address').fill('192.0.2.4');
  await page.getByLabel('Explicit proxy port').fill('8443');
  await expect(findings).not.toContainText('ExpressRoute or site-to-site VPN');
  await expect(findings).not.toContainText('private IP address and port');

  await page.getByLabel('An Azure Arc Private Link Scope is configured on this virtual network').check();
  await expect(findings).toContainText('Private Link Scope');

  // Back to a proxy path: the private path questions go away.
  await page.getByRole('radio', { name: 'Enterprise proxy', exact: true }).check();
  await expect(page.getByLabel('Azure Firewall private IP address')).toHaveCount(0);
  await expect(page.getByLabel('Proxy address')).toBeVisible();
});