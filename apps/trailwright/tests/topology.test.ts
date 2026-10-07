import { describe, expect, it } from 'vitest';
import { buildTopology } from '../src/topology/model';
import { makeIntent } from '../src/model/defaults';
import { presetCards } from '../src/network/ports';
import { makeNodes, project } from './helpers';

describe('topology model', () => {
  it('draws two switches, a node box each and a link for every cabled port', () => {
    const cards = presetCards(2, 2, 25, 'RoCEv2');
    ['intent:M', 'intent:S', 'intent:M', 'intent:S'].forEach((r, i) => { cards[Math.floor(i / 2)].ports[i % 2].role = r; });
    const p = project({ hardware: { nodes: makeNodes(3) }, networking: { torSwitches: 2, storage: 'switched', cards, intents: [makeIntent({ name: 'M', traffic: ['management', 'compute'], adapters: ['a', 'b'] }), makeIntent({ name: 'S', traffic: ['storage'], adapters: ['c', 'd'] })] } });
    const t = buildTopology(p);
    expect(t.shapes.filter((s) => s.kind === 'switch').map((s) => s.title)).toEqual(['ToR1', 'ToR2']);
    expect(t.shapes.filter((s) => s.kind === 'node')).toHaveLength(3);
    expect(t.edges).toHaveLength(3 * 4);
    expect(t.legend.map((l) => l.label)).toEqual(['management and compute', 'storage']);
  });
  it('draws node to node storage links for a switchless cluster instead of switch links', () => {
    const cards = presetCards(2, 2, 25, 'RoCEv2');
    ['intent:M', 'intent:M', 'intent:S', 'intent:S'].forEach((r, i) => { cards[Math.floor(i / 2)].ports[i % 2].role = r; });
    const p = project({ hardware: { nodes: makeNodes(3) }, networking: { torSwitches: 2, storage: 'switchless', switchlessLinks: 'dual', cards, intents: [makeIntent({ name: 'M', traffic: ['management', 'compute'], adapters: ['a', 'b'] }), makeIntent({ name: 'S', traffic: ['storage'], adapters: ['c', 'd'] })] } });
    const t = buildTopology(p);
    expect(t.edges.filter((e) => e.id.startsWith('sl-'))).toHaveLength(3 * 2);
    expect(t.edges.filter((e) => e.id.startsWith('e-'))).toHaveLength(3 * 2);
  });
  it('shows the SAN and the Fibre Channel fabrics for a disaggregated Fibre Channel design', () => {
    const p = project({ deployment: { architecture: 'disaggregated', sanType: 'fibre-channel' }, hardware: { nodes: makeNodes(2) }, networking: { fcHbaPorts: 2 } });
    const t = buildTopology(p);
    expect(t.shapes.map((s) => s.title)).toEqual(expect.arrayContaining(['Fibre Channel SAN', 'FC fabric A', 'FC fabric B']));
  });
});
