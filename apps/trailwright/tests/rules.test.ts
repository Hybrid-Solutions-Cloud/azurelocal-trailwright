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
  'NET-004': { networking: { vlans: [{ name: 'Other', id: 100 }] } },
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
  'OPS-004': { operations: { updateManager: false } },
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
