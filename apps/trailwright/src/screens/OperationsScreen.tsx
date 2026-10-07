import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { ChoiceCards } from '../components/ChoiceCards';
import { TextInput } from '../components/Field';

type Operations = Project['operations'];

const approachOptions = [
  { value: 'host', label: 'Host-level', description: 'Agent on the cluster nodes. Whole-VM recovery, no agent in each guest.' },
  { value: 'guest', label: 'Guest-level', description: 'Agent in each VM. Application-aware, item-level recovery.' },
  { value: 'both', label: 'Both', description: 'Host-level for full-VM recovery, guest-level for critical applications.' },
];

const updateOptions = [
  { value: 'portal', label: 'Azure portal', description: 'Azure Update Manager (Resources, Azure Local) or the Azure Local resource page. The system must be connected to Azure.' },
  { value: 'powershell', label: 'PowerShell', description: 'Get-SolutionUpdate and Start-SolutionUpdate on a node, signed in with the deployment user.' },
  { value: 'powershell-limited', label: 'PowerShell, limited connectivity', description: 'Download the solution update bundle, import it to the infrastructure volume, then update from PowerShell.' },
];

const drOptions = [
  { value: 'none', label: 'No replication', description: 'Recovery is from backup only.' },
  { value: 'asr', label: 'Azure Site Recovery', description: 'Replicate VMs to Azure. Needs a Recovery Services vault.' },
  { value: 'hyperv-replica', label: 'Hyper-V Replica', description: 'Replicate to a second Azure Local cluster on premises.' },
];

const Check: FC<{ id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }> = ({ id, label, hint, checked, onChange }) => (
  <div className="flex items-start gap-3">
    <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <label htmlFor={id} className="text-sm font-medium text-gray-800">
      {label}
      <span className="block text-xs font-normal text-gray-500">{hint}</span>
    </label>
  </div>
);

export const OperationsScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const ops = project.operations;
  const set = (patch: Partial<Operations>) => setSection('operations', { ...ops, ...patch });

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Operations</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Updates</h2>
        <p className="text-sm text-gray-600">
          Every Azure Local release is supported for six months, so updates are part of operating the cluster. Choose how they will be applied; Microsoft supports only these two interfaces.
        </p>
        <ChoiceCards name="update-method" legend="How updates are applied" value={ops.updateMethod} onChange={(v) => set({ updateMethod: v as Operations['updateMethod'] })} choices={updateOptions} />
        <p className="text-xs text-gray-500">Not supported for installing updates: SConfig, Windows Admin Center, Azure Update Manager from the Machines pane, the Updates pane of the Machine - Azure Arc resource, manual Cluster-Aware Updating, and third-party tools.</p>
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Monitoring</h2>
        <Check id="ops-monitoring" label="Use Insights (Azure Monitor)" hint="Installs the Azure Monitor Agent on every node and a data collection rule that sends health, performance and event data to a Log Analytics workspace." checked={ops.monitoring} onChange={(monitoring) => set({ monitoring })} />
        {ops.monitoring && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput id="mon-workspace" label="Log Analytics workspace" value={ops.workspaceName} hint="Where the data is stored." onChange={(workspaceName) => set({ workspaceName })} />
              <TextInput id="mon-workspace-rg" label="Workspace resource group" value={ops.workspaceResourceGroup} onChange={(workspaceResourceGroup) => set({ workspaceResourceGroup })} />
            </div>
            <Check id="mon-own-dcr" label="Use my own data collection rule" hint="Not recommended: the rule Insights creates includes a special data stream it needs. Rules the agent setup creates are prefixed AzureStackHCI-." checked={ops.useExistingDcr} onChange={(useExistingDcr) => set({ useExistingDcr })} />
            {ops.useExistingDcr && <TextInput id="mon-dcr" label="Data collection rule name" value={ops.dcrName} onChange={(dcrName) => set({ dcrName })} />}
            <Check id="mon-private-links" label="The Azure Monitor Agent uses private links" hint="Then a data collection endpoint is required." checked={ops.agentPrivateLinks} onChange={(agentPrivateLinks) => set({ agentPrivateLinks })} />
            {ops.agentPrivateLinks && <TextInput id="mon-dce" label="Data collection endpoint name" value={ops.dceName} onChange={(dceName) => set({ dceName })} />}
            <Check id="mon-refs" label="Monitor ReFS deduplication and compression" hint="Adds the counters and event logs for the feature to the data collection rule. Data starts to appear 20 to 30 minutes after enabling." checked={ops.refsDedupMonitoring} onChange={(refsDedupMonitoring) => set({ refsDedupMonitoring })} />
            <Check id="mon-alerts" label="Health alerts" hint="An alert is raised when the storage pool reaches 70% consumption." checked={ops.healthAlerts} onChange={(healthAlerts) => set({ healthAlerts })} />
            {ops.healthAlerts && <TextInput id="mon-email" label="Alert notification address" value={ops.alertEmail} hint="Where alerts are sent." onChange={(alertEmail) => set({ alertEmail })} />}
            <p className="text-xs text-gray-600">Insights collects five performance counters (available memory, network bytes per second, processor time, RDMA inbound and outbound bytes per second) and two event channels (health and SDDC management). The Azure Monitor extension must be installed on the Arc machines.</p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Backup</h2>
        <Check id="ops-backup" label="Back up VMs" hint="Point-in-time recovery. Restores can take hours; keep offsite copies." checked={ops.backup} onChange={(backup) => set({ backup })} />
        {ops.backup && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ChoiceCards name="backup-approach" legend="Backup approach" value={ops.backupApproach} onChange={(v) => set({ backupApproach: v as Operations['backupApproach'] })} choices={approachOptions} />
            <TextInput id="backup-solution" label="Backup solution" value={ops.backupSolution} hint="The supported solution you will use. Check its Azure Local support statement." onChange={(backupSolution) => set({ backupSolution })} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-800">Disaster recovery</h2>
        <ChoiceCards name="dr-method" legend="Replication for rapid failover" value={ops.drMethod} onChange={(v) => set({ drMethod: v as Operations['drMethod'], disasterRecovery: v !== 'none' })} choices={drOptions} />
      </div>

      <FindingsPanel prefixes={['operations']} />
    </section>
  );
};