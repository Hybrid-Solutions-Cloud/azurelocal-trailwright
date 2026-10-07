import type { Project } from '../model/schema';

// What the simplified machine provisioning portal flow asks for, as data: the site configuration and one row per machine.
// The ownership voucher is a small .pem file named after the machine's serial number, in \vouchers\<serial-number>\ on the USB drive
// (or downloaded from the Configurator app). Local administrator credentials are secrets: supply them in the portal, never in a file.
export function buildProvisioningManifest(p: Project): string {
  const v = p.provisioning;
  const manifest = {
    method: v.osInstall === 'simplified' ? 'simplified-machine-provisioning (preview)' : 'iso',
    note: v.osInstall === 'simplified' ? 'Preview. Only the East US region supports the provisioning resource; the resource group can be in another region.' : 'The operating system is installed locally from the ISO; there is no site or voucher.',
    site:
      v.osInstall === 'simplified'
        ? {
            name: v.siteName,
            resource_group: v.siteResourceGroup,
            provisioning_resource_region: 'eastus',
            time_zone: v.timeZone,
            time_server: v.timeServer,
            proxy_server: v.proxyServer,
            key_vault_for_administrator_credentials: v.adminKeyVaultName,
            hardware: v.hardwareSku,
          }
        : null,
    machines: p.hardware.nodes.map((n) => ({
      arc_resource_name: n.name,
      serial_number: n.serial ?? '',
      ownership_voucher: n.serial ? `vouchers/${n.serial}/${n.serial}.pem` : '',
      configurator_address: n.serial ? `${n.serial}.local` : '',
      static_ip: n.ip ?? '',
      software_version: v.osVersion,
      local_administrator: p.identity.localAdminUsername,
      local_administrator_password: 'supply in the portal (at least 12 characters with upper and lower case, a digit and a special character)',
    })),
    prerequisites: {
      feature: 'az feature register --namespace Microsoft.DeviceOnboarding --name AzureLocalZTP',
      resource_providers: ['Microsoft.HybridCompute', 'Microsoft.AzureStackHCI', 'Microsoft.DeviceOnboarding', 'Microsoft.Edge', 'Microsoft.GuestConfiguration', 'Microsoft.HybridConnectivity', 'Microsoft.KeyVault', 'Microsoft.ManagedIdentity', 'Microsoft.PolicyInsights', 'Microsoft.Storage', 'Microsoft.Insights'],
      roles: 'Owner on the resource group, or Contributor plus Role Based Access Control Administrator',
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}