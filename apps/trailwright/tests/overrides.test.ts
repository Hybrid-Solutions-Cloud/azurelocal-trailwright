import { describe, expect, it } from 'vitest';
import { intentList, storageNetworkList } from '../src/exports/createCluster';
import { makeIntent } from '../src/model/defaults';
import { project } from './helpers';

describe('intent overrides and storage VLANs in the ARM parameters', () => {
  it('writes the virtual switch override only when it is set', () => {
    const off = project({ networking: { intents: [makeIntent({ name: 'MC', traffic: ['management', 'compute'], adapters: ['a', 'b'] })] } });
    expect((intentList(off)[0] as { overrideVirtualSwitchConfiguration: boolean }).overrideVirtualSwitchConfiguration).toBe(false);
    const on = project({ networking: { intents: [makeIntent({ name: 'MC', traffic: ['management', 'compute'], adapters: ['a', 'b'], overrideVSwitch: true, enableIov: 'false', loadBalancingAlgorithm: 'HyperVPort' })] } });
    const first = intentList(on)[0] as { overrideVirtualSwitchConfiguration: boolean; virtualSwitchConfigurationOverrides: unknown };
    expect(first.overrideVirtualSwitchConfiguration).toBe(true);
    expect(first.virtualSwitchConfigurationOverrides).toEqual({ enableIov: 'false', loadBalancingAlgorithm: 'HyperVPort' });
  });
  it('uses the storage VLAN set for each storage network', () => {
    const p = project({ networking: { storageVlans: [721, 722], intents: [makeIntent({ name: 'S', traffic: ['storage'], adapters: ['s1', 's2'] })] } });
    expect((storageNetworkList(p) as { vlanId: string }[]).map((n) => n.vlanId)).toEqual(['721', '722']);
  });
});
