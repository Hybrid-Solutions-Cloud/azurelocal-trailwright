import { describe, expect, it } from 'vitest';
import { allPorts, intentsFromRoles, presetCards, proposeRoles } from '../src/network/ports';
import type { Project } from '../src/model/schema';
import { project } from './helpers';

const withCards = (p: Project, cards: ReturnType<typeof presetCards>): Project => ({ ...p, networking: { ...p.networking, cards } });
const rolesOf = (cards: ReturnType<typeof presetCards>): string[][] => cards.map((c) => c.ports.map((pt) => pt.role));
const cardsOfRole = (cards: ReturnType<typeof presetCards>, role: string): number[] => cards.flatMap((c, ci) => c.ports.filter((pt) => pt.role === role).map(() => ci));

describe('proposing roles for ports', () => {
  it('iSCSI on three dual-port cards: every pair is spread across two different cards', () => {
    const p = withCards(project({ deployment: { architecture: 'disaggregated', sanType: 'iscsi' } }), presetCards(3, 2, 25, 'none'));
    const cards = proposeRoles(p);
    const flat = cards.flatMap((c) => c.ports.map((pt) => pt.role));
    expect(flat.sort()).toEqual(['cluster:1', 'cluster:2', 'intent:Management_Compute', 'intent:Management_Compute', 'iscsi:a', 'iscsi:b']);
    expect(new Set(cardsOfRole(cards, 'intent:Management_Compute')).size).toBe(2);
    const cluster = [...cardsOfRole(cards, 'cluster:1'), ...cardsOfRole(cards, 'cluster:2')];
    expect(new Set(cluster).size).toBe(2);
    const iscsi = [...cardsOfRole(cards, 'iscsi:a'), ...cardsOfRole(cards, 'iscsi:b')];
    expect(new Set(iscsi).size).toBe(2);
  });

  it('hyperconverged management and compute plus storage on three dual-port cards: four ports used, two left unused', () => {
    const p = withCards(project({ networking: { intentGrouping: 'mgmt-compute', portsPerNode: 4 } }), presetCards(3, 2, 25, 'RoCEv2'));
    const cards = proposeRoles(p);
    const used = cards.flatMap((c) => c.ports).filter((pt) => pt.role !== 'unused');
    expect(used).toHaveLength(4);
    expect(new Set(cardsOfRole(cards, 'intent:Management_Compute')).size).toBe(2);
    expect(new Set(cardsOfRole(cards, 'intent:Storage')).size).toBe(2);
  });

  it('two four-port cards with three custom intents put each pair on both cards', () => {
    const p = withCards(project({ networking: { intentGrouping: 'custom', portsPerNode: 6 } }), presetCards(2, 4, 25, 'RoCEv2'));
    const cards = proposeRoles(p);
    for (const role of ['intent:Management', 'intent:Compute', 'intent:Storage']) expect(new Set(cardsOfRole(cards, role)).size).toBe(2);
    expect(rolesOf(cards).flat().filter((r) => r === 'unused')).toHaveLength(2);
  });

  it('one card with two ports puts the whole pair on it (nothing better exists)', () => {
    const p = withCards(project({ networking: { intentGrouping: 'all', portsPerNode: 2 } }), presetCards(1, 2, 25, 'RoCEv2'));
    expect(rolesOf(proposeRoles(p)).flat()).toEqual(['intent:Management_Compute_Storage', 'intent:Management_Compute_Storage']);
  });
});

describe('intents follow the roles', () => {
  it('builds each intent from its ports, in card order, keeping the traffic of the grouping', () => {
    const p = withCards(project({ networking: { intentGrouping: 'mgmt-compute', portsPerNode: 4 } }), presetCards(2, 2, 25, 'RoCEv2'));
    const cards = proposeRoles(p);
    const intents = intentsFromRoles({ ...p, networking: { ...p.networking, cards } });
    expect(intents.map((i) => i.name).sort()).toEqual(['Management_Compute', 'Storage']);
    expect(intents.find((i) => i.name === 'Management_Compute')?.traffic).toEqual(['management', 'compute']);
    expect(allPorts({ ...p, networking: { ...p.networking, cards } }).filter((x) => x.ref.role === 'intent:Storage').map((x) => x.ref.osName)).toEqual(intents.find((i) => i.name === 'Storage')?.adapters);
  });
});