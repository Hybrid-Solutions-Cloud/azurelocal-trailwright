import type { Project } from '../model/schema';
import { switchPortRows, type SwitchPortRow } from '../exports/switchPorts';

// One drawing model for the live diagram and the draw.io export: the switches, the nodes and a link for every cabled port.
export type Shape = { id: string; kind: 'switch' | 'node' | 'san' | 'fc'; x: number; y: number; w: number; h: number; title: string; lines: string[] };
export type Edge = { id: string; points: [number, number][]; color: string; label?: string; dashed?: boolean };
export type Topology = { width: number; height: number; shapes: Shape[]; edges: Edge[]; legend: { color: string; label: string }[] };

export const COLORS = { management: '#1a73e8', storage: '#e8710a', cluster: '#188038', iscsi: '#9334e6', fc: '#5f6368' };

const NODE_W = 170;
const GAP = 24;
const MARGIN = 20;

function colorOf(row: SwitchPortRow, p: Project): { color: string; kind: keyof typeof COLORS } {
  if (row.role.startsWith('cluster')) return { color: COLORS.cluster, kind: 'cluster' };
  if (row.role.startsWith('iscsi')) return { color: COLORS.iscsi, kind: 'iscsi' };
  const name = row.role.split(':')[1];
  const storage = p.networking.intents.find((i) => i.name === name)?.traffic.includes('storage');
  return storage ? { color: COLORS.storage, kind: 'storage' } : { color: COLORS.management, kind: 'management' };
}

const shortVlan = (vlans: string): string | undefined => {
  if (!vlans) return undefined;
  const list = vlans.split(', ').map((v) => (v.startsWith('native') ? 'native' : v));
  return list.length > 2 ? `VLAN ${list[0]} +${list.length - 1}` : `VLAN ${list.join(', ')}`;
};

export function buildTopology(p: Project): Topology {
  const nodes = p.hardware.nodes;
  const rows = switchPortRows(p);
  const da = p.deployment.architecture === 'disaggregated';
  const fc = da && p.deployment.sanType === 'fibre-channel';
  const iscsi = da && p.deployment.sanType === 'iscsi';
  const count = Math.max(nodes.length, 1);
  const width = Math.max(count * (NODE_W + GAP) + MARGIN * 2 - GAP, 560);
  const hasSan = da;
  const switchY = hasSan ? 120 : 30;
  const nodeY = switchY + 170;
  const shapes: Shape[] = [];
  const edges: Edge[] = [];
  const portsOfFirst = rows.filter((r) => r.node === nodes[0]?.name);

  // Switches
  const names = [...new Set(rows.map((r) => r.switch))].filter((s) => s !== 'direct link');
  const swNames = names.length ? names : da ? ['Leaf A', 'Leaf B'] : [p.networking.torSwitches === 2 ? 'ToR1' : 'ToR1', ...(p.networking.torSwitches === 2 ? ['ToR2'] : [])];
  const swW = (width - MARGIN * 2 - GAP * (swNames.length - 1)) / swNames.length;
  const swX = new Map<string, number>();
  swNames.forEach((n, i) => {
    const x = MARGIN + i * (swW + GAP);
    swX.set(n, x);
    shapes.push({ id: `sw-${i}`, kind: 'switch', x, y: switchY, w: swW, h: 44, title: n, lines: [da ? 'leaf switch' : 'top-of-rack switch'] });
  });

  // SAN
  if (hasSan) {
    shapes.push({ id: 'san', kind: 'san', x: width / 2 - 110, y: 20, w: 220, h: 44, title: fc ? 'Fibre Channel SAN' : 'iSCSI SAN', lines: [fc ? 'dual fabric' : 'two target portals'] });
    if (iscsi) {
      swNames.forEach((n, i) => edges.push({ id: `san-sw-${i}`, points: [[(swX.get(n) ?? 0) + swW / 2, switchY], [width / 2 + (i === 0 ? -60 : 60), 64]], color: COLORS.iscsi, label: i === 0 ? 'iSCSI A' : 'iSCSI B' }));
    }
  }

  // Nodes and their links
  nodes.forEach((n, ni) => {
    const x = MARGIN + ni * (NODE_W + GAP);
    // Ports bound for the first switch sit on the left of the node, so the lines do not cross.
    const mine = rows.filter((r) => r.node === n.name).sort((a, b) => swNames.indexOf(a.switch) - swNames.indexOf(b.switch));
    const lines = mine.map((r) => `${r.port}  ${r.role === 'unused' ? '' : r.role.replace('intent:', '').replace('cluster:', 'cluster ').replace('iscsi:', 'iSCSI ')}`.trim());
    if (fc) lines.push(`${p.networking.fcHbaPorts} FC HBA ports`);
    const h = 30 + Math.max(lines.length, 1) * 15;
    shapes.push({ id: `node-${ni}`, kind: 'node', x, y: nodeY, w: NODE_W, h, title: n.name || `node ${ni + 1}`, lines });
    mine.forEach((r, k) => {
      const px = x + ((k + 1) / (mine.length + 1)) * NODE_W;
      const { color } = colorOf(r, p);
      if (r.switch === 'direct link') return;
      const sx = swX.get(r.switch);
      if (sx === undefined) return;
      const tx = sx + ((ni + 1) / (count + 1)) * swW;
      edges.push({ id: `e-${ni}-${k}`, points: [[px, nodeY], [tx, switchY + 44]], color, label: ni === 0 ? shortVlan(r.vlans) : undefined });
    });
  });

  // Switchless storage: node to node links under the nodes.
  if (!da && p.networking.storage === 'switchless' && nodes.length > 1) {
    const links = p.networking.switchlessLinks === 'single' ? 1 : 2;
    let level = 0;
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      for (let l = 0; l < links; l++) {
        const ya = shapes.find((s) => s.id === `node-${a}`)!;
        const yb = shapes.find((s) => s.id === `node-${b}`)!;
        const depth = 30 + level * 12;
        const xa = ya.x + ya.w * (0.3 + 0.4 * l);
        const xb = yb.x + yb.w * (0.3 + 0.4 * l);
        edges.push({ id: `sl-${a}-${b}-${l}`, points: [[xa, ya.y + ya.h], [xa, ya.y + ya.h + depth], [xb, ya.y + ya.h + depth], [xb, yb.y + yb.h]], color: COLORS.storage, dashed: true, label: level === 0 && l === 0 ? 'storage (direct)' : undefined });
        level++;
      }
    }
  }

  // Fibre Channel fabrics
  if (fc) {
    ['FC fabric A', 'FC fabric B'].forEach((t, i) => shapes.push({ id: `fc-${i}`, kind: 'fc', x: i === 0 ? MARGIN : width - MARGIN - 160, y: 20, w: 160, h: 44, title: t, lines: ['FC switch'] }));
    nodes.forEach((_, ni) => {
      const nx = MARGIN + ni * (NODE_W + GAP);
      [0, 1].forEach((i) => edges.push({ id: `fc-e-${ni}-${i}`, points: [[nx + NODE_W * (i === 0 ? 0.1 : 0.9), nodeY], [i === 0 ? MARGIN + 80 : width - MARGIN - 80, 64]], color: COLORS.fc, dashed: true, label: ni === 0 ? `HBA ${i === 0 ? 'A' : 'B'}` : undefined }));
    });
    edges.push({ id: 'fc-san-0', points: [[MARGIN + 160, 42], [width / 2 - 110, 42]], color: COLORS.fc, dashed: true }, { id: 'fc-san-1', points: [[width - MARGIN - 160, 42], [width / 2 + 110, 42]], color: COLORS.fc, dashed: true });
  }

  const nodeBottom = Math.max(0, ...shapes.filter((s) => s.kind === 'node').map((s) => s.y + s.h));
  const mesh = edges.filter((e) => e.id.startsWith('sl-')).length;
  const legend: Topology['legend'] = [];
  const used = new Set(portsOfFirst.map((r) => colorOf(r, p).kind));
  if (used.has('management')) legend.push({ color: COLORS.management, label: 'management and compute' });
  if (used.has('storage')) legend.push({ color: COLORS.storage, label: 'storage' });
  if (used.has('cluster')) legend.push({ color: COLORS.cluster, label: 'cluster networks' });
  if (used.has('iscsi')) legend.push({ color: COLORS.iscsi, label: 'iSCSI' });
  if (fc) legend.push({ color: COLORS.fc, label: 'Fibre Channel' });
  return { width, height: nodeBottom + 60 + mesh * 12, shapes, edges, legend };
}
