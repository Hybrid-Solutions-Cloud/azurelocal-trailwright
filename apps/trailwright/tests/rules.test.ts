import { describe, expect, it } from 'vitest';
import { rules, runRules } from '../src/rules';
import { makeNodes, project, type DeepPartial } from './helpers';
import type { Project } from '../src/model/schema';

const ids = (p: Project) => runRules(p).map((f) => f.id);

// One case per rule: a change that makes it fire. Everything else stays compliant.
const fires: Record<string, DeepPartial<Project>> = {
  'HW-001': { hardware: { nodes: makeNodes(2), witness: 'none' } },
  'HW-002': { hardware: { nodes: makeNodes(2), witness: 'file-share' } },
  'HW-003': { hardware: { nodes: makeNodes(3), witness: 'none' } },
  'HW-004': { hardware: { nodes: makeNodes(5), witness: 'cloud' } },
  'HW-005': { hardware: { topology: 'rack-aware', nodes: makeNodes(3), witness: 'cloud' } },
  'HW-006': { hardware: { nodes: [] } },
  'ID-001': { identity: { mode: 'local-identity-key-vault', keyVaultName: '' } },
  'ID-002': { identity: { mode: 'active-directory', domain: '' } },
  'ID-003': { identity: { mode: 'local-identity-key-vault', keyVaultName: 'kv-example' } },
  'NET-001': { hardware: { nodes: makeNodes(5) }, networking: { storage: 'switchless' } },
  'NET-002': { hardware: { nodes: makeNodes(4) }, networking: { storage: 'switchless' } },
  'NET-003': { hardware: { topology: 'rack-aware', nodes: makeNodes(4) }, networking: { intents: [{ name: 'All', traffic: ['management', 'compute', 'storage'], adapters: ['p1'] }] } },
  'NET-004': { networking: { storageVlans: [100, 101] } },
  'NET-005': { networking: { intents: [{ name: 'Management', traffic: ['management'], adapters: ['p1'] }] } },
  'CON-001': { connectivity: { path: 'proxy', proxyUrl: '' } },
  'CON-002': { connectivity: { path: 'proxy', proxyUrl: 'http://proxy.corp.local:8080' } },
  'CON-004': { connectivity: { path: 'direct' } },
  'CON-005': { connectivity: { path: 'arc-gateway' } },
  'LZ-001': { landingZone: { witnessStorageAccount: '' } },
  'LZ-002': { landingZone: { resourceGroup: '' } },
  'LZ-003': { landingZone: { keyVaultName: 'kv-example' } },
  'STO-001': { hardware: { topology: 'rack-aware', nodes: makeNodes(4) }, storage: { volumes: [{ name: 'v', sizeGiB: 100, resiliency: 'three-way' }] } },
  'STO-002': { hardware: { topology: 'rack-aware', nodes: makeNodes(4) }, storage: { volumes: [{ name: 'v', sizeGiB: 100, resiliency: 'two-way' }] } },
  'STO-003': { hardware: { nodes: makeNodes(2) }, storage: { volumes: [{ name: 'v', sizeGiB: 100, resiliency: 'three-way' }] } },
  'CON-006': { connectivity: { privatePath: { transport: '' } } },
  'CON-007': { connectivity: { privatePath: { firewallPrivateIp: '' } } },
  'CON-008': { connectivity: { privatePath: { arcPrivateLinkScopeOnNetwork: true } } },
  'CON-009': { connectivity: { arcGatewayName: '' } },
  'CON-010': { connectivity: { privatePath: { proxyBypass: '*.svc,<local>' } } },
  'HW-007': { hardware: { topology: 'rack-aware', nodes: makeNodes(4), witness: 'none' } },
  'OPS-001': { operations: { backup: true, backupSolution: '' } },
  'OPS-002': { operations: { drMethod: 'asr' } },
  'OPS-003': { operations: { drMethod: 'hyperv-replica' } },
  'OPS-005': { operations: { updateMethod: 'powershell-limited' } },
  'HW-008': { deployment: { mode: 'disconnected' }, hardware: { topology: 'rack-aware', nodes: makeNodes(4), witness: 'cloud' } },
  'PAT-001': { hardware: { nodes: makeNodes(5) }, networking: { storage: 'switched', torSwitches: 1 } },
  'PAT-002': { networking: { portsPerNode: 2 } },
  'PAT-003': { hardware: { nodes: makeNodes(3) }, networking: { storage: 'switchless', switchlessLinks: 'single', portsPerNode: 4, storageAutoIp: false, storageSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'] } },
  'PAT-004': { hardware: { nodes: makeNodes(2) }, networking: { storage: 'switchless', torSwitches: 2 } },
  'PAT-005': { hardware: { nodes: makeNodes(3) }, networking: { storage: 'switchless', switchlessLinks: 'single', portsPerNode: 4, storageAutoIp: true } },
  'PAT-006': { networking: { intents: [{ name: 'All', traffic: ['management', 'compute', 'storage'], adapters: ['p1', 'p2'] }] } },
  'ARC-001': { deployment: { architecture: 'hybrid' }, hardware: { topology: 'rack-aware', nodes: makeNodes(4), witness: 'cloud' } },
  'ARC-002': { deployment: { architecture: 'hybrid' } },
  'ARC-003': { hardware: { nodes: makeNodes(17) } },
  'ARC-004': { deployment: { architecture: 'disaggregated' }, storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] }, hardware: { nodes: makeNodes(20), racks: 1 } },
  'ARC-005': { deployment: { mode: 'disconnected' } },
  'ARC-006': { deployment: { architecture: 'disaggregated' }, storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] }, hardware: { topology: 'rack-aware', nodes: makeNodes(4), witness: 'cloud' } },
  'ARC-007': { hardware: { topology: 'rack-aware', nodes: makeNodes(4), witness: 'cloud' } },
  'INT-001': { hardware: { nodes: makeNodes(2) }, networking: { storage: 'switchless', torSwitches: 2, intentGrouping: 'all' } },
  'INT-002': { networking: { portsPerNode: 2 } },
  'INT-003': { networking: { intents: [{ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['p1'] }, { name: 'Storage', traffic: ['storage'], adapters: ['p3', 'p4'] }] } },
  'INT-004': { networking: { intents: [{ name: 'A', traffic: ['compute'], adapters: ['p1', 'p2'] }, { name: 'S', traffic: ['storage'], adapters: ['p3', 'p4'] }] } },
  'INT-005': { networking: { portsPerNode: 5 } },
  'INT-006': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] }, networking: { portsPerNode: 4, intents: [{ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['p1', 'p2'] }] } },
  'INT-007': { hardware: { nodes: makeNodes(2) }, networking: { storage: 'switchless', torSwitches: 2, intents: [{ name: 'All', traffic: ['management', 'compute', 'storage'], adapters: ['p1', 'p2'] }] } },
  'INT-008': { networking: { intents: [{ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['p1', 'p2'], overrideVSwitch: true }, { name: 'Storage', traffic: ['storage'], adapters: ['p3', 'p4'] }] } },
  'DA-001': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }], infraVolLunId: '', infraPerfLunId: '' } },
  'DA-002': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }], infraVolLunId: 'a', infraPerfLunId: 'b' }, networking: { clusterSubnets: ['10.10.100.0/24'] } },
  'DA-003': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }], infraVolLunId: 'a', infraPerfLunId: 'b' }, identity: { mode: 'local-identity-key-vault', keyVaultName: 'kv-example' } },
  'SDN-001': { sdn: { enabled: true, prefix: 'azl' }, networking: { intents: [{ name: 'CS', traffic: ['compute', 'storage'], adapters: ['p1', 'p2'] }, { name: 'M', traffic: ['management'], adapters: ['p3', 'p4'] }] } },
  'SDN-002': { sdn: { enabled: true, prefix: 'bad--prefix-' } },
  'SDN-003': { sdn: { enabled: true, prefix: 'azl' } },
  'SDN-004': { sdn: { enabled: true, prefix: 'azl', logicalNetworks: [{ name: 'a', vlan: 10, addressPrefix: 'nope' }] } },
  'SDN-005': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, sdn: { enabled: true } },
  'PRV-001': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.net' }, connectivity: { path: 'arc-gateway' } },
  'PRV-002': { provisioning: { osInstall: 'simplified', hardwareSku: 'other', timeZone: 'UTC', timeServer: 'time.example.net' } },
  'PRV-003': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.net' } },
  'PRV-004': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: '', timeServer: '' } },
  'PRV-005': { hardware: { nodes: makeNodes(3) }, networking: { storage: 'switchless', switchlessLinks: 'single', storageAutoIp: false, storageSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'] }, provisioning: { deployMethod: 'portal' } },
  'PRV-006': { networking: { storageAutoIp: false } },
  'PRV-007': { deployment: { architecture: 'disaggregated' }, storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] } },
  'AD-001': { identity: { ouPath: 'DC=example,DC=com' } },
  'AD-002': { identity: { lcmUsername: '1bad' } },
  'AD-003': { identity: { domain: 'not a domain' } },
  'ID-004': { identity: { localAdminUsername: '' } },
  'ID-005': { identity: { mode: 'local-identity-key-vault', keyVaultName: 'kv-example', dnsZoneName: '' } },
  'INF-001': { infrastructure: { endIp: '192.0.2.24' } },
  'INF-002': { infrastructure: { gateway: '' } },
  'INF-003': { infrastructure: { dnsServers: ['10.96.1.10'] } },
  'INF-004': { infrastructure: { dnsServers: ['8.8.8.8'] } },
  'INF-005': { hardware: { nodes: [{ name: 'n1', ip: '192.0.2.22', cores: 16, memoryGiB: 256, drives: 4 }, { name: 'n2', ip: '192.0.2.12', cores: 16, memoryGiB: 256, drives: 4 }] } },
  'INF-006': { infrastructure: { managementVlan: 44 } },
  'AZ-001': { landingZone: { subscriptionId: 'not-a-guid' } },
  'AZ-002': { landingZone: { instanceName: 'n1' } },
  'AZ-003': { landingZone: { keyVaultRetentionDays: 120 } },
  'AZ-004': { landingZone: { witnessStorageAccount: 'Bad_Name' } },
  'SEC-001': { security: { backupKeyVaultName: '' } },
  'SEC-002': { security: { level: 'Customized', driftControl: false } },
  'STO-006': { storage: { configurationMode: 'KeepStorage' } },
  'MON-001': { operations: { monitoring: true, workspaceName: '', healthAlerts: false } },
  'MON-002': { operations: { monitoring: true, workspaceName: 'law-example', agentPrivateLinks: true, dceName: '', healthAlerts: false } },
  'MON-003': { operations: { monitoring: true, workspaceName: 'law-example', useExistingDcr: true, healthAlerts: false } },
  'MON-004': { operations: { monitoring: true, workspaceName: 'law-example', healthAlerts: true, alertEmail: '' } },
  'PRV-008': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.net', siteName: '', adminKeyVaultName: 'kv-admin', osVersion: '12.2609.1003.7' }, hardware: { nodes: [{ name: 'n1', ip: '192.0.2.11', serial: 'S1', cores: 16, memoryGiB: 256, drives: 4 }, { name: 'n2', ip: '192.0.2.12', serial: 'S2', cores: 16, memoryGiB: 256, drives: 4 }] } },
  'PRV-009': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.net', siteName: 'site1', siteResourceGroup: 'rg-site', adminKeyVaultName: 'kv-admin', osVersion: '12.2609.1003.7' } },
  'PRV-010': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', timeZone: 'UTC', timeServer: 'time.example.net', adminKeyVaultName: '' } },
  'PRV-011': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', proxyServer: 'http://proxy.corp.local:8080' } },
  'PRV-012': { provisioning: { osInstall: 'simplified', hardwareSku: 'dell-ax-750', osVersion: '' } },
  'S2D-001': { storage: { driveLayout: { capacity: { media: 'hdd', count: 4, sizeTB: 8 } } }, hardware: { nodes: makeNodes(1) } },
  'S2D-002': { storage: { driveLayout: { capacity: { media: 'hdd', count: 4, sizeTB: 8 }, cache: { media: 'nvme', count: 0, sizeTB: 0 } } } },
  'S2D-003': { storage: { driveLayout: { capacity: { media: 'hdd', count: 2, sizeTB: 8 }, cache: { media: 'nvme', count: 2, sizeTB: 1.6 } } } },
  'S2D-004': { storage: { driveLayout: { capacity: { media: 'hdd', count: 5, sizeTB: 8 }, cache: { media: 'nvme', count: 2, sizeTB: 0.5 } } } },
  'S2D-005': { storage: { driveLayout: { capacity: { media: 'hdd', count: 4, sizeTB: 8 }, cache: { media: 'nvme', count: 2, sizeTB: 3.2 } } } },
  'S2D-006': { storage: { driveLayout: { capacity: { media: 'nvme', count: 8, sizeTB: 60 } } } },
  'S2D-007': { storage: { volumes: [{ name: 'v', sizeGiB: 100, resiliency: 'parity' }] } },
  'S2D-008': { storage: { volumes: [{ name: 'big', sizeGiB: 20000, resiliency: 'two-way' }] } },
  'S2D-009': { storage: { volumes: [{ name: 'huge', sizeGiB: 70000, resiliency: 'two-way' }], driveLayout: { capacity: { media: 'nvme', count: 24, sizeTB: 30 } } } },
  'S2D-011': { hardware: { nodes: [{ name: 'a', ip: '192.0.2.11', cores: 16, memoryGiB: 1024, drives: 4 }, { name: 'b', ip: '192.0.2.12', cores: 16, memoryGiB: 1024, drives: 4 }] } },
  'S2D-012': { hardware: { nodes: [{ name: 'a', ip: '192.0.2.11', cores: 16, memoryGiB: 256, drives: 4 }, { name: 'b', ip: '192.0.2.12', cores: 16, memoryGiB: 256, drives: 8 }] } },
  'PORT-001': { networking: { cards: [{ label: 'c', make: '', model: '', ports: [{ osName: '', speedGbps: 25, rdma: 'none', role: 'unused' }] }] } },
  'PORT-002': { networking: { cards: [{ label: 'a', make: 'M', model: 'X', ports: [{ osName: 'a1', speedGbps: 10, rdma: 'none', role: 'intent:Management_Compute' }] }, { label: 'b', make: 'M', model: 'X', ports: [{ osName: 'b1', speedGbps: 25, rdma: 'none', role: 'intent:Management_Compute' }] }] } },
  'PORT-003': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'RoCEv2', role: 'intent:Storage' }, { osName: 'a2', speedGbps: 25, rdma: 'RoCEv2', role: 'intent:Storage' }] }, { label: 'b', make: '', model: '', ports: [{ osName: 'b1', speedGbps: 25, rdma: 'none', role: 'unused' }] }] } },
  'PORT-004': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 1, rdma: 'RoCEv2', role: 'intent:Storage' }] }] } },
  'PORT-005': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'none', role: 'intent:Storage' }] }] } },
  'PORT-006': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'RoCEv2', role: 'intent:Storage' }] }] } },
  'PORT-007': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }] }, networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'none', role: 'intent:Management_Compute' }] }] } },
  'PORT-008': { deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }] }, networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'none', role: 'iscsi:a' }, { osName: 'a2', speedGbps: 25, rdma: 'none', role: 'iscsi:b' }] }, { label: 'b', make: '', model: '', ports: [{ osName: 'b1', speedGbps: 25, rdma: 'none', role: 'unused' }] }] } },
  'PORT-009': { deployment: { architecture: 'disaggregated', sanType: 'fibre-channel' }, storage: { architecture: 'san', sanLuns: [{ name: 'l', sizeGiB: 300 }] }, networking: { fcHbaPorts: 1 } },
  'PORT-010': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'none', role: 'intent:Management_Compute' }, { osName: 'a2', speedGbps: 25, rdma: 'none', role: 'unused' }] }] } },
  'PORT-011': { networking: { cards: [{ label: 'a', make: '', model: '', ports: [{ osName: 'a1', speedGbps: 25, rdma: 'none', role: 'intent:Nonsense' }] }] } },
  'STO-004': { storage: { architecture: 'san', sanLuns: [] } },
  'STO-005': { storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] }, hardware: { nodes: makeNodes(65) } },
  'LZ-004': { landingZone: { region: 'usgovvirginia' } },
};

describe('rules', () => {
  it('the compliant project produces no findings except the identity note', () => {
    expect(ids(project())).toEqual([]);
  });

  it('every rule has a case', () => {
    expect(rules.map((r) => r.id).sort()).toEqual(Object.keys(fires).sort());
  });

  for (const [id, change] of Object.entries(fires)) {
    it(`${id} fires for its case and carries a Learn URL and a field`, () => {
      const findings = runRules(project(change)).filter((f) => f.id === id);
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(f.learnUrl).toMatch(/^https:\/\/learn\.microsoft\.com\//);
        expect(f.field).toBeTruthy();
      }
    });
  }

  it('passing cases: a cloud witness satisfies two nodes, a separate storage intent satisfies rack-aware', () => {
    expect(ids(project({ hardware: { nodes: makeNodes(2), witness: 'cloud' } }))).not.toContain('HW-001');
    expect(ids(project({ hardware: { topology: 'rack-aware', nodes: makeNodes(4) } }))).not.toContain('NET-003');
    expect(ids(project({ hardware: { topology: 'rack-aware', nodes: makeNodes(4) } }))).not.toContain('HW-005');
  });

});

describe('storage architecture gating', () => {
  const s2dOnlyIds = ['STO-001', 'STO-002', 'STO-003', 'NET-001', 'NET-002', 'NET-003', 'NET-004'];

  it('a SAN-only design gets no S2D or storage-network findings', () => {
    const san = project({ storage: { architecture: 'san', sanLuns: [{ name: 'lun1', sizeGiB: 100 }] }, networking: { vlans: [], storage: 'switchless', intents: [{ name: 'Management', traffic: ['management', 'compute'], adapters: ['p1', 'p2'] }] }, hardware: { topology: 'rack-aware', nodes: makeNodes(6) } });
    const found = runRules(san).map((f) => f.id);
    for (const id of s2dOnlyIds) expect(found).not.toContain(id);
    expect(found).not.toContain('NET-005');
  });

  it('an S2D-only design gets no SAN findings', () => {
    const found = runRules(project({ storage: { architecture: 's2d' } })).map((f) => f.id);
    expect(found).not.toContain('STO-004');
  });

  it('a hybrid design is checked for both', () => {
    const hybrid = project({ storage: { architecture: 'hybrid', sanLuns: [] } , networking: { storage: 'switchless' }, hardware: { nodes: makeNodes(6) } });
    const found = runRules(hybrid).map((f) => f.id);
    expect(found).toContain('STO-004');
    expect(found).toContain('NET-001');
  });
});
