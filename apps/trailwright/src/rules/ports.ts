import type { Finding, Rule } from './types';
import { allPorts, neededGroups, roleOf } from '../network/ports';

const F = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609';
const D6 = `${F}#decision-6-determine-network-adapter-ports-and-configuration`;
const HOST = 'https://learn.microsoft.com/azure/azure-local/concepts/host-network-requirements?view=azloc-2609#overview-of-key-network-adapter-capabilities';
const ISCSI = 'https://learn.microsoft.com/azure/azure-local/plan/iscsi-6-network-adapters-disaggregated-pattern?view=azloc-2609#host-nic-configuration';
const PATTERNS = 'https://learn.microsoft.com/azure/azure-local/plan/choose-network-pattern?view=azloc-2609';
const FC = `${F}#fiber-channel-fc`;

const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });

export const portRules: Rule[] = [
  {
    id: 'PORT-001',
    learnUrl: HOST,
    check: (p) => {
      const ports = allPorts(p);
      if (ports.length === 0) return [];
      const names = ports.map((x) => x.ref.osName.trim());
      const out: Finding[] = [];
      if (names.some((n) => !n)) out.push(f('PORT-001', 'error', 'networking.cards', 'Every port needs the name it has in the operating system: the deployment template refers to adapters by name, and the names must be identical on every machine.', HOST));
      const dup = names.filter((n, i) => n && names.indexOf(n) !== i);
      if (dup.length) out.push(f('PORT-001', 'error', 'networking.cards', `Port names must be unique within a machine; ${[...new Set(dup)].join(', ')} appears more than once.`, HOST));
      return out;
    },
  },
  {
    id: 'PORT-002',
    learnUrl: HOST,
    check: (p) => {
      const out: Finding[] = [];
      const byRole = new Map<string, ReturnType<typeof allPorts>>();
      for (const x of allPorts(p)) if (roleOf(x.ref).kind === 'intent') byRole.set(x.ref.role, [...(byRole.get(x.ref.role) ?? []), x]);
      for (const [role, list] of byRole) {
        if (list.length < 2) continue;
        const speeds = new Set(list.map((x) => x.ref.speedGbps));
        const rdma = new Set(list.map((x) => x.ref.rdma));
        const models = new Set(list.map((x) => `${x.cardRef.make.trim().toLowerCase()}|${x.cardRef.model.trim().toLowerCase()}`));
        if (speeds.size > 1 || rdma.size > 1 || models.size > 1)
          out.push(f('PORT-002', 'error', 'networking.cards', `${role.replace('intent:', '')}: the ports of one team must be identical (same make, model, speed and configuration); Switch Embedded Teaming requires symmetric adapters.`, HOST));
      }
      return out;
    },
  },
  {
    id: 'PORT-003',
    learnUrl: PATTERNS,
    check: (p) => {
      const out: Finding[] = [];
      const byRole = new Map<string, number[]>();
      for (const x of allPorts(p)) if (['intent', 'cluster', 'iscsi'].includes(roleOf(x.ref).kind)) {
        const key = roleOf(x.ref).kind === 'intent' ? x.ref.role : roleOf(x.ref).kind;
        byRole.set(key, [...(byRole.get(key) ?? []), x.card]);
      }
      for (const [key, cards] of byRole) if (cards.length >= 2 && new Set(cards).size === 1 && p.networking.cards.length > 1)
        out.push(f('PORT-003', 'info', 'networking.cards', `${key.replace('intent:', '')}: all ports are on one card. Microsoft leaves the distribution of ports across adapters to the hardware vendor, but a card failure takes the whole team or pair down; spreading the ports across cards avoids that single point of failure.`, PATTERNS));
      return out;
    },
  },
  {
    id: 'PORT-004',
    learnUrl: D6,
    check: (p) => {
      const out: Finding[] = [];
      for (const x of allPorts(p)) {
        const r = roleOf(x.ref);
        const storage = r.kind === 'iscsi' || (r.kind === 'intent' && p.networking.intents.find((i) => i.name === r.name)?.traffic.includes('storage'));
        if (storage && x.ref.speedGbps < 10) out.push(f('PORT-004', 'error', 'networking.cards', `${x.ref.osName}: storage ports need at least 10 Gbps (25 GbE or higher is recommended).`, D6));
      }
      return out;
    },
  },
  {
    id: 'PORT-005',
    learnUrl: D6,
    check: (p) => {
      if (p.deployment.architecture === 'disaggregated') return [];
      const out: Finding[] = [];
      for (const x of allPorts(p)) {
        const r = roleOf(x.ref);
        const intent = r.kind === 'intent' ? p.networking.intents.find((i) => i.name === r.name) : undefined;
        if (intent?.traffic.includes('storage') && x.ref.rdma === 'none' && intent.networkDirect !== 'Disabled')
          out.push(f('PORT-005', 'warning', 'networking.cards', `${x.ref.osName}: storage traffic uses RDMA, but this port is marked without RDMA. Choose an RDMA-capable adapter, or turn RDMA off for the intent.`, D6));
      }
      return out;
    },
  },
  {
    id: 'PORT-006',
    learnUrl: HOST,
    check: (p) =>
      allPorts(p).some((x) => (x.ref.rdma === 'RoCE' || x.ref.rdma === 'RoCEv2') && roleOf(x.ref).kind === 'intent')
        ? [f('PORT-006', 'info', 'networking.cards', 'RoCE needs Data Center Bridging (PFC and ETS) configured correctly on every port, including the network switches; it is optional for iWARP.', HOST)]
        : [],
  },
  {
    id: 'PORT-007',
    learnUrl: ISCSI,
    check: (p) => {
      if (p.deployment.architecture !== 'disaggregated' || p.networking.cards.length === 0) return [];
      const out: Finding[] = [];
      const count = (role: string) => allPorts(p).filter((x) => x.ref.role === role).length;
      const need = (role: string, label: string) => {
        if (count(role) !== 1) out.push(f('PORT-007', 'error', 'networking.cards', `${label} needs exactly one standalone port; ${count(role)} assigned.`, ISCSI));
      };
      need('cluster:1', 'Cluster network 1');
      need('cluster:2', 'Cluster network 2');
      if (p.deployment.sanType === 'iscsi') {
        need('iscsi:a', 'iSCSI path A');
        need('iscsi:b', 'iSCSI path B');
      }
      return out;
    },
  },
  {
    id: 'PORT-008',
    learnUrl: ISCSI,
    check: (p) => {
      const a = allPorts(p).find((x) => x.ref.role === 'iscsi:a');
      const b = allPorts(p).find((x) => x.ref.role === 'iscsi:b');
      return a && b && a.card === b.card && p.networking.cards.length > 1
        ? [f('PORT-008', 'info', 'networking.cards', 'iSCSI paths A and B are on the same card. The validated pattern uses one dual-port card for them, with each port on a different leaf switch (path A to leaf A, path B to leaf B); separate cards would also survive a card failure.', ISCSI)]
        : [];
    },
  },
  {
    id: 'PORT-009',
    learnUrl: FC,
    check: (p) =>
      p.deployment.architecture === 'disaggregated' && p.deployment.sanType === 'fibre-channel' && p.networking.fcHbaPorts < 2
        ? [f('PORT-009', 'error', 'networking.fcHbaPorts', 'A Fibre Channel node uses dual-port host bus adapters: port A to FC fabric A and port B to FC fabric B.', FC)]
        : [],
  },
  {
    id: 'PORT-010',
    learnUrl: D6,
    check: (p) => {
      const ports = allPorts(p);
      const unused = ports.filter((x) => x.ref.role === 'unused').length;
      return ports.length > 0 && unused > 0 && unused < ports.length
        ? [f('PORT-010', 'info', 'networking.cards', `${unused} port${unused === 1 ? ' is' : 's are'} not used. Leave them disconnected or reserve them; only ports with a role are configured.`, D6)]
        : [];
    },
  },
  {
    id: 'PORT-011',
    learnUrl: D6,
    check: (p) => {
      const ports = allPorts(p);
      if (ports.length === 0 || ports.every((x) => x.ref.role === 'unused')) return [];
      const wanted = new Set(neededGroups(p).flatMap((g) => g.roles));
      const out: Finding[] = [];
      for (const w of wanted) if (!ports.some((x) => x.ref.role === w)) out.push(f('PORT-011', 'error', 'networking.cards', `${roleLabelOf(w)} has no port. Assign at least two ports to each intent, one to each cluster network and one to each iSCSI path.`, D6));
      for (const x of ports) if (x.ref.role !== 'unused' && !wanted.has(x.ref.role)) out.push(f('PORT-011', 'warning', 'networking.cards', `${x.ref.osName} has the role ${roleLabelOf(x.ref.role)}, which this design does not use. Propose the assignment again.`, D6));
      return out;
    },
  },
];

function roleLabelOf(role: string): string {
  const [kind, rest] = role.split(':');
  return kind === 'intent' ? `Intent ${rest}` : kind === 'cluster' ? `Cluster network ${rest}` : kind === 'iscsi' ? `iSCSI path ${rest?.toUpperCase()}` : role;
}