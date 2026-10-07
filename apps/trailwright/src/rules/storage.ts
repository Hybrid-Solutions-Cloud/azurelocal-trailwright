import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];
const RACK_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/rack-aware-cluster-requirements?view=azloc-2609#supported-node-configurations';
const ADD_NODE_URL = 'https://learn.microsoft.com/azure/azure-local/manage/add-server?view=azloc-2609#supported-scenarios';

export const storageRules: Rule[] = [
  {
    id: 'STO-001',
    release: RELEASES,
    learnUrl: RACK_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.storage.volumes.some((v) => v.resiliency === 'three-way')
        ? [{ id: 'STO-001', severity: 'error', field: 'storage.volumes', message: 'Rack-aware clusters cannot use three-way mirror volumes; use two-way or four-way.', learnUrl: RACK_URL }]
        : [],
  },
  {
    id: 'STO-002',
    release: RELEASES,
    learnUrl: RACK_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.hardware.nodes.length >= 4 && p.storage.volumes.some((v) => v.resiliency === 'two-way')
        ? [{ id: 'STO-002', severity: 'warning', field: 'storage.volumes', message: 'Rack-aware clusters of four or more nodes are documented with four-way mirror volumes.', learnUrl: RACK_URL }]
        : [],
  },
  {
    id: 'STO-003',
    release: RELEASES,
    learnUrl: ADD_NODE_URL,
    check: (p) =>
      p.hardware.nodes.length === 2 && p.storage.volumes.some((v) => v.resiliency === 'three-way')
        ? [{ id: 'STO-003', severity: 'warning', field: 'storage.volumes', message: 'A two-node cluster uses a two-way mirror; the three-way mirror comes with three nodes.', learnUrl: ADD_NODE_URL }]
        : [],
  },
];