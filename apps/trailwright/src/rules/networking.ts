import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];

const FOUR_NODE_SW_URL = 'https://learn.microsoft.com/azure/azure-local/plan/four-node-switchless-two-switches-two-links?view=azloc-2609';
const THREE_NODE_SW_URL = 'https://learn.microsoft.com/azure/azure-local/plan/three-node-switchless-two-switches-two-links?view=azloc-2609#logical-networks';
const DISCONNECTED_URL = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#deploy-workload-clusters';
const TWO_NODE_SW_URL = 'https://learn.microsoft.com/azure/azure-local/plan/two-node-switchless-two-switches?view=azloc-2609#logical-connectivity-components';
const ATC_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/network-atc-overview?view=azloc-2609';

export const networkingRules: Rule[] = [
  {
    id: 'NET-001',
    requires: 's2d',
    release: RELEASES,
    learnUrl: FOUR_NODE_SW_URL,
    check: (p) =>
      p.networking.storage === 'switchless' && p.hardware.nodes.length > 4
        ? [{ id: 'NET-001', severity: 'error', field: 'networking.storage', message: 'Switchless storage reference patterns are documented only for 2, 3 and 4 nodes.', learnUrl: FOUR_NODE_SW_URL }]
        : [],
  },
  {
    id: 'NET-002',
    requires: 's2d',
    release: RELEASES,
    learnUrl: THREE_NODE_SW_URL,
    check: (p) =>
      p.networking.storage === 'switchless' && (p.hardware.nodes.length === 3 || p.hardware.nodes.length === 4)
        ? [{ id: 'NET-002', severity: 'warning', field: 'networking.storage', message: 'Three- or four-node switchless clusters can only be deployed with an ARM template and cannot be scaled out later.', learnUrl: THREE_NODE_SW_URL }]
        : [],
  },
  {
    id: 'NET-003',
    requires: 's2d',
    release: RELEASES,
    learnUrl: DISCONNECTED_URL,
    check: (p) => {
      if (p.hardware.topology !== 'rack-aware') return [];
      const hasStorage = p.networking.intents.some((i) => i.traffic.includes('storage'));
      const combined = p.networking.intents.some(
        (i) => i.traffic.includes('storage') && (i.traffic.includes('management') || i.traffic.includes('compute'))
      );
      return combined || !hasStorage
        ? [{ id: 'NET-003', severity: 'error', field: 'networking.intents', message: 'Rack-aware clusters require a dedicated storage intent that is separate from management and compute.', learnUrl: DISCONNECTED_URL }]
        : [];
    },
  },
  {
    id: 'NET-004',
    requires: 's2d',
    release: RELEASES,
    learnUrl: TWO_NODE_SW_URL,
    check: (p) =>
      p.networking.vlans.some((v) => v.id === 711 || v.id === 712)
        ? []
        : [{ id: 'NET-004', severity: 'warning', field: 'networking.vlans', message: 'The default storage VLANs are 711 and 712; confirm that custom storage VLAN ids are intentional.', learnUrl: TWO_NODE_SW_URL }],
  },
  {
    id: 'NET-005',
    release: RELEASES,
    learnUrl: ATC_URL,
    check: (p) => {
      if (p.hardware.nodes.length === 0) return [];
      const traffic = p.networking.intents.flatMap((i) => i.traffic);
      // With a SAN only, storage runs on Fibre Channel and Network ATC manages the management and compute intent only.
      const needed = p.storage.architecture === 'san' ? (['management'] as const) : (['management', 'storage'] as const);
      const missing = needed.filter((t) => !traffic.includes(t));
      return missing.length === 0
        ? []
        : [{ id: 'NET-005', severity: 'error', field: 'networking.intents', message: `Required traffic must appear in at least one intent (); missing: ${missing.join(', ')}.`, learnUrl: ATC_URL }];
    },
  },
];