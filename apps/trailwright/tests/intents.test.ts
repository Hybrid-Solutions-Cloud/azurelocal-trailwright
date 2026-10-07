import { describe, expect, it } from 'vitest';
import { buildIntents, disaggregatedPortsNeeded, groupingSupported, portChoices, standalonePorts } from '../src/network/intents';
import { project } from './helpers';

describe('Network ATC intent groupings (framework decision 7)', () => {
  it('follows the supported-groupings table', () => {
    // switchless: group management and compute plus custom only
    expect(groupingSupported('all', 'switchless')).toBe(false);
    expect(groupingSupported('mgmt-compute', 'switchless')).toBe(true);
    expect(groupingSupported('compute-storage', 'switchless')).toBe(false);
    expect(groupingSupported('custom', 'switchless')).toBe(true);
    // switched: all four
    for (const g of ['all', 'mgmt-compute', 'compute-storage', 'custom'] as const) expect(groupingSupported(g, 'switched')).toBe(true);
    // external SAN: none of the hyperconverged groupings
    for (const g of ['all', 'mgmt-compute', 'compute-storage', 'custom'] as const) expect(groupingSupported(g, 'san')).toBe(false);
  });

  it('builds intents with adapters named in order and extra ports on storage', () => {
    expect(buildIntents('all', 2)).toEqual([{ name: 'Management_Compute_Storage', traffic: ['management', 'compute', 'storage'], adapters: ['pNIC01', 'pNIC02'] }]);
    expect(buildIntents('mgmt-compute', 4)).toEqual([
      { name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['pNIC01', 'pNIC02'] },
      { name: 'Storage', traffic: ['storage'], adapters: ['pNIC03', 'pNIC04'] },
    ]);
    expect(buildIntents('mgmt-compute', 6)[1].adapters).toHaveLength(4);
    expect(buildIntents('custom', 6).map((i) => i.name)).toEqual(['Management', 'Compute', 'Storage']);
  });

  it('gives the port counts of the framework', () => {
    expect(portChoices(project())).toEqual([2, 4, 6, 8]);
    expect(portChoices(project({ deployment: { architecture: 'disaggregated', sanType: 'fibre-channel' } }))).toEqual([4, 6]);
    expect(portChoices(project({ deployment: { architecture: 'disaggregated', sanType: 'iscsi' } }))).toEqual([6]);
  });

  it('counts the ports of a disaggregated node and lists its standalone ports', () => {
    const fc = project({ deployment: { architecture: 'disaggregated', sanType: 'fibre-channel' } });
    const iscsi = project({ deployment: { architecture: 'disaggregated', sanType: 'iscsi' } });
    expect(disaggregatedPortsNeeded(fc)).toBe(4);
    expect(disaggregatedPortsNeeded(project({ deployment: { architecture: 'disaggregated', sanType: 'fibre-channel' }, networking: { backupNetwork: true } }))).toBe(6);
    expect(disaggregatedPortsNeeded(iscsi)).toBe(6);
    expect(standalonePorts(fc).map((s) => s.vlan)).toEqual([1711, 1712]);
    expect(standalonePorts(iscsi).map((s) => s.vlan)).toEqual([1711, 1712, 300, 400]);
  });
});