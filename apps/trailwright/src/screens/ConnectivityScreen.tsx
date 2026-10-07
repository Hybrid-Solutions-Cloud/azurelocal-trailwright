import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { SelectInput, TextInput } from '../components/Field';

type Path = Project['connectivity']['path'];

const pathOptions = [
  { value: 'direct', label: 'Direct outbound' },
  { value: 'proxy', label: 'Enterprise proxy' },
  { value: 'arc-gateway', label: 'Arc gateway' },
  { value: 'proxy-arc-gateway', label: 'Enterprise proxy and Arc gateway' },
  { value: 'private-path', label: 'Private path' },
];

export const ConnectivityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const connectivity = project.connectivity;
  const usesProxy = connectivity.path === 'proxy' || connectivity.path === 'proxy-arc-gateway';

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Connectivity</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <SelectInput
          id="connectivity-path"
          label="Outbound path"
          value={connectivity.path}
          options={pathOptions}
          onChange={(v) => setSection('connectivity', { ...connectivity, path: v as Path })}
        />
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