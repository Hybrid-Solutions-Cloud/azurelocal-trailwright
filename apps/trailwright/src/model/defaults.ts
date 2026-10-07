import { projectSchema, type Project } from './schema';
import { CURRENT_RELEASE } from './release';

export function createEmptyProject(name: string): Project {
  const project: Project = {
    meta: { schema: 1, name, createdAt: new Date().toISOString() },
    release: { version: CURRENT_RELEASE },
    deployment: { mode: 'connected', architecture: 'hyperconverged', sanType: 'fibre-channel', cloud: 'public' },
    confirmed: [],
    project: { customer: '', owner: '', notes: '' },
    hardware: { topology: 'standard', rackAwareUplink: 'dedicated-storage', racks: 1, nodes: [], witness: 'none' },
    identity: { mode: 'local-identity-key-vault' },
    networking: { storage: 'switched', torSwitches: 2, storageLayout: 'dedicated', switchlessLinks: 'dual', portsPerNode: 4, intentGrouping: 'mgmt-compute', backupNetwork: false, storageAutoIp: true, storageSubnets: [], vlans: [], intents: [], ipPlan: [] },
    connectivity: { path: 'direct', arcGatewayName: '', privatePath: { transport: '', virtualNetwork: '', workloadSubnet: '', firewallSubnet: '', firewallPrivateIp: '', firewallPort: '', arcPrivateLinkScopeOnNetwork: false, proxyBypass: '' } },
    landingZone: { subscriptionName: '', resourceGroup: '', keyVaultName: '', region: 'eastus' },
    storage: { architecture: 's2d', volumes: [], sanLuns: [] },
    operations: { monitoring: false, updateManager: true, updateMethod: 'portal', backup: false, disasterRecovery: false, backupApproach: 'both', backupSolution: '', drMethod: 'none' },
    findings: [],
  };

  return projectSchema.parse(project);
}