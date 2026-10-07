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

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Updates</h2>
        <Check id="ops-updateManager" label="Use Azure Update Manager" hint="The Azure service for applying, viewing and managing updates on Azure Local. This is patching, not backup." checked={ops.updateManager} onChange={(updateManager) => set({ updateManager })} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Monitoring</h2>
        <Check id="ops-monitoring" label="Use Azure Monitor and Insights" hint="Health, performance and alerts for the cluster, hosts and VMs." checked={ops.monitoring} onChange={(monitoring) => set({ monitoring })} />
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