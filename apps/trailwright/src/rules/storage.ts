import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];
const RACK_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/rack-aware-cluster-requirements?view=azloc-2609#supported-node-configurations';
const ADD_NODE_URL = 'https://learn.microsoft.com/azure/azure-local/manage/add-server?view=azloc-2609#supported-scenarios';

const SAN_URL = 'https://learn.microsoft.com/azure/azure-local/plan/fiber-channel-no-backup-disaggregated-pattern?view=azloc-2609#when-to-use-this-pattern';

export const storageRules: Rule[] = [
  {
    id: 'STO-004',
    requires: 'san',
    release: RELEASES,
    learnUrl: SAN_URL,
    check: (p) =>
      p.storage.sanLuns.length === 0
        ? [{ id: 'STO-004', severity: 'warning', field: 'storage.sanLuns', message: 'A SAN design needs at least one LUN or volume on the external storage array.', learnUrl: SAN_URL }]
        : [],
  },
  {
    id: 'STO-005',
    requires: 'san',
    release: RELEASES,
    learnUrl: SAN_URL,
    check: (p) =>
      p.hardware.nodes.length > 64
        ? [{ id: 'STO-005', severity: 'error', field: 'hardware.nodes', message: 'The disaggregated Fibre Channel SAN pattern covers clusters of up to 64 nodes.', learnUrl: SAN_URL }]
        : [],
  },
  {
    id: 'STO-001',
    requires: 's2d',
    release: RELEASES,
    learnUrl: RACK_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.storage.volumes.some((v) => v.resiliency === 'three-way')
        ? [{ id: 'STO-001', severity: 'error', field: 'storage.volumes', message: 'Rack-aware clusters cannot use three-way mirror volumes; use two-way or four-way.', learnUrl: RACK_URL }]
        : [],
  },
  {
    id: 'STO-002',
    requires: 's2d',
    release: RELEASES,
    learnUrl: RACK_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.hardware.nodes.length >= 4 && p.storage.volumes.some((v) => v.resiliency === 'two-way')
        ? [{ id: 'STO-002', severity: 'warning', field: 'storage.volumes', message: 'Rack-aware clusters of four or more nodes are documented with four-way mirror volumes.', learnUrl: RACK_URL }]
        : [],
  },
  {
    id: 'STO-003',
    requires: 's2d',
    release: RELEASES,
    learnUrl: ADD_NODE_URL,
    check: (p) =>
      p.hardware.nodes.length === 2 && p.storage.volumes.some((v) => v.resiliency === 'three-way')
        ? [{ id: 'STO-003', severity: 'warning', field: 'storage.volumes', message: 'A two-node cluster uses a two-way mirror; the three-way mirror comes with three nodes.', learnUrl: ADD_NODE_URL }]
        : [],
  },
];