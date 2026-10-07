import { projectSchema, type Project } from '../model/schema';

// The bundled example: a two-node cluster with Local Identity and Key Vault, three Network ATC intents,
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
      witness: 'cloud',
      nodes: [
        { name: 'node1', serial: 'EXAMPLE-0001', cores: 32, memoryGiB: 512, drives: 8 },
        { name: 'node2', serial: 'EXAMPLE-0002', cores: 32, memoryGiB: 512, drives: 8 },
      ],
    },
    identity: { mode: 'local-identity-key-vault', keyVaultName: 'kv-example-azl-001' },
    networking: {
      storage: 'switched',
      vlans: [
        { name: 'Management', id: 100 },
        { name: 'Storage 1', id: 711 },
        { name: 'Storage 2', id: 712 },
      ],
      intents: [
        { name: 'Management', traffic: ['management'], adapters: ['mgmt1', 'mgmt2'] },
        { name: 'Compute', traffic: ['compute'], adapters: ['cmp1', 'cmp2'] },
        { name: 'Storage', traffic: ['storage'], adapters: ['stor1', 'stor2'] },
      ],
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
    },
    storage: {
      volumes: [
        { name: 'infrastructure', sizeGiB: 256, resiliency: 'two-way' },
        { name: 'workloads', sizeGiB: 2048, resiliency: 'two-way' },
      ],
    },
    operations: { monitoring: true, updateManager: true, backup: true, disasterRecovery: false, backupApproach: 'both', backupSolution: 'Customer-selected backup solution', drMethod: 'none' },
    findings: [],
  });
}