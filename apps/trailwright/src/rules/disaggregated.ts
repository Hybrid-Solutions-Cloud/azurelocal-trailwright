import type { Rule } from './types';
import { isCidr } from '../network/ip';

const ARM = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-resource-manager-template-disaggregated?view=azloc-2609#arm-template-parameters-reference';

// The disaggregated ARM template (create-cluster-san) takes the infrastructure LUN identifiers and the cluster networks.
export const disaggregatedRules: Rule[] = [
  {
    id: 'DA-001',
    learnUrl: ARM,
    check: (p) =>
      p.deployment.architecture === 'disaggregated' && (!p.storage.infraVolLunId.trim() || !p.storage.infraPerfLunId.trim())
        ? [{ id: 'DA-001', severity: 'error', field: 'storage.infraVolLunId', message: 'Enter the LUN serial number or unique ID of the infrastructure volume (250 GB minimum) and of the performance history volume (20 GB minimum); the template needs both.', learnUrl: ARM }]
        : [],
  },
  {
    id: 'DA-002',
    learnUrl: ARM,
    check: (p) =>
      p.deployment.architecture === 'disaggregated' && (p.networking.clusterSubnets.length < 2 || p.networking.clusterSubnets.slice(0, 2).some((s) => !isCidr(s)))
        ? [{ id: 'DA-002', severity: 'error', field: 'networking.clusterSubnets', message: 'Enter the subnet of cluster network A and of cluster network B in CIDR notation, for example 10.10.100.0/24; each standalone cluster port has its own subnet.', learnUrl: ARM }]
        : [],
  },
  {
    id: 'DA-003',
    learnUrl: ARM,
    check: (p) =>
      p.deployment.architecture === 'disaggregated' && p.identity.mode === 'local-identity-key-vault'
        ? [{ id: 'DA-003', severity: 'warning', field: 'identity.mode', message: 'The Microsoft template for disaggregated deployments (create-cluster-san) has Active Directory parameters only; the export uses the Active Directory form, so prepare the domain and OU.', learnUrl: ARM }]
        : [],
  },
];
