import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];

const QUORUM_URL = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/quorum#cluster-quorum-overview';
const ARM_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-resource-manager-template?view=azloc-2609#arm-template-parameters-reference';
const RACK_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/rack-aware-cluster-requirements?view=azloc-2609#supported-node-configurations';
const SYSREQ_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/system-requirements-23h2?view=azloc-2609';

export const hardwareRules: Rule[] = [
  {
    id: 'HW-001',
    release: RELEASES,
    learnUrl: QUORUM_URL,
    check: (p) =>
      p.hardware.nodes.length === 2 && p.hardware.witness === 'none'
        ? [{ id: 'HW-001', severity: 'error', field: 'hardware.witness', message: 'A two-node cluster requires a witness to maintain quorum.', learnUrl: QUORUM_URL }]
        : [],
  },
  {
    id: 'HW-002',
    release: RELEASES,
    learnUrl: ARM_URL,
    check: (p) =>
      p.hardware.nodes.length === 2 && p.hardware.witness === 'file-share'
        ? [{ id: 'HW-002', severity: 'error', field: 'hardware.witness', message: "For a two-node deployment the ARM template requires the Cloud witness type; 'file-share' is not supported.", learnUrl: ARM_URL }]
        : [],
  },
  {
    id: 'HW-003',
    release: RELEASES,
    learnUrl: QUORUM_URL,
    check: (p) =>
      p.hardware.nodes.length >= 3 && p.hardware.nodes.length <= 4 && p.hardware.witness === 'none'
        ? [{ id: 'HW-003', severity: 'warning', field: 'hardware.witness', message: 'A witness is strongly recommended for clusters with 3 or 4 nodes.', learnUrl: QUORUM_URL }]
        : [],
  },
  {
    id: 'HW-004',
    release: RELEASES,
    learnUrl: QUORUM_URL,
    check: (p) =>
      p.hardware.nodes.length >= 5 && p.hardware.witness !== 'none'
        ? [{ id: 'HW-004', severity: 'info', field: 'hardware.witness', message: 'A witness is not needed with 5 or more nodes and provides no additional resiliency.', learnUrl: QUORUM_URL }]
        : [],
  },
  {
    id: 'HW-005',
    release: RELEASES,
    learnUrl: RACK_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.hardware.nodes.length > 0 && ![2, 4, 6, 8].includes(p.hardware.nodes.length)
        ? [{ id: 'HW-005', severity: 'error', field: 'hardware.nodes', message: 'Rack-aware topology supports only 2, 4, 6 or 8 nodes arranged in two equal zones.', learnUrl: RACK_URL }]
        : [],
  },
  {
    id: 'HW-006',
    release: RELEASES,
    learnUrl: SYSREQ_URL,
    check: (p) =>
      p.hardware.nodes.length === 0
        ? [{ id: 'HW-006', severity: 'error', field: 'hardware.nodes', message: 'At least one node is required for an Azure Local cluster.', learnUrl: SYSREQ_URL }]
        : [],
  },
];