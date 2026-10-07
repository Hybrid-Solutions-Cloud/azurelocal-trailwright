import { projectSchema, type Project } from './schema';

export function createEmptyProject(name: string): Project {
  const project: Project = {
    meta: { schema: 1, name, createdAt: new Date().toISOString() },
    release: { version: '2609' },
    project: { customer: '', owner: '', notes: '' },
    hardware: { topology: 'standard', nodes: [], witness: 'none' },
    identity: { mode: 'local-identity-key-vault' },
    networking: { storage: 'switched', vlans: [], intents: [], ipPlan: [] },
    connectivity: { path: 'direct' },
    landingZone: { subscriptionName: '', resourceGroup: '', keyVaultName: '', region: 'eastus' },
    storage: { architecture: 's2d', volumes: [], sanLuns: [] },
    operations: { monitoring: false, updateManager: false, backup: false, disasterRecovery: false },
    findings: [],
  };

  return projectSchema.parse(project);
}