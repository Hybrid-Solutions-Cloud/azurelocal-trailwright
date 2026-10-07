import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';

type Operations = Project['operations'];

const items: { key: keyof Operations; label: string }[] = [
  { key: 'monitoring', label: 'Azure Monitor and Insights' },
  { key: 'updateManager', label: 'Azure Update Manager' },
  { key: 'backup', label: 'Backup' },
  { key: 'disasterRecovery', label: 'Disaster recovery' },
];

export const OperationsScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const ops = project.operations;

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Operations</h1>
      <ul className="space-y-3">
        {items.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-3">
            <input id={`ops-${key}`} type="checkbox" checked={ops[key]} onChange={(e) => setSection('operations', { ...ops, [key]: e.target.checked })} />
            <label htmlFor={`ops-${key}`} className="text-sm font-medium text-gray-700">
              {label}
            </label>
          </li>
        ))}
      </ul>
      <FindingsPanel prefixes={['operations']} />
    </section>
  );
};