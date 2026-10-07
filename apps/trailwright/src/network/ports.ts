import type { Project } from '../model/schema';
import { makeIntent, type Intent } from '../model/defaults';
import { buildIntents, disaggregatedIntents } from './intents';

// The physical side of the network design: cards with ports, a role per port, a proposal that spreads each group of ports across cards,
// and the Network ATC intents derived from the roles. Port counts and layouts come from decisions 6 and 7 of Microsoft's network design
// framework and from the disaggregated iSCSI and Fibre Channel patterns (Learn, Azure Local 2609).

export type Card = Project['networking']['cards'][number];
export type Port = Card['ports'][number];
export type PortRef = { card: number; port: number };

export const speeds = [1, 10, 25, 40, 50, 100];

export const roleOf = (port: Port): { kind: 'unused' | 'intent' | 'cluster' | 'iscsi'; name?: string; n?: string } => {
  const [kind, rest] = port.role.split(':');
  if (kind === 'intent') return { kind, name: rest };
  if (kind === 'cluster') return { kind, n: rest };
  if (kind === 'iscsi') return { kind, n: rest };
  return { kind: 'unused' };
};

export const allPorts = (p: Project): { card: number; port: number; ref: Port; cardRef: Card }[] =>
  p.networking.cards.flatMap((c, ci) => c.ports.map((pt, pi) => ({ card: ci, port: pi, ref: pt, cardRef: c })));

// A starting inventory: `count` identical cards with `ports` ports each, named NIC1.. with ports NIC1 Port 1 ..
export function presetCards(count: number, ports: number, speedGbps: number, rdma: Port['rdma']): Card[] {
  return Array.from({ length: count }, (_, c) => ({
    label: `NIC ${c + 1}`,
    make: '',
    model: '',
    ports: Array.from({ length: ports }, (_, i) => ({ osName: `NIC${c + 1}-P${i + 1}`, speedGbps, rdma, role: 'unused' })),
  }));
}

// The groups of ports a design needs, each group's ports to be placed on different cards where possible.
export function neededGroups(p: Project): { roles: string[] }[] {
  const sizeOf = (i: Intent) => i.adapters.length || 2;
  if (p.deployment.architecture === 'disaggregated') {
    const groups = [{ roles: ['intent:Management_Compute', 'intent:Management_Compute'] }, { roles: ['cluster:1', 'cluster:2'] }];
    if (p.deployment.sanType === 'iscsi') groups.push({ roles: ['iscsi:a', 'iscsi:b'] });
    if (p.networking.backupNetwork && p.deployment.sanType === 'fibre-channel') groups.push({ roles: ['intent:Guest_Backup', 'intent:Guest_Backup'] });
    return groups;
  }
  const intents = buildIntents(p.networking.intentGrouping, p.networking.portsPerNode);
  return intents.map((i) => ({ roles: Array.from({ length: sizeOf(i) }, () => `intent:${i.name}`) }));
}

// Assign roles to ports, taking each group's ports from different cards (the one with most free ports first), larger groups first.
export function proposeRoles(p: Project): Card[] {
  const cards = p.networking.cards.map((c) => ({ ...c, ports: c.ports.map((pt) => ({ ...pt, role: 'unused' })) }));
  const free = cards.map((c) => c.ports.length);
  const groups = [...neededGroups(p)].sort((a, b) => b.roles.length - a.roles.length);
  for (const g of groups) {
    const usedCards = new Set<number>();
    for (const role of g.roles) {
      let best = -1;
      for (let ci = 0; ci < cards.length; ci++) {
        if (free[ci] === 0) continue;
        const better = best < 0 || (!usedCards.has(ci) && usedCards.has(best)) || (usedCards.has(ci) === usedCards.has(best) && free[ci] > free[best]);
        if (better) best = ci;
      }
      if (best < 0) return cards;
      const slot = cards[best].ports.findIndex((pt) => pt.role === 'unused');
      cards[best].ports[slot].role = role;
      free[best]--;
      usedCards.add(best);
    }
  }
  return cards;
}

// The intents that the roles describe: each intent's adapters are its ports' OS names, in card order.
export function intentsFromRoles(p: Project): Intent[] {
  const byName = new Map<string, string[]>();
  for (const { ref } of allPorts(p)) {
    const r = roleOf(ref);
    if (r.kind === 'intent' && r.name) byName.set(r.name, [...(byName.get(r.name) ?? []), ref.osName]);
  }
  const template = p.deployment.architecture === 'disaggregated' ? disaggregatedIntents(p) : buildIntents(p.networking.intentGrouping, p.networking.portsPerNode);
  const known = new Map(template.map((i) => [i.name, i]));
  return [...byName.entries()].map(([name, adapters]) => {
    const t = known.get(name);
    const existing = p.networking.intents.find((i) => i.name === name);
    return makeIntent({ ...(existing ?? {}), name, traffic: existing?.traffic ?? t?.traffic ?? ['management'], adapters });
  });
}

export const assignedCount = (p: Project): number => allPorts(p).filter((x) => x.ref.role !== 'unused').length;
export const cardOfIntent = (p: Project, name: string): number[] => [...new Set(allPorts(p).filter((x) => x.ref.role === `intent:${name}`).map((x) => x.card))];