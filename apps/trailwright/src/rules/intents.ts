import type { Rule } from './types';
import { usesS2d } from './types';
import { disaggregatedPortsNeeded, groupingLabels, groupingSupported, portChoices, storageKind } from '../network/intents';

const F = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609';
const D6 = `${F}#decision-6-determine-network-adapter-ports-and-configuration`;
const D7 = `${F}#decision-7-determine-network-traffic-intents`;

export const intentRules: Rule[] = [
  {
    id: 'INT-001',
    learnUrl: D7,
    check: (p) => {
      if (p.deployment.architecture === 'disaggregated') return [];
      const kind = storageKind(p);
      return groupingSupported(p.networking.intentGrouping, kind)
        ? []
        : [{ id: 'INT-001', severity: 'error', field: 'networking.intentGrouping', message: `"${groupingLabels[p.networking.intentGrouping].label}" is not supported with ${kind} storage: it needs a physical switch for storage.`, learnUrl: D7 }];
    },
  },
  {
    id: 'INT-002',
    learnUrl: D6,
    check: (p) => {
      const used = p.networking.intents.reduce((sum, i) => sum + i.adapters.length, 0);
      return p.deployment.architecture !== 'disaggregated' && used > p.networking.portsPerNode
        ? [{ id: 'INT-002', severity: 'error', field: 'networking.portsPerNode', message: `The intents use ${used} adapters but the design has ${p.networking.portsPerNode} network ports per node.`, learnUrl: D6 }]
        : [];
    },
  },
  {
    id: 'INT-003',
    learnUrl: D7,
    check: (p) => {
      const thin = p.networking.intents.filter((i) => i.adapters.length < 2);
      return thin.length
        ? [{ id: 'INT-003', severity: 'warning', field: 'networking.intents', message: `Use at least two network adapter ports per intent for high availability; ${thin.map((i) => i.name).join(', ')} ${thin.length === 1 ? 'has' : 'have'} fewer.`, learnUrl: D7 }]
        : [];
    },
  },
  {
    id: 'INT-004',
    learnUrl: D7,
    check: (p) => {
      if (p.networking.intents.length === 0) return [];
      const found = [];
      if (p.networking.intents.length > 3)
        found.push({ id: 'INT-004', severity: 'error' as const, field: 'networking.intents', message: 'A custom configuration defines up to three intents.', learnUrl: D7 });
      if (!p.networking.intents.some((i) => i.traffic.includes('management')))
        found.push({ id: 'INT-004', severity: 'error' as const, field: 'networking.intents', message: 'At least one intent must carry management traffic.', learnUrl: D7 });
      return found;
    },
  },
  {
    id: 'INT-005',
    learnUrl: D6,
    check: (p) =>
      usesS2d(p) && p.deployment.architecture !== 'disaggregated' && !portChoices(p).includes(p.networking.portsPerNode)
        ? [{ id: 'INT-005', severity: 'warning', field: 'networking.portsPerNode', message: 'Hyperconverged deployments use 2, 4, 6 or 8 network adapter ports per node.', learnUrl: D6 }]
        : [],
  },
  {
    id: 'INT-006',
    learnUrl: D6,
    check: (p) => {
      if (p.deployment.architecture !== 'disaggregated') return [];
      const need = disaggregatedPortsNeeded(p);
      return p.networking.portsPerNode < need
        ? [{ id: 'INT-006', severity: 'error', field: 'networking.portsPerNode', message: `A disaggregated ${p.deployment.sanType === 'iscsi' ? 'iSCSI' : 'Fibre Channel'} node needs ${need} Ethernet ports${p.deployment.sanType === 'fibre-channel' ? ' (plus dual-port Fibre Channel HBAs)' : ''}; the design has ${p.networking.portsPerNode}.`, learnUrl: D6 }]
        : [];
    },
  },
  {
    id: 'INT-007',
    learnUrl: D7,
    check: (p) => {
      if (storageKind(p) !== 'switchless') return [];
      const shared = p.networking.intents.some((i) => i.traffic.includes('storage') && (i.traffic.includes('management') || i.traffic.includes('compute')));
      return shared
        ? [{ id: 'INT-007', severity: 'error', field: 'networking.intents', message: 'Switchless clusters need storage in its own intent, separate from management and compute.', learnUrl: D7 }]
        : [];
    },
  },
];