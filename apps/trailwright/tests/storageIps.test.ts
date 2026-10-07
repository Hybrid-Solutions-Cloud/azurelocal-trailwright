import { describe, expect, it } from 'vitest';
import { storageNetworkList } from '../src/exports/createCluster';
import { runRules } from '../src/rules';
import { makeNodes, project } from './helpers';

const custom = () => {
  const p = project({ hardware: { nodes: makeNodes(2) }, networking: { storageAutoIp: false, storage: 'switched', storageSubnets: ['172.30.71.0/24', '172.30.72.0/24'], storageVlans: [711, 712] } });
  p.hardware.nodes[0].storageIps = ['172.30.71.11', '172.30.72.11'];
  p.hardware.nodes[1].storageIps = ['172.30.71.12', '172.30.72.12'];
  return p;
};

describe('custom storage addresses on a switched cluster', () => {
  it('declares each machine address and mask on each storage network', () => {
    const list = storageNetworkList(custom()) as { vlanId: string; storageAdapterIPInfo: { physicalNode: string; ipv4Address: string; subnetMask: string }[] }[];
    expect(list[0].storageAdapterIPInfo).toEqual([{ physicalNode: 'n1', ipv4Address: '172.30.71.11', subnetMask: '255.255.255.0' }, { physicalNode: 'n2', ipv4Address: '172.30.71.12', subnetMask: '255.255.255.0' }]);
    expect(list[1].storageAdapterIPInfo[1].ipv4Address).toBe('172.30.72.12');
  });
  it('is complete when every machine has an address inside the subnet, and flags gaps and duplicates', () => {
    expect(runRules(custom()).filter((f) => f.id === 'SIP-001')).toEqual([]);
    const gap = custom();
    gap.hardware.nodes[1].storageIps = ['172.30.71.11', ''];
    const found = runRules(gap).filter((f) => f.id === 'SIP-001').map((f) => f.message);
    expect(found.some((m) => m.includes('twice'))).toBe(true);
    expect(found.some((m) => m.includes('needs an address'))).toBe(true);
  });
  it('adds nothing when Storage Auto IP is on', () => {
    const p = custom();
    p.networking.storageAutoIp = true;
    expect(JSON.stringify(storageNetworkList(p))).not.toContain('storageAdapterIPInfo');
  });
});
