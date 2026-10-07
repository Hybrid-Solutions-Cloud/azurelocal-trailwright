import { describe, expect, it } from 'vitest';
import { vlanRows } from '../src/exports/schedules';
import { makeNodes, project } from './helpers';

describe('VLAN schedule', () => {
  it('lists the VLANs with their purpose, and a VNI for disaggregated fabrics', () => {
    const hci = vlanRows(project({ hardware: { nodes: makeNodes(2) }, infrastructure: { managementVlan: 7 }, networking: { vlans: [{ name: 'Tenant', id: 100 }], storageVlans: [711, 712] } }));
    expect(hci[0]).toEqual(['Name', 'ID', 'Purpose']);
    expect(hci.map((r) => r[1])).toEqual(expect.arrayContaining(['ID', 100, 7, 711, 712].filter((x) => x !== 'ID')));
    const da = vlanRows(project({ deployment: { architecture: 'disaggregated', sanType: 'iscsi' }, storage: { architecture: 'san' }, infrastructure: { managementVlan: 7 }, networking: { vlans: [{ name: 'Tenant', id: 100 }], backupNetwork: true } }));
    expect(da[0]).toEqual(['Name', 'ID', 'Purpose', 'VNI']);
    const byId = new Map(da.slice(1).map((r) => [r[1], r[3]]));
    expect([byId.get(7), byId.get(1711), byId.get(300), byId.get(400), byId.get(800), byId.get(100)]).toEqual([10007, 11711, 10300, 10400, 10800, 10100]);
  });
});
