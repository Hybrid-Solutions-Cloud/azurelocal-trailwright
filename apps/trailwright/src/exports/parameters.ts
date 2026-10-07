import type { Project } from '../model/schema';
import { slug } from './types';

// Parameter values a design can supply for the Azure Local ARM and Bicep templates.
// Names are the template parameters listed on Microsoft Learn (deployment-azure-resource-manager-template and
// deployment-local-identity-with-key-vault-template). Secure parameters are never values: they are Key Vault references.

export type Template = 'active-directory' | 'local-identity';

export type Derived = { name: string; value: string | number }[];

// A two-node cluster must use the Cloud witness type (Learn: ARM template parameters reference).
export function witnessType(p: Project): 'Cloud' | 'FileShare' | '' {
  if (p.hardware.nodes.length === 2) return 'Cloud';
  if (p.hardware.witness === 'cloud') return 'Cloud';
  if (p.hardware.witness === 'file-share') return 'FileShare';
  return '';
}

export const SECURE_PARAMETERS = [
  { name: 'localAdminPassword', secret: 'local-admin-password' },
  { name: 'AzureStackLCMAdminPassword', secret: 'lcm-password' },
] as const;

export function deriveParameters(p: Project, template: Template): Derived {
  const out: Derived = [
    { name: 'location', value: p.landingZone.region },
    { name: 'clusterName', value: p.meta.name },
    { name: 'witnessType', value: witnessType(p) },
  ];
  if (p.landingZone.witnessStorageAccount) out.push({ name: 'clusterWitnessStorageAccountName', value: p.landingZone.witnessStorageAccount });
  out.push({ name: 'localAdminUserName', value: 'localadmin' }, { name: 'namingPrefix', value: slug(p.meta.name).slice(0, 8) });
  if (template === 'local-identity') {
    out.push({ name: 'identityProvider', value: 'LocalIdentity' });
    const vault = p.landingZone.keyVaultName || p.identity.keyVaultName;
    if (vault) out.push({ name: 'keyVaultName', value: vault });
    out.push({ name: 'softDeleteRetentionDays', value: 7 });
  } else if (p.identity.domain) {
    out.push({ name: 'domainFqdn', value: p.identity.domain });
  }
  return out;
}

// What a person still has to supply before the template can run.
export function stillNeeded(template: Template): string[] {
  const common = ['tenantId', 'arcNodeResourceIds', 'hciResourceProviderObjectID', 'networking settings', 'storage settings'];
  return template === 'active-directory' ? [...common, 'Active Directory organizational unit and DNS servers'] : [...common, 'DNS zone name and DNS servers'];
}