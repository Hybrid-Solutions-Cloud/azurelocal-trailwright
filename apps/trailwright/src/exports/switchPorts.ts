import type { Project } from '../model/schema';
import { allPorts, roleOf } from '../network/ports';
import { standalonePorts } from '../network/intents';
import { guard } from './schedules';

// The switch side of the design: for each machine port, the switch it connects to, the port mode, the VLANs, the MTU and the QoS.
// Sources: the Learn network reference patterns (two ToR switches or leaf pairs, one port of each pair to each switch), the host network
// requirements (PFC and ETS are required for RoCE, optional for iWARP) and the disaggregated patterns (access-mode ports for cluster and iSCSI,
// MTU 9216 on the switch for iSCSI, no PFC or ETS).
export type SwitchPortRow = { switch: string; node: string; port: string; role: string; mode: 'access' | 'trunk' | 'direct'; vlans: string; mtu: string; qos: string; note: string };

const SWITCH_HEADERS = ['Switch', 'Node', 'Port', 'Role', 'Mode', 'VLANs', 'MTU', 'QoS', 'Note'];

export function switchPortRows(p: Project): SwitchPortRow[] {
  const assigned = allPorts(p).filter((x) => x.ref.role !== 'unused');
  // Without a card inventory the intents' adapters stand in for the ports.
  const fromIntents = p.networking.intents.flatMap((i) => i.adapters.map((a) => ({ name: a, intent: i })));
  const ports = assigned.length ? assigned : fromIntents.map((x, k) => ({ card: 0, port: k, cardRef: { label: '', make: '', model: '', ports: [] }, ref: { osName: x.name, speedGbps: 25, rdma: x.intent.traffic.includes('storage') && x.intent.networkDirect === 'Enabled' ? x.intent.networkDirectTechnology : ('none' as const), role: `intent:${x.intent.name}` } }));
  if (ports.length === 0) return [];
  const da = p.deployment.architecture === 'disaggregated';
  const names = da ? ['Leaf A', 'Leaf B'] : ['ToR1', 'ToR2'];
  const two = da || p.networking.torSwitches === 2;
  const standalone = new Map(standalonePorts(p).map((s) => [s.name, s.vlan]));
  const storageIntentPorts = ports.filter((x) => {
    const r = roleOf(x.ref);
    return r.kind === 'intent' && p.networking.intents.find((i) => i.name === r.name)?.traffic.includes('storage');
  });
  const seen = new Map<string, number>();
  const rows: SwitchPortRow[] = [];

  const perNode = ports.map((x) => {
    const r = roleOf(x.ref);
    const key = x.ref.role;
    const idx = seen.get(key) ?? 0;
    seen.set(key, idx + 1);
    // Pairs: the first port of a role goes to the first switch, the second to the other. Cluster 2 and iSCSI path B go to the second switch.
    const second = r.kind === 'cluster' ? r.n === '2' : r.kind === 'iscsi' ? r.n === 'b' : idx % 2 === 1;
    const sw = two ? names[second ? 1 : 0] : names[0];
    const base = { switch: sw, port: x.ref.osName, role: x.ref.role };
    if (r.kind === 'cluster' || r.kind === 'iscsi') {
      const label = r.kind === 'cluster' ? `Cluster network ${r.n}` : `iSCSI path ${r.n?.toUpperCase()}`;
      const vlan = standalone.get(label);
      return { ...base, mode: 'access' as const, vlans: vlan ? String(vlan) : '', mtu: r.kind === 'iscsi' ? '9216' : 'jumbo, at least the host MTU', qos: 'none (PFC off, no ETS)', note: `${label}; no default gateway on the host interface${r.kind === 'iscsi' ? '; /32 static route per iSCSI target on the host' : ''}` };
    }
    const intent = p.networking.intents.find((i) => i.name === r.name);
    const traffic = intent?.traffic ?? [];
    const vlans: string[] = [];
    if (traffic.includes('management')) vlans.push(p.infrastructure.managementVlan > 0 ? String(p.infrastructure.managementVlan) : 'native (management, untagged)');
    if (traffic.includes('compute')) for (const v of p.networking.vlans.filter((x2) => !p.networking.storageVlans.includes(x2.id))) vlans.push(String(v.id));
    let qos = 'none';
    let note = `Intent ${r.name}`;
    if (traffic.includes('storage') && !da) {
      const k = storageIntentPorts.findIndex((s) => s.card === x.card && s.port === x.port);
      vlans.push(String(p.networking.storageVlans[k] ?? p.networking.storageVlans[p.networking.storageVlans.length - 1] ?? 711));
      if (x.ref.rdma !== 'none' && intent?.networkDirect !== 'Disabled') {
        const smb = intent?.overrideQos ? intent.qosSmbPriority : '3';
        const cluster = intent?.overrideQos ? intent.qosClusterPriority : '7';
        const bw = intent?.overrideQos ? intent.qosSmbBandwidth : '50';
        qos = `${x.ref.rdma === 'iWARP' ? 'PFC and ETS recommended' : 'PFC and ETS required'}: SMB priority ${smb} lossless with ${bw}% ETS, cluster priority ${cluster}, default class for the rest`;
      }
      note += p.networking.storage === 'switchless' ? '; switchless: this port is cabled node to node, not to a switch' : '';
    }
    const switchless = !da && p.networking.storage === 'switchless' && traffic.includes('storage') && !traffic.includes('management') && !traffic.includes('compute');
    const mtu = intent?.jumboPacket === '1514' ? '1514' : 'jumbo, at least the host frame size (' + (intent?.jumboPacket ?? '9014') + ')';
    return { ...base, switch: switchless ? 'direct link' : base.switch, mode: switchless ? ('direct' as const) : vlans.length > 1 || traffic.includes('compute') ? ('trunk' as const) : ('access' as const), vlans: vlans.join(', '), mtu, qos, note };
  });

  for (const n of p.hardware.nodes) for (const row of perNode) rows.push({ ...row, node: n.name });
  return rows;
}

const csvCell = (v: string): string => {
  const s = String(guard(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildSwitchPortsCsv(p: Project): string {
  const rows = switchPortRows(p).map((r) => [r.switch, r.node, r.port, r.role, r.mode, r.vlans, r.mtu, r.qos, r.note]);
  return `${[SWITCH_HEADERS, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
