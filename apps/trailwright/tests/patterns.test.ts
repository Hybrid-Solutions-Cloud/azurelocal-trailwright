import { describe, expect, it } from 'vitest';
import { intentsFor, matchPattern, patterns, portsRequired, storageSubnetsFor } from '../src/network/patterns';

const choice = (nodes: number, storageConnectivity: 'switched' | 'switchless', torSwitches: 1 | 2 = 2, layout: 'dedicated' | 'converged' = 'dedicated', links: 'single' | 'dual' = 'dual') => ({ nodes, storageConnectivity, torSwitches, layout, links });

describe('network reference patterns (Microsoft Learn, 2609)', () => {
  it('matches each documented combination', () => {
    expect(matchPattern(choice(1, 'switched', 1))?.id).toBe('single-node');
    expect(matchPattern(choice(2, 'switchless', 1))?.id).toBe('two-node-switchless-single-tor');
    expect(matchPattern(choice(2, 'switchless', 2))?.id).toBe('two-node-switchless-two-tor');
    expect(matchPattern(choice(2, 'switched', 2, 'dedicated'))?.id).toBe('two-node-switched-non-converged');
    expect(matchPattern(choice(2, 'switched', 2, 'converged'))?.id).toBe('two-node-switched-converged');
    expect(matchPattern(choice(3, 'switchless', 2, 'dedicated', 'single'))?.id).toBe('three-node-switchless-single-link');
    expect(matchPattern(choice(3, 'switchless', 2, 'dedicated', 'dual'))?.id).toBe('three-node-switchless-dual-link');
    expect(matchPattern(choice(4, 'switchless', 2, 'dedicated', 'dual'))?.id).toBe('four-node-switchless-dual-link');
  });

  it('returns nothing where the articles describe no pattern', () => {
    expect(matchPattern(choice(2, 'switched', 1))).toBeUndefined();
    expect(matchPattern(choice(3, 'switchless', 1))).toBeUndefined();
    expect(matchPattern(choice(4, 'switchless', 2, 'dedicated', 'single'))).toBeUndefined();
    expect(matchPattern(choice(5, 'switched', 2))).toBeUndefined();
    expect(matchPattern(choice(3, 'switched', 2))).toBeUndefined();
  });

  it('states the ports each article gives', () => {
    const total = Object.fromEntries(patterns.map((p) => [p.id, portsRequired(p)]));
    expect(total).toMatchObject({
      'single-node': 2,
      'two-node-switchless-single-tor': 4,
      'two-node-switchless-two-tor': 4,
      'two-node-switched-non-converged': 4,
      'two-node-switched-converged': 2,
      'three-node-switchless-single-link': 4,
      'three-node-switchless-dual-link': 6,
      'four-node-switchless-dual-link': 8,
    });
  });

  it('needs storage subnets only for the three and four node switchless patterns (3, 6 and 12)', () => {
    const subnets = Object.fromEntries(patterns.map((p) => [p.id, p.storageSubnets]));
    expect(subnets['three-node-switchless-single-link']).toBe(3);
    expect(subnets['three-node-switchless-dual-link']).toBe(6);
    expect(subnets['four-node-switchless-dual-link']).toBe(12);
    expect(subnets['two-node-switched-non-converged']).toBe(0);
    expect(storageSubnetsFor(patterns.find((p) => p.id === 'four-node-switchless-dual-link')!)).toHaveLength(12);
  });

  it('names the adapters in order across the intents', () => {
    const intents = intentsFor(patterns.find((p) => p.id === 'two-node-switched-non-converged')!);
    expect(intents).toMatchObject([
      { name: 'Management_Compute', traffic: ['management', 'compute'], adapters: ['pNIC01', 'pNIC02'] },
      { name: 'Storage', traffic: ['storage'], adapters: ['pNIC03', 'pNIC04'] },
    ]);
  });

  it('every pattern has a Learn URL on the 2609 view', () => {
    for (const p of patterns) expect(p.learnUrl).toMatch(/^https:\/\/learn\.microsoft\.com\/azure\/azure-local\/plan\/.+view=azloc-2609$/);
  });
});