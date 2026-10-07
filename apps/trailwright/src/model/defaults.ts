import { z } from 'zod';
import { projectSchema, type Project } from './schema';
import { CURRENT_RELEASE } from './release';

export function createEmptyProject(name: string): Project {
  // Schema defaults fill everything not listed (identifiers, security, infrastructure network and so on).
  const project: z.input<typeof projectSchema> = {
    meta: { schema: 1, name, createdAt: new Date().toISOString() },
    release: { version: CURRENT_RELEASE },
    deployment: { mode: 'connected', architecture: 'hyperconverged', sanType: 'fibre-channel', cloud: 'public' },
    infrastructure: { useDhcp: false, subnetMask: '', gateway: '', startIp: '', endIp: '', dnsServers: [], managementVlan: 0 },
    security: { level: 'Recommended', driftControl: true, credentialGuard: true, smbSigning: true, smbClusterEncryption: false, bitlockerBootVolume: true, bitlockerDataVolumes: true, wdac: true, backupKeyVaultName: '', streamingData: true, euLocation: false, episodicData: true },
    provisioning: { osInstall: 'iso', hardwareSku: '', timeZone: '', timeServer: '', siteName: '', siteResourceGroup: '', proxyServer: '', adminKeyVaultName: '', osVersion: '', deployMethod: 'portal' },
    confirmed: [],
    project: { customer: '', owner: '', notes: '' },
    hardware: { topology: 'standard', rackAwareUplink: 'dedicated-storage', racks: 1, nodes: [], witness: 'none' },
    identity: { mode: 'local-identity-key-vault' },
    networking: { storage: 'switched', torSwitches: 2, storageLayout: 'dedicated', switchlessLinks: 'dual', portsPerNode: 4, intentGrouping: 'mgmt-compute', backupNetwork: false, cards: [], fcHbaPorts: 2, storageAutoIp: true, storageSubnets: [], vlans: [], intents: [], ipPlan: [] },
    connectivity: { path: 'direct', arcGatewayName: '', privatePath: { transport: '', virtualNetwork: '', workloadSubnet: '', firewallSubnet: '', firewallPrivateIp: '', firewallPort: '', arcPrivateLinkScopeOnNetwork: false, proxyBypass: '' } },
    landingZone: { subscriptionName: '', resourceGroup: '', keyVaultName: '', region: 'eastus' },
    storage: { architecture: 's2d', volumes: [], sanLuns: [], driveLayout: { capacity: { media: 'nvme', count: 0, sizeTB: 0 }, cache: { media: 'nvme', count: 0, sizeTB: 0 } } },
    operations: { monitoring: false, updateManager: true, updateMethod: 'portal', backup: false, disasterRecovery: false, backupApproach: 'both', backupSolution: '', workspaceName: '', workspaceResourceGroup: '', useExistingDcr: false, dcrName: '', agentPrivateLinks: false, dceName: '', refsDedupMonitoring: false, healthAlerts: true, alertEmail: '', drMethod: 'none' },
    findings: [],
  };

  return projectSchema.parse(project);
}

export type Intent = Project['networking']['intents'][number];

// An intent with Network ATC's own defaults for everything the person has not overridden.
export function makeIntent(partial: Pick<Intent, 'name' | 'traffic' | 'adapters'> & Partial<Intent>): Intent {
  return {
    overrideQos: false,
    qosClusterPriority: '7',
    qosSmbPriority: '3',
    qosSmbBandwidth: '50',
    overrideAdapter: false,
    jumboPacket: '9014',
    networkDirect: 'Enabled',
    networkDirectTechnology: 'RoCEv2',
    ...partial,
  };
}
