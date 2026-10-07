import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];
const ARM_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-resource-manager-template?view=azloc-2609#arm-template-parameters-reference';
const OUTBOUND_URL = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609#decision-10-determine-outbound-connectivity';

const REGIONS_URL = 'https://learn.microsoft.com/azure/azure-local/concepts/system-requirements-23h2?view=azloc-2609#azure-requirements';

export const landingZoneRules: Rule[] = [
  {
    id: 'LZ-004',
    release: RELEASES,
    learnUrl: REGIONS_URL,
    check: (p) =>
      p.landingZone.region === 'usgovvirginia'
        ? [{ id: 'LZ-004', severity: 'info', field: 'landingZone.region', message: 'US Gov Virginia is the Azure Government region for Azure Local; some Azure public cloud features differ there.', learnUrl: REGIONS_URL }]
        : [],
  },
  {
    id: 'LZ-001',
    release: RELEASES,
    learnUrl: ARM_URL,
    check: (p) =>
      p.hardware.witness === 'cloud' && !p.landingZone.witnessStorageAccount?.trim()
        ? [{ id: 'LZ-001', severity: 'warning', field: 'landingZone.witnessStorageAccount', message: 'A cloud witness needs a storage account name (the ARM parameter clusterWitnessStorageAccountName).', learnUrl: ARM_URL }]
        : [],
  },
  {
    id: 'LZ-002',
    release: RELEASES,
    learnUrl: ARM_URL,
    check: (p) =>
      !p.landingZone.subscriptionName.trim() || !p.landingZone.resourceGroup.trim()
        ? [{ id: 'LZ-002', severity: 'warning', field: 'landingZone.resourceGroup', message: 'The subscription and the resource group are needed before deployment.', learnUrl: ARM_URL }]
        : [],
  },
  {
    id: 'LZ-003',
    release: RELEASES,
    learnUrl: OUTBOUND_URL,
    check: (p) =>
      p.landingZone.keyVaultName.trim()
        ? [{ id: 'LZ-003', severity: 'info', field: 'landingZone.keyVaultName', message: 'Keep public access on the Key Vault and the witness storage account until deployment completes, then restrict it.', learnUrl: OUTBOUND_URL }]
        : [],
  },
];