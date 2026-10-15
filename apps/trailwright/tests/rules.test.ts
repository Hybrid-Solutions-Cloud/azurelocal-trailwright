import { describe, expect, it } from 'vitest';
import { rules, runRules } from '../src/rules';
import { makeNodes, project } from './helpers';
import { fires } from './ruleCases';
import type { Project } from '../src/model/schema';

const ids = (p: Project) => runRules(p).map((f) => f.id);


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
