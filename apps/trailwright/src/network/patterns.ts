import type { Project } from '../model/schema';

// Azure Local network reference patterns, from the "Azure Local network deployment patterns" articles on Microsoft Learn
// (view azloc-2609). Each pattern lists what the article states: ports, top-of-rack (TOR) switches, Network ATC intents and constraints.

const BASE = 'https://learn.microsoft.com/azure/azure-local/plan/';
const view = '?view=azloc-2609';

export type IntentSpec = { name: string; traffic: ('management' | 'compute' | 'storage')[]; ports: number; teamed: boolean };

export type Pattern = {
  id: string;
  title: string;
  nodes: number;
  storage: 'none' | 'switched' | 'switchless';
  torSwitches: 1 | 2;
  // Ports per node the article calls for, in total (management and compute, storage).
  ports: { management: number; storage: number };
  intents: IntentSpec[];
  // Storage networks a design has to define itself (switchless 3 and 4 nodes): subnets and the single storage VLAN.
  storageSubnets: number;
  armTemplateOnly: boolean;
  scaleOut: boolean;
  notes: string[];
  learnUrl: string;
};

const mgmt: IntentSpec = { name: 'Management_Compute', traffic: ['management', 'compute'], ports: 2, teamed: true };
const storage = (ports: number): IntentSpec => ({ name: 'Storage', traffic: ['storage'], ports, teamed: false });

export const patterns: Pattern[] = [
  {
    id: 'single-node',
    title: 'Single node',
    nodes: 1,
    storage: 'none',
    torSwitches: 1,
    ports: { management: 2, storage: 0 },
    intents: [mgmt],
    storageSubnets: 0,
    armTemplateOnly: false,
    scaleOut: true,
    notes: [
      'One Network ATC intent for management and compute. No storage network is needed.',
      'Two further RDMA ports can be left disconnected for adding a second server later.',
      'A single server must use one drive type only: NVMe or SSD.',
    ],
    learnUrl: `${BASE}single-server-deployment${view}`,
  },
  {
    id: 'two-node-switchless-single-tor',
    title: 'Two nodes, storage switchless, one TOR switch',
    nodes: 2,
    storage: 'switchless',
    torSwitches: 1,
    ports: { management: 2, storage: 2 },
    intents: [mgmt, storage(2)],
    storageSubnets: 0,
    armTemplateOnly: false,
    scaleOut: false,
    notes: ['Tolerates northbound interruptions if the single switch fails or needs maintenance.', 'Storage ports connect the two nodes directly (full mesh).'],
    learnUrl: `${BASE}two-node-switchless-single-switch${view}`,
  },
  {
    id: 'two-node-switchless-two-tor',
    title: 'Two nodes, storage switchless, two TOR switches',
    nodes: 2,
    storage: 'switchless',
    torSwitches: 2,
    ports: { management: 2, storage: 2 },
    intents: [mgmt, storage(2)],
    storageSubnets: 0,
    armTemplateOnly: false,
    scaleOut: false,
    notes: ['The two TOR switches are in a multi-chassis link aggregation (MLAG) configuration.', 'Each management and compute port connects to a different TOR switch.'],
    learnUrl: `${BASE}two-node-switchless-two-switches${view}`,
  },
  {
    id: 'two-node-switched-non-converged',
    title: 'Two nodes, storage switched, non-converged, two TOR switches',
    nodes: 2,
    storage: 'switched',
    torSwitches: 2,
    ports: { management: 2, storage: 2 },
    intents: [mgmt, storage(2)],
    storageSubnets: 0,
    armTemplateOnly: false,
    scaleOut: true,
    notes: ['Storage traffic does not compete with north-south traffic. Adding nodes needs no physical changes.', 'Each storage port connects to a different TOR switch.'],
    learnUrl: `${BASE}two-node-switched-non-converged${view}`,
  },
  {
    id: 'two-node-switched-converged',
    title: 'Two nodes, storage switched, fully converged, two TOR switches',
    nodes: 2,
    storage: 'switched',
    torSwitches: 2,
    ports: { management: 2, storage: 0 },
    intents: [{ name: 'Management_Compute_Storage', traffic: ['management', 'compute', 'storage'], ports: 2, teamed: true }],
    storageSubnets: 0,
    armTemplateOnly: false,
    scaleOut: true,
    notes: ['One intent carries management, compute and storage on two teamed 10 Gbps ports.', 'Needs QoS tuning on the shared adapters to protect storage traffic.'],
    learnUrl: `${BASE}two-node-switched-converged${view}`,
  },
  {
    id: 'three-node-switchless-single-link',
    title: 'Three nodes, storage switchless, two TOR switches, single link',
    nodes: 3,
    storage: 'switchless',
    torSwitches: 2,
    ports: { management: 2, storage: 2 },
    intents: [mgmt, storage(2)],
    storageSubnets: 3,
    armTemplateOnly: true,
    scaleOut: false,
    notes: ['No redundant network connection between the nodes.', 'Storage uses one VLAN for all subnets; StorageAutoIP is off and you supply the IP addresses.'],
    learnUrl: `${BASE}three-node-switchless-two-switches-single-link${view}`,
  },
  {
    id: 'three-node-switchless-dual-link',
    title: 'Three nodes, storage switchless, two TOR switches, dual link',
    nodes: 3,
    storage: 'switchless',
    torSwitches: 2,
    ports: { management: 2, storage: 4 },
    intents: [mgmt, storage(4)],
    storageSubnets: 6,
    armTemplateOnly: true,
    scaleOut: false,
    notes: ['Each node has two paths to each other node.', 'Storage uses one VLAN for all subnets; StorageAutoIP is off and you supply the IP addresses.'],
    learnUrl: `${BASE}three-node-switchless-two-switches-two-links${view}`,
  },
  {
    id: 'four-node-switchless-dual-link',
    title: 'Four nodes, storage switchless, two TOR switches, dual link',
    nodes: 4,
    storage: 'switchless',
    torSwitches: 2,
    ports: { management: 2, storage: 6 },
    intents: [mgmt, storage(6)],
    storageSubnets: 12,
    armTemplateOnly: true,
    scaleOut: false,
    notes: [
      'Each node has two paths to each other node.',
      'Storage uses one VLAN for all subnets; StorageAutoIP is off and you supply the IP addresses.',
      'The article text calls for six storage ports per node and twelve subnets (three neighbours, two links each); its table row says four. Six matches the full mesh and the subnet count, so six is used here.',
    ],
    learnUrl: `${BASE}four-node-switchless-two-switches-two-links${view}`,
  },
];

export type StorageLayout = 'dedicated' | 'converged';
export type SwitchlessLinks = 'single' | 'dual';

export type PatternChoice = {
  nodes: number;
  storageConnectivity: 'switched' | 'switchless';
  torSwitches: 1 | 2;
  layout: StorageLayout;
  links: SwitchlessLinks;
};

// The reference pattern a design matches, or undefined when the articles describe none for those choices.
export function matchPattern(c: PatternChoice): Pattern | undefined {
  if (c.nodes === 1) return patterns.find((p) => p.id === 'single-node');
  if (c.storageConnectivity === 'switched') {
    if (c.nodes !== 2 || c.torSwitches !== 2) return undefined;
    return patterns.find((p) => p.id === (c.layout === 'converged' ? 'two-node-switched-converged' : 'two-node-switched-non-converged'));
  }
  if (c.nodes === 2) return patterns.find((p) => p.id === (c.torSwitches === 1 ? 'two-node-switchless-single-tor' : 'two-node-switchless-two-tor'));
  if (c.torSwitches !== 2) return undefined;
  if (c.nodes === 3) return patterns.find((p) => p.id === (c.links === 'single' ? 'three-node-switchless-single-link' : 'three-node-switchless-dual-link'));
  if (c.nodes === 4 && c.links === 'dual') return patterns.find((p) => p.id === 'four-node-switchless-dual-link');
  return undefined;
}

export function choiceOf(p: Project): PatternChoice {
  return {
    nodes: p.hardware.nodes.length,
    storageConnectivity: p.networking.storage,
    torSwitches: p.networking.torSwitches,
    layout: p.networking.storageLayout,
    links: p.networking.switchlessLinks,
  };
}

export const patternFor = (p: Project): Pattern | undefined => matchPattern(choiceOf(p));

export const portsRequired = (pattern: Pattern): number => pattern.ports.management + pattern.ports.storage;

// Adapter names for a pattern, in the order of its intents: pNIC01, pNIC02, ...
export function intentsFor(pattern: Pattern): { name: string; traffic: IntentSpec['traffic']; adapters: string[] }[] {
  let next = 1;
  return pattern.intents.map((i) => ({
    name: i.name,
    traffic: [...i.traffic],
    adapters: Array.from({ length: i.ports }, () => `pNIC${String(next++).padStart(2, '0')}`),
  }));
}

// Default storage subnets for the switchless patterns that need them (examples in the articles use 10.0.n.0/24).
export const storageSubnetsFor = (pattern: Pattern): string[] => Array.from({ length: pattern.storageSubnets }, (_, i) => `10.0.${i + 1}.0/24`);