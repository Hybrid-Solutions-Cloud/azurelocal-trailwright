import { createEmptyProject } from '../src/model/defaults';
import type { Project } from '../src/model/schema';

export type DeepPartial<T> = T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export function makeNodes(count: number) {
  return Array.from({ length: count }, (_, i) => ({ name: `n${i + 1}`, ip: `192.0.2.${11 + i}`, cores: 16, memoryGiB: 256, drives: 4 }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key] as Record<string, unknown>, value) : value;
  }
  return result;
}

// A project that satisfies every rule; tests change one thing at a time.
const compliant: DeepPartial<Project> = {
  connectivity: {
    path: 'private-path',
    proxyUrl: '',
    arcGatewayName: 'arcgw-example-001',
    privatePath: { transport: 'expressroute', virtualNetwork: 'vnet-example', workloadSubnet: 'snet-workload', firewallSubnet: 'AzureFirewallSubnet', firewallPrivateIp: '192.0.2.4', firewallPort: '8443', arcPrivateLinkScopeOnNetwork: false, proxyBypass: 'localhost,127.0.0.1' },
  },
  landingZone: {
    subscriptionName: 'sub-example',
    resourceGroup: 'rg-example',
    keyVaultName: '',
    witnessStorageAccount: 'stwitness01',
    subscriptionId: '00000000-0000-0000-0000-000000000000',
    tenantId: '00000000-0000-0000-0000-000000000000',
    hciResourceProviderObjectId: '00000000-0000-0000-0000-000000000000',
    instanceName: 'example-cluster',
    diagnosticStorageAccountName: 'stexamplekvaudit001',
    keyVaultRetentionDays: 30,
  },
  infrastructure: { useDhcp: false, subnetMask: '255.255.255.0', gateway: '192.0.2.1', startIp: '192.0.2.21', endIp: '192.0.2.27', dnsServers: ['192.0.2.10'], managementVlan: 0 },
  security: { backupKeyVaultName: 'kv-backup-example' },
  hardware: { topology: 'standard', witness: 'cloud', nodes: makeNodes(2) },
  operations: { updateMethod: 'portal' },
  identity: { mode: 'active-directory', domain: 'example.com', ouPath: 'OU=azl01,DC=example,DC=com', lcmUsername: 'lcmuser01', localAdminUsername: 'azladmin' },
  networking: {
    storage: 'switched',
    vlans: [{ name: 'Storage 1', id: 711 }, { name: 'Storage 2', id: 712 }],
    intents: [
      { name: 'Management', traffic: ['management', 'compute'], adapters: ['p1', 'p2'] },
      { name: 'Storage', traffic: ['storage'], adapters: ['p3', 'p4'] },
    ],
  },
};

export function project(overrides: DeepPartial<Project> = {}): Project {
  const base = createEmptyProject('test') as unknown as Record<string, unknown>;
  return merge(merge(base, compliant as Record<string, unknown>), overrides as Record<string, unknown>) as unknown as Project;
}