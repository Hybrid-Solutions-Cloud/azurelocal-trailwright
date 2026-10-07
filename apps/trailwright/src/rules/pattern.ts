import type { Rule } from './types';
import { usesS2d } from './types';
import { patternFor, patterns, portsRequired } from '../network/patterns';

const CATALOGUE_URL = 'https://learn.microsoft.com/azure/azure-local/plan/choose-network-pattern?view=azloc-2609';

const signature = (traffic: string[]): string => [...traffic].sort().join('+');

export const patternRules: Rule[] = [
  {
    id: 'PAT-001',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      if (!usesS2d(p) || p.hardware.nodes.length < 2 || patternFor(p)) return [];
      const n = p.hardware.nodes.length;
      const net = p.networking;
      // Switched storage beyond two nodes follows the framework (any node count up to 16); the shape is a pair of ToR switches.
      if (net.storage === 'switched' && n > 2 && net.torSwitches === 2) return [];
      const why =
        net.storage === 'switched'
          ? 'The standard shape is a pair of top-of-rack switches in a multi-chassis link aggregation (MLAG) configuration.'
          : `Documented switchless patterns: ${patterns.filter((x) => x.storage === 'switchless').map((x) => x.title).join('; ')}.`;
      return [{ id: 'PAT-001', severity: 'warning', field: 'networking.storage', message: `No Microsoft reference pattern describes ${n} nodes with ${net.storage} storage and ${net.torSwitches} TOR switch(es). ${why}`, learnUrl: CATALOGUE_URL }];
    },
  },  {
    id: 'PAT-002',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      const pattern = usesS2d(p) ? patternFor(p) : undefined;
      if (!pattern || p.networking.portsPerNode >= portsRequired(pattern)) return [];
      return [
        {
          id: 'PAT-002',
          severity: 'error',
          field: 'networking.portsPerNode',
          message: `${pattern.title}: each node needs ${portsRequired(pattern)} network ports (${pattern.ports.management} for management and compute${pattern.ports.storage ? `, ${pattern.ports.storage} for storage` : ''}); the design has ${p.networking.portsPerNode}.`,
          learnUrl: pattern.learnUrl,
        },
      ];
    },
  },
  {
    id: 'PAT-003',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      const pattern = usesS2d(p) ? patternFor(p) : undefined;
      return pattern?.armTemplateOnly
        ? [{ id: 'PAT-003', severity: 'info', field: 'networking.storage', message: `${pattern.title} can be deployed only with an ARM template, with the storage IP addresses supplied in it.`, learnUrl: pattern.learnUrl }]
        : [];
    },
  },
  {
    id: 'PAT-004',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      const pattern = usesS2d(p) ? patternFor(p) : undefined;
      return pattern && !pattern.scaleOut && pattern.nodes > 1
        ? [{ id: 'PAT-004', severity: 'info', field: 'networking.storage', message: 'Scale-out is not supported with switchless storage: adding a node means redeploying the cluster and re-cabling storage.', learnUrl: pattern.learnUrl }]
        : [];
    },
  },
  {
    id: 'PAT-005',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      const pattern = usesS2d(p) ? patternFor(p) : undefined;
      if (!pattern || pattern.storageSubnets === 0) return [];
      const found = [];
      if (p.networking.storageAutoIp)
        found.push({ id: 'PAT-005', severity: 'error' as const, field: 'networking.storageAutoIp', message: 'This switchless pattern needs StorageAutoIP off: you supply the storage IP addresses in the ARM template.', learnUrl: pattern.learnUrl });
      if (p.networking.storageSubnets.length < pattern.storageSubnets)
        found.push({ id: 'PAT-005', severity: 'warning' as const, field: 'networking.storageSubnets', message: `${pattern.title} needs ${pattern.storageSubnets} storage subnets (one per node-to-node link); the design lists ${p.networking.storageSubnets.length}.`, learnUrl: pattern.learnUrl });
      return found;
    },
  },
  {
    id: 'PAT-006',
    learnUrl: CATALOGUE_URL,
    check: (p) => {
      const pattern = usesS2d(p) ? patternFor(p) : undefined;
      if (!pattern || p.networking.intents.length === 0) return [];
      const have = p.networking.intents.map((i) => signature(i.traffic)).sort().join(' | ');
      const want = pattern.intents.map((i) => signature(i.traffic)).sort().join(' | ');
      return have === want
        ? []
        : [{ id: 'PAT-006', severity: 'info', field: 'networking.intents', message: `The intents differ from the reference pattern (${want.replace(/\+/g, ' + ')}). Custom intent layouts are possible; the reference pattern is the tested one.`, learnUrl: pattern.learnUrl }];
    },
  },
];
