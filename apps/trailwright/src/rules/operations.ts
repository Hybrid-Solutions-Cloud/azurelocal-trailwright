import type { Rule } from './types';

const VM_RESILIENCY_URL = 'https://learn.microsoft.com/azure/azure-local/manage/disaster-recovery-vm-resiliency?view=azloc-2609';
const ASR_URL = 'https://learn.microsoft.com/azure/azure-local/manage/azure-site-recovery?view=azloc-2609';
const INSIGHTS_URL = 'https://learn.microsoft.com/azure/azure-local/manage/monitor-single-23h2?view=azloc-2609#enable-insights';
const ALERTS_URL = 'https://learn.microsoft.com/azure/azure-local/manage/health-alerts-via-azure-monitor-alerts?view=azloc-2609';
const LIMITED_URL = 'https://learn.microsoft.com/azure/azure-local/update/import-discover-updates-offline-23h2?view=azloc-2609';

export const operationsRules: Rule[] = [
  {
    id: 'OPS-001',
    learnUrl: VM_RESILIENCY_URL,
    check: (p) =>
      p.operations.backup && !p.operations.backupSolution.trim()
        ? [{ id: 'OPS-001', severity: 'warning', field: 'operations.backupSolution', message: 'Name the backup solution you will use and check its Azure Local support statement; the documentation lists partner options and notes that restores can take hours.', learnUrl: VM_RESILIENCY_URL }]
        : [],
  },
  {
    id: 'OPS-002',
    learnUrl: ASR_URL,
    check: (p) =>
      p.operations.drMethod === 'asr'
        ? [{ id: 'OPS-002', severity: 'info', field: 'operations.drMethod', message: 'Azure Site Recovery needs a Recovery Services vault and is not supported for Trusted launch VMs. The Azure Local extension is in preview and meant for test environments; production uses the Hyper-V to Azure option.', learnUrl: ASR_URL }]
        : [],
  },
  {
    id: 'OPS-003',
    learnUrl: VM_RESILIENCY_URL,
    check: (p) =>
      p.operations.drMethod === 'hyperv-replica'
        ? [{ id: 'OPS-003', severity: 'info', field: 'operations.drMethod', message: 'Hyper-V Replica replicates between two Azure Local clusters, so a second cluster is part of the design. It is configured with PowerShell or Failover Cluster Manager, not in the Azure portal.', learnUrl: VM_RESILIENCY_URL }]
        : [],
  },
  {
    id: 'OPS-005',
    learnUrl: LIMITED_URL,
    check: (p) =>
      p.operations.updateMethod === 'powershell-limited'
        ? [{ id: 'OPS-005', severity: 'info', field: 'operations.updateMethod', message: 'With limited connectivity you download the solution update bundle (and any Solution Builder Extension files from the hardware vendor), check its SHA256 hash, import it to the infrastructure volume with Add-SolutionUpdate, then start the update from PowerShell.', learnUrl: LIMITED_URL }]
        : [],
  },
  {
    id: 'MON-001',
    learnUrl: INSIGHTS_URL,
    check: (p) =>
      p.operations.monitoring && !p.operations.workspaceName.trim()
        ? [{ id: 'MON-001', severity: 'error', field: 'operations.workspaceName', message: 'Insights stores its data in a Log Analytics workspace; name the workspace.', learnUrl: INSIGHTS_URL }]
        : [],
  },
  {
    id: 'MON-002',
    learnUrl: INSIGHTS_URL,
    check: (p) =>
      p.operations.monitoring && p.operations.agentPrivateLinks && !p.operations.dceName.trim()
        ? [{ id: 'MON-002', severity: 'error', field: 'operations.dceName', message: 'When the Azure Monitor Agent uses private links, a data collection endpoint is required.', learnUrl: INSIGHTS_URL }]
        : [],
  },
  {
    id: 'MON-003',
    learnUrl: INSIGHTS_URL,
    check: (p) =>
      p.operations.monitoring && p.operations.useExistingDcr
        ? [{ id: 'MON-003', severity: 'warning', field: 'operations.useExistingDcr', message: 'Microsoft strongly recommends not creating your own data collection rule: the one Insights creates includes a special data stream it needs.', learnUrl: INSIGHTS_URL }]
        : [],
  },
  {
    id: 'MON-004',
    learnUrl: ALERTS_URL,
    check: (p) =>
      p.operations.monitoring && p.operations.healthAlerts && !p.operations.alertEmail.trim()
        ? [{ id: 'MON-004', severity: 'warning', field: 'operations.alertEmail', message: 'Health alerts need somewhere to go: give a notification address.', learnUrl: ALERTS_URL }]
        : [],
  },
];