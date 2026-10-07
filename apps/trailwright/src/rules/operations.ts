import type { Rule } from './types';

const VM_RESILIENCY_URL = 'https://learn.microsoft.com/azure/azure-local/manage/disaster-recovery-vm-resiliency?view=azloc-2609';
const ASR_URL = 'https://learn.microsoft.com/azure/azure-local/manage/azure-site-recovery?view=azloc-2609';
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
];