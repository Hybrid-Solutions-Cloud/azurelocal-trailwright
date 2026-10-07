import { projectSchema, type Project } from '../model/schema';

// The bundled example: a two-node cluster with Local Identity and Key Vault, the two-node switched non-converged reference pattern (two intents),
// a cloud witness and direct egress without an Arc gateway. Every name is a neutral placeholder.
export function createExampleProject(): Project {
  return projectSchema.parse({
    meta: { schema: 1, name: 'Example lab', createdAt: '2026-10-07T00:00:00.000Z' },
    release: { version: '2609' },
    project: {
      customer: 'Example Company',
      owner: 'Design owner',
      notes: 'Bundled example project. Replace every value with your own design.',
    },
    hardware: {
      topology: 'standard',
      rackAwareUplink: 'dedicated-storage',
      racks: 1,
      witness: 'cloud',
      nodes: [
        { name: 'node1', ip: '192.0.2.11', serial: 'EXAMPLE-0001', cores: 32, memoryGiB: 512, drives: 8 },
        { name: 'node2', ip: '192.0.2.12', serial: 'EXAMPLE-0002', cores: 32, memoryGiB: 512, drives: 8 },
      ],
    },
    identity: {
      mode: 'local-identity-key-vault',
      keyVaultName: 'kv-example-azl-001',
      localAdminUsername: 'azladmin',
      dnsServerConfig: 'UseDnsServer',
      dnsZoneName: 'lab.example.com',
      dnsForwarders: [],
    },
    security: { backupKeyVaultName: 'kv-backup-example-001' },
    infrastructure: { useDhcp: false, subnetMask: '255.255.255.0', gateway: '192.0.2.1', startIp: '192.0.2.21', endIp: '192.0.2.27', dnsServers: ['192.0.2.10'], managementVlan: 0 },
    networking: {
      storage: 'switched',
      torSwitches: 2,
      storageLayout: 'dedicated',
      switchlessLinks: 'dual',
      portsPerNode: 4,
      intentGrouping: 'mgmt-compute',
      backupNetwork: false,
      storageAutoIp: true,
      storageSubnets: [],
      vlans: [
        { name: 'Management', id: 100 },
        { name: 'Storage 1', id: 711 },
        { name: 'Storage 2', id: 712 },
      ],
      intents: [
        { name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['pNIC01', 'pNIC02'] },
        { name: 'Storage', traffic: ['storage'], adapters: ['pNIC03', 'pNIC04'] },
      ],
      storageVlans: [711, 712],
      ipPlan: [
        { name: 'Management', cidr: '192.0.2.0/24' },
        { name: 'Storage 1', cidr: '198.51.100.0/24' },
        { name: 'Storage 2', cidr: '203.0.113.0/24' },
      ],
    },
    connectivity: { path: 'direct' },
    landingZone: {
      subscriptionName: 'sub-example-azl-001',
      resourceGroup: 'rg-example-azl-001',
      keyVaultName: 'kv-example-azl-001',
      witnessStorageAccount: 'stexamplewitness001',
      customLocation: 'cl-example-azl-001',
      region: 'eastus',
      subscriptionId: '00000000-0000-0000-0000-000000000000',
      tenantId: '00000000-0000-0000-0000-000000000000',
      instanceName: 'example-azl-01',
      namingPrefix: 'EXAMPLE',
      keyVaultRetentionDays: 30,
      diagnosticStorageAccountName: 'stexamplekvaudit001',
      logsRetentionDays: 30,
      hciResourceProviderObjectId: '00000000-0000-0000-0000-000000000000',
    },
    storage: {
      driveLayout: { capacity: { media: 'nvme', count: 8, sizeTB: 3.84 }, cache: { media: 'nvme', count: 0, sizeTB: 0 } },
      volumes: [
        { name: 'infrastructure', sizeGiB: 256, resiliency: 'two-way' },
        { name: 'workloads', sizeGiB: 2048, resiliency: 'two-way' },
      ],
    },
    operations: { monitoring: true, workspaceName: 'law-example-azl-001', workspaceResourceGroup: 'rg-example-azl-001', healthAlerts: true, alertEmail: 'ops@example.com', updateManager: true, updateMethod: 'portal', backup: true, disasterRecovery: false, backupApproach: 'both', backupSolution: 'Customer-selected backup solution', drMethod: 'none' },
    findings: [],
  });
}