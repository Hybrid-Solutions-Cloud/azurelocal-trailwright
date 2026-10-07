import type { Rule } from './types';

const SMP = 'https://learn.microsoft.com/azure/azure-local/deploy/simplified-machine-provisioning?view=azloc-2609';
const PORTAL = 'https://learn.microsoft.com/azure/azure-local/deploy/deploy-via-portal?view=azloc-2609';
const DA_OS = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-install-os-disaggregated?view=azloc-2609#prerequisites';
const CUSTOM_IP = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609#custom-ips-for-storage';

const usesGateway = (path: string): boolean => path === 'arc-gateway' || path === 'proxy-arc-gateway' || path === 'private-path';

export const provisioningRules: Rule[] = [
  {
    id: 'PRV-001',
    learnUrl: SMP,
    check: (p) =>
      p.provisioning.osInstall === 'simplified' && usesGateway(p.connectivity.path)
        ? [{ id: 'PRV-001', severity: 'error', field: 'provisioning.osInstall', message: 'The Azure Arc gateway is not supported with simplified machine provisioning in the preview; choose the ISO install, or an outbound path without the Arc gateway.', learnUrl: SMP }]
        : [],
  },
  {
    id: 'PRV-002',
    learnUrl: SMP,
    check: (p) =>
      p.provisioning.osInstall === 'simplified' && (p.provisioning.hardwareSku === '' || p.provisioning.hardwareSku === 'other')
        ? [{ id: 'PRV-002', severity: 'warning', field: 'provisioning.hardwareSku', message: 'The simplified machine provisioning preview lists Lenovo ThinkAgile MX650 V3 and V4, HPE ProLiant DL360 Gen11, and Dell AX-750 and AX-650. Other hardware is outside the documented list.', learnUrl: SMP }]
        : [],
  },
  {
    id: 'PRV-003',
    learnUrl: SMP,
    check: (p) =>
      p.provisioning.osInstall === 'simplified'
        ? [{ id: 'PRV-003', severity: 'info', field: 'provisioning.osInstall', message: 'This feature is in preview. In the preview only the East US region supports the provisioning resource; the resource group can be in your preferred region.', learnUrl: SMP }]
        : [],
  },
  {
    id: 'PRV-004',
    learnUrl: SMP,
    check: (p) =>
      p.provisioning.osInstall === 'simplified' && (!p.provisioning.timeZone.trim() || !p.provisioning.timeServer.trim())
        ? [{ id: 'PRV-004', severity: 'warning', field: 'provisioning.timeZone', message: 'The site configuration sets the time zone and the time server for every new machine in the site.', learnUrl: SMP }]
        : [],
  },
  {
    id: 'PRV-005',
    learnUrl: PORTAL,
    check: (p) =>
      p.provisioning.deployMethod === 'portal' && p.networking.storage === 'switchless' && (p.hardware.nodes.length === 3 || p.hardware.nodes.length === 4) && p.deployment.architecture !== 'disaggregated'
        ? [{ id: 'PRV-005', severity: 'error', field: 'provisioning.deployMethod', message: 'Three- and four-node storage switchless clusters can be deployed only with ARM templates.', learnUrl: CUSTOM_IP }]
        : [],
  },
  {
    id: 'PRV-006',
    learnUrl: CUSTOM_IP,
    check: (p) =>
      p.provisioning.deployMethod === 'portal' && !p.networking.storageAutoIp && p.deployment.architecture !== 'disaggregated'
        ? [{ id: 'PRV-006', severity: 'error', field: 'provisioning.deployMethod', message: 'The portal deployment does not let you specify your own storage IP addresses; custom storage IPs need an ARM template.', learnUrl: CUSTOM_IP }]
        : [],
  },
  {
    id: 'PRV-007',
    learnUrl: DA_OS,
    check: (p) => {
      if (p.deployment.architecture !== 'disaggregated') return [];
      const sizes = p.storage.sanLuns.map((l) => l.sizeGiB).sort((a, b) => b - a);
      return sizes[0] >= 250 && sizes[1] >= 20
        ? []
        : [{ id: 'PRV-007', severity: 'warning', field: 'storage.sanLuns', message: 'A disaggregated deployment needs a LUN of at least 250 GB for the infrastructure volume and a LUN of at least 20 GB for performance history.', learnUrl: DA_OS }];
    },
  },
];