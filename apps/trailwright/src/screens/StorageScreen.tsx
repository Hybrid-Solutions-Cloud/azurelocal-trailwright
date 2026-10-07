import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { ChoiceCards } from '../components/ChoiceCards';
import { NumberInput, SelectInput, TextInput } from '../components/Field';
import { usesS2d, usesSan } from '../rules/types';

type Volume = Project['storage']['volumes'][number];
type Lun = Project['storage']['sanLuns'][number];
type Architecture = Project['storage']['architecture'];

const architectureOptions = [
  { value: 's2d', label: 'Storage Spaces Direct', description: 'Local drives in every node, pooled by the cluster. Asks for drives and volume resiliency.' },
  { value: 'san', label: 'SAN (disaggregated)', description: 'External Fibre Channel storage array. No local storage pool, no storage network.' },
  { value: 'hybrid', label: 'Both: S2D and SAN', description: 'Local pooled storage plus an external array. Asks for both.' },
];

const resiliencyOptions = [
  { value: 'two-way', label: 'Two-way mirror' },
  { value: 'three-way', label: 'Three-way mirror' },
  { value: 'four-way', label: 'Four-way mirror' },
  { value: 'parity', label: 'Parity' },
];

const addClass = 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700';
const removeClass = 'text-sm font-medium text-red-700 hover:underline';

export const StorageScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const { volumes, sanLuns, architecture } = project.storage;
  const save = (patch: Partial<Project['storage']>) => setSection('storage', { ...project.storage, ...patch });
  const updateVolume = (index: number, patch: Partial<Volume>) => save({ volumes: volumes.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const updateLun = (index: number, patch: Partial<Lun>) => save({ sanLuns: sanLuns.map((l, i) => (i === index ? { ...l, ...patch } : l)) });

  return (
    <section className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Storage</h1>

      <ChoiceCards name="storage-architecture" legend="Storage architecture" value={architecture} onChange={(v) => save({ architecture: v as Architecture })} choices={architectureOptions} />

      {usesS2d(project) && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-slate-800">Storage Spaces Direct volumes</h2>
          <ul className="space-y-3">
            {volumes.map((volume, index) => (
              <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-slate-200 p-3">
                <TextInput id={`volume-${index}-name`} label={`Volume ${index + 1} name`} value={volume.name} onChange={(name) => updateVolume(index, { name })} />
                <NumberInput id={`volume-${index}-size`} label={`Volume ${index + 1} size (GiB)`} value={volume.sizeGiB} onChange={(sizeGiB) => updateVolume(index, { sizeGiB })} />
                <SelectInput
                  id={`volume-${index}-resiliency`}
                  label={`Volume ${index + 1} resiliency`}
                  value={volume.resiliency}
                  options={resiliencyOptions}
                  onChange={(v) => updateVolume(index, { resiliency: v as Volume['resiliency'] })}
                />
                <button type="button" onClick={() => save({ volumes: volumes.filter((_, i) => i !== index) })} className={removeClass}>
                  Remove volume {index + 1}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => save({ volumes: [...volumes, { name: `volume${volumes.length + 1}`, sizeGiB: 1024, resiliency: 'two-way' }] })} className={addClass}>
            Add volume
          </button>
        </div>
      )}

      {usesSan(project) && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-slate-800">SAN LUNs</h2>
          <ul className="space-y-3">
            {sanLuns.map((lun, index) => (
              <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-slate-200 p-3">
                <TextInput id={`lun-${index}-name`} label={`LUN ${index + 1} name`} value={lun.name} onChange={(name) => updateLun(index, { name })} />
                <NumberInput id={`lun-${index}-size`} label={`LUN ${index + 1} size (GiB)`} value={lun.sizeGiB} onChange={(sizeGiB) => updateLun(index, { sizeGiB })} />
                <button type="button" onClick={() => save({ sanLuns: sanLuns.filter((_, i) => i !== index) })} className={removeClass}>
                  Remove LUN {index + 1}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => save({ sanLuns: [...sanLuns, { name: `lun${sanLuns.length + 1}`, sizeGiB: 1024 }] })} className={addClass}>
            Add LUN
          </button>
        </div>
      )}

      <FindingsPanel prefixes={['storage']} />
    </section>
  );
};