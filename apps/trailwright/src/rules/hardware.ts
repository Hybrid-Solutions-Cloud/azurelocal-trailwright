import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];

const QUORUM_URL = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/quorum#cluster-quorum-overview';
const ARM_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-resource-manager-template?view=azloc-2609#arm-template-parameters-reference';
const RACK_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/rack-aware-cluster-requirements?view=azloc-2609#supported-node-configurations';
const SYSREQ_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/system-requirements-23h2?view=azloc-2609';

const DISCONNECTED_URL = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#deploy-workload-clusters';
const RACK_DEPLOY_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/rack-aware-cluster-deployment-via-template?view=azloc-2609#step-2-deploy-using-arm-template';

export const hardwareRules: Rule[] = [
  {
    id: 'HW-007',
    release: RELEASES,
    learnUrl: RACK_DEPLOY_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.deployment.type !== 'disconnected' && p.hardware.witness !== 'cloud'
        ? [{ id: 'HW-007', severity: 'error', field: 'hardware.witness', message: 'A rack-aware cluster requires a cloud witness.', learnUrl: RACK_DEPLOY_URL }]
        : [],
  },
  {
    id: 'HW-008',
    release: RELEASES,
    learnUrl: DISCONNECTED_URL,
    check: (p) =>
      p.hardware.topology === 'rack-aware' && p.deployment.type === 'disconnected' && p.hardware.witness !== 'file-share'
        ? [{ id: 'HW-008', severity: 'error', field: 'hardware.witness', message: 'A rack-aware cluster in Azure Local disconnected operations requires a file share witness.', learnUrl: DISCONNECTED_URL }]
        : [],
  },
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
      p.hardware.witness === 'file-share' && p.deployment.type !== 'disconnected'
        ? [{ id: 'HW-002', severity: 'error', field: 'hardware.witness', message: 'Connected Azure Local deployments use a cloud witness: the deployment offers only the Cloud witness type. A file share witness appears in the documentation only for disconnected operations.', learnUrl: ARM_URL }]
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