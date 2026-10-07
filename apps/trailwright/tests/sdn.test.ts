import { describe, expect, it } from 'vitest';
import { buildHandoffMarkdown } from '../src/exports/handoffMarkdown';
import { switchPortRows } from '../src/exports/switchPorts';
import { vlanRows } from '../src/exports/schedules';
import { runRules } from '../src/rules';
import { ncAddress } from '../src/rules/sdn';
import { makeIntent } from '../src/model/defaults';
import { makeNodes, project } from './helpers';

const sdnProject = () =>
  project({
    hardware: { nodes: makeNodes(2) },
    infrastructure: { startIp: '192.0.2.50' },
    sdn: { enabled: true, prefix: 'azl-01', dnsRecords: 'static', logicalNetworks: [{ name: 'web', vlan: 206, addressPrefix: '192.168.1.0/24', gateway: '192.168.1.1', dnsServers: ['192.168.1.2'], poolStart: '192.168.1.10', poolEnd: '192.168.1.200' }] },
    networking: { intents: [makeIntent({ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['p1', 'p2'] }), makeIntent({ name: 'Storage', traffic: ['storage'], adapters: ['p3', 'p4'] })] },
  });

describe('SDN', () => {
  it('a supported pattern with a valid prefix and logical network has no SDN errors', () => {
    const ids = runRules(sdnProject()).filter((f) => f.id.startsWith('SDN') && f.severity === 'error');
    expect(ids).toEqual([]);
  });
  it('points the Network Controller record at the fifth address of the infrastructure range', () => {
    expect(ncAddress('192.0.2.50')).toBe('192.0.2.54');
    expect(buildHandoffMarkdown(sdnProject())).toContain('azl-01-NC pointing to 192.0.2.54');
    expect(buildHandoffMarkdown(sdnProject())).toContain('Add-EceFeature -Name NC -SDNPrefix azl-01');
  });
  it('adds the logical network VLAN to the VLAN schedule and to the compute trunk', () => {
    expect(vlanRows(sdnProject()).some((r) => r[1] === 206 && r[2] === 'SDN logical network')).toBe(true);
    const mc = switchPortRows(sdnProject()).find((r) => r.role === 'intent:Management_Compute');
    expect(mc?.vlans).toContain('206');
  });
  it('rejects an intent that combines compute and storage', () => {
    const p = sdnProject();
    p.networking.intents = [makeIntent({ name: 'CS', traffic: ['compute', 'storage'], adapters: ['p1', 'p2'] })];
    expect(runRules(p).some((f) => f.id === 'SDN-001' && f.severity === 'error')).toBe(true);
  });
});
