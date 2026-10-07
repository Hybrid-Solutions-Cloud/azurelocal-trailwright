import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { TextInput } from '../components/Field';
import { ChoiceCards } from '../components/ChoiceCards';

type Path = Project['connectivity']['path'];

const pathOptions = [
  { value: 'direct', label: 'Direct outbound', description: 'Nodes reach Azure over the internet through the firewall.' },
  { value: 'proxy', label: 'Enterprise proxy', description: 'Outbound traffic goes through a non-authenticated proxy.' },
  { value: 'arc-gateway', label: 'Arc gateway', description: 'Fewer endpoints to allow. Chosen before deployment, cannot be added later.' },
  { value: 'proxy-arc-gateway', label: 'Enterprise proxy and Arc gateway', description: 'Arc gateway traffic through the enterprise proxy.' },
  { value: 'private-path', label: 'Private path', description: 'Private network path to Azure. Needs 2608 or later.' },
];

export const ConnectivityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const connectivity = project.connectivity;
  const usesProxy = connectivity.path === 'proxy' || connectivity.path === 'proxy-arc-gateway';

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Connectivity</h1>
      <div className="space-y-6">
        <ChoiceCards name="connectivity-path" legend="Outbound path" value={connectivity.path} onChange={(v) => setSection('connectivity', { ...connectivity, path: v as Path })} choices={pathOptions} />
        {usesProxy && (
          <TextInput
            id="proxy-url"
            label="Proxy address"
            value={connectivity.proxyUrl ?? ''}
            hint="Non-authenticated proxy, no PAC file, not on a .local domain."
            onChange={(proxyUrl) => setSection('connectivity', { ...connectivity, proxyUrl })}
          />
        )}
      </div>
      <FindingsPanel prefixes={['connectivity']} />
    </section>
  );
};