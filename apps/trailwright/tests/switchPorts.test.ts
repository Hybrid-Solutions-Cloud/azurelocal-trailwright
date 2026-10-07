import { describe, expect, it } from 'vitest';
import { buildSwitchPortsCsv, switchPortRows } from '../src/exports/switchPorts';
import { makeIntent } from '../src/model/defaults';
import { presetCards } from '../src/network/ports';
import { makeNodes, project } from './helpers';

const hci = () => {
  const cards = presetCards(2, 2, 25, 'RoCEv2');
  cards[0].ports[0].role = 'intent:Mgmt_Compute';
  cards[1].ports[0].role = 'intent:Mgmt_Compute';
  cards[0].ports[1].role = 'intent:Storage';
  cards[1].ports[1].role = 'intent:Storage';
  return project({
    hardware: { nodes: makeNodes(2) },
    networking: {
      torSwitches: 2,
      storage: 'switched',
      storageVlans: [711, 712],
      vlans: [{ name: 'Tenant', id: 100 }],
      cards,
      intents: [
        makeIntent({ name: 'Mgmt_Compute', traffic: ['management', 'compute'], adapters: ['NIC1 Port 1', 'NIC2 Port 1'] }),
        makeIntent({ name: 'Storage', traffic: ['storage'], adapters: ['NIC1 Port 2', 'NIC2 Port 2'] }),
      ],
    },
  });
};

describe('switch port plan', () => {
  it('sends each port of a pair to a different ToR and gives each storage port its own VLAN', () => {
    const rows = switchPortRows(hci()).filter((r) => r.node === 'n1');
    expect(rows.map((r) => r.switch)).toEqual(['ToR1', 'ToR1', 'ToR2', 'ToR2']);
    const storage = rows.filter((r) => r.role === 'intent:Storage');
    expect(storage.map((r) => r.vlans)).toEqual(['711', '712']);
    expect(storage[0].qos).toContain('PFC and ETS required');
    const mc = rows.filter((r) => r.role === 'intent:Mgmt_Compute');
    expect(mc[0].mode).toBe('trunk');
    expect(mc[0].vlans).toContain('100');
  });
  it('writes a CSV with a header and one row per node and port', () => {
    const csv = buildSwitchPortsCsv(hci()).trim().split('\r\n');
    expect(csv[0]).toBe('Switch,Node,Port,Role,Mode,VLANs,MTU,QoS,Note');
    expect(csv).toHaveLength(1 + 2 * 4);
  });
  it('falls back to the intent adapters without a card inventory, and is empty without intents', () => {
    const rows = switchPortRows(project({ hardware: { nodes: makeNodes(1) } }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.role.startsWith('intent:'))).toBe(true);
    expect(switchPortRows(project({ networking: { intents: [] } }))).toEqual([]);
  });
  it('uses access mode, the validated VLANs and MTU 9216 for disaggregated iSCSI', () => {
    const cards = presetCards(3, 2, 25, 'none');
    const roles = ['intent:Management_Compute', 'intent:Management_Compute', 'cluster:1', 'cluster:2', 'iscsi:a', 'iscsi:b'];
    cards.flatMap((c) => c.ports).forEach((pt, i) => { pt.role = roles[i]; });
    const p = project({ deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, hardware: { nodes: makeNodes(2) }, networking: { cards, intents: [makeIntent({ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['a', 'b'] })] } });
    const rows = switchPortRows(p).filter((r) => r.node === 'n1');
    const iscsi = rows.filter((r) => r.role.startsWith('iscsi'));
    expect(iscsi.map((r) => [r.switch, r.mode, r.vlans, r.mtu])).toEqual([['Leaf A', 'access', '300', '9216'], ['Leaf B', 'access', '400', '9216']]);
    expect(rows.filter((r) => r.role.startsWith('cluster')).map((r) => r.vlans)).toEqual(['1711', '1712']);
  });
});
