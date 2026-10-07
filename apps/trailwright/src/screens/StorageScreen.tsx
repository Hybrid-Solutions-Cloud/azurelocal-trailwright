import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, SelectInput, TextInput } from '../components/Field';

type Volume = Project['storage']['volumes'][number];

const resiliencyOptions = [
  { value: 'two-way', label: 'Two-way mirror' },
  { value: 'three-way', label: 'Three-way mirror' },
  { value: 'four-way', label: 'Four-way mirror' },
  { value: 'parity', label: 'Parity' },
];

export const StorageScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const volumes = project.storage.volumes;
  const save = (next: Volume[]) => setSection('storage', { ...project.storage, volumes: next });
  const update = (index: number, patch: Partial<Volume>) => save(volumes.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Storage</h1>
      <ul className="space-y-3">
        {volumes.map((volume, index) => (
          <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-slate-200 p-3">
            <TextInput id={`volume-${index}-name`} label={`Volume ${index + 1} name`} value={volume.name} onChange={(name) => update(index, { name })} />
            <NumberInput id={`volume-${index}-size`} label={`Volume ${index + 1} size (GiB)`} value={volume.sizeGiB} onChange={(sizeGiB) => update(index, { sizeGiB })} />
            <SelectInput
              id={`volume-${index}-resiliency`}
              label={`Volume ${index + 1} resiliency`}
              value={volume.resiliency}
              options={resiliencyOptions}
              onChange={(v) => update(index, { resiliency: v as Volume['resiliency'] })}
            />
            <button type="button" onClick={() => save(volumes.filter((_, i) => i !== index))} className="text-sm font-medium text-red-700 hover:underline">
              Remove volume {index + 1}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => save([...volumes, { name: `volume${volumes.length + 1}`, sizeGiB: 1024, resiliency: 'two-way' }])}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Add volume
      </button>
      <FindingsPanel prefixes={['storage']} />
    </section>
  );
};