import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, SelectInput, TextInput } from '../components/Field';
import { usesS2d, usesSan } from '../rules/types';
import { allowedResiliency, capacitySummary, efficiency } from '../storage/capacity';

type Volume = Project['storage']['volumes'][number];
type Lun = Project['storage']['sanLuns'][number];


const resiliencyLabels = { 'two-way': 'Two-way mirror', 'three-way': 'Three-way mirror', 'four-way': 'Four-way mirror (rack-aware)', parity: 'Dual parity' } as const;

const mediaOptions = [
  { value: 'nvme', label: 'NVMe' },
  { value: 'ssd', label: 'SSD' },
  { value: 'hdd', label: 'HDD' },
];

const addClass = 'action';
const removeClass = 'text-sm font-medium text-red-700 hover:underline';

export const StorageScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const { volumes, sanLuns, architecture, driveLayout } = project.storage;
  const nodeCount = project.hardware.nodes.length;
  const summary = capacitySummary(project);
  // Keeping every node's drive count in step with the layout, for the schedules and exports.
  const setLayout = (patch: Partial<typeof driveLayout>) => {
    const next = { ...driveLayout, ...patch };
    setSection('storage', { ...project.storage, driveLayout: next });
    const total = next.capacity.count + next.cache.count;
    setSection('hardware', { ...project.hardware, nodes: project.hardware.nodes.map((n) => ({ ...n, drives: total })) });
  };
  const save = (patch: Partial<Project['storage']>) => setSection('storage', { ...project.storage, ...patch });
  const updateVolume = (index: number, patch: Partial<Volume>) => save({ volumes: volumes.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const updateLun = (index: number, patch: Partial<Lun>) => save({ sanLuns: sanLuns.map((l, i) => (i === index ? { ...l, ...patch } : l)) });

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Storage</h1>

      <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{architecture === 's2d' ? 'Storage Spaces Direct: local drives pooled by the cluster.' : architecture === 'san' ? 'External SAN (disaggregated): no local storage pool and no storage network to design.' : 'Storage Spaces Direct plus an external SAN, attached after the first deployment.'} Change this under Connectivity mode and architecture.</p>

      {usesS2d(project) && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-800">Drives in each node</h2>
          <p className="text-sm text-gray-600">Every node has the same drives. With one drive type there is no cache; with a faster type for cache (NVMe or SSD in front of HDD or SSD) the cache is configured automatically. A single machine uses one drive type and no cache.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-800">Capacity drives</h3>
              <SelectInput id="cap-media" label="Capacity media" value={driveLayout.capacity.media} options={mediaOptions} onChange={(media) => setLayout({ capacity: { ...driveLayout.capacity, media: media as 'nvme' | 'ssd' | 'hdd' } })} />
              <NumberInput id="cap-count" label="Capacity drives per node" value={driveLayout.capacity.count} onChange={(count) => setLayout({ capacity: { ...driveLayout.capacity, count } })} />
              <TextInput id="cap-size" label="Capacity drive size (TB)" value={String(driveLayout.capacity.sizeTB || '')} hint="Decimal terabytes, for example 3.84." onChange={(v) => setLayout({ capacity: { ...driveLayout.capacity, sizeTB: Number(v) || 0 } })} />
            </div>
            {nodeCount > 1 && (
              <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-800">Cache drives (optional)</h3>
                <SelectInput id="cache-media" label="Cache media" value={driveLayout.cache.media} options={mediaOptions.slice(0, 2)} onChange={(media) => setLayout({ cache: { ...driveLayout.cache, media: media as 'nvme' | 'ssd' | 'hdd' } })} />
                <NumberInput id="cache-count" label="Cache drives per node" value={driveLayout.cache.count} hint="0 for all-flash with one drive type; otherwise at least 2." onChange={(count) => setLayout({ cache: { ...driveLayout.cache, count } })} />
                <TextInput id="cache-size" label="Cache drive size (TB)" value={String(driveLayout.cache.sizeTB || '')} hint="At least 0.032 (32 GB)." onChange={(v) => setLayout({ cache: { ...driveLayout.cache, sizeTB: Number(v) || 0 } })} />
              </div>
            )}
          </div>
          {summary.rawTB > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <h3 className="mb-2 font-medium text-gray-800">Capacity</h3>
              <ul className="space-y-1">
                <li>Raw capacity: {summary.rawTB.toFixed(1)} TB ({summary.rawPerNodeTB.toFixed(1)} TB in each of {summary.nodes} node{summary.nodes === 1 ? '' : 's'}).</li>
                <li>Repair reserve: {summary.reserveTB.toFixed(1)} TB (one capacity drive per node, up to four), left unallocated.</li>
                <li>Available for volumes: {summary.availableTB.toFixed(1)} TB of pool footprint.</li>
                {allowedResiliency(nodeCount).map((r) => (
                  <li key={r}>
                    Usable as {resiliencyLabels[r].toLowerCase()}: about {(summary.availableTB * efficiency(r, nodeCount)).toFixed(1)} TB ({Math.round(efficiency(r, nodeCount) * 1000) / 10}% efficiency).
                  </li>
                ))}
                {volumes.length > 0 && <li>Planned volumes use {summary.footprintTB.toFixed(1)} TB of footprint; {summary.freeTB >= 0 ? `${summary.freeTB.toFixed(1)} TB remains.` : `${Math.abs(summary.freeTB).toFixed(1)} TB too much.`}</li>}
                {driveLayout.cache.count > 0 && <li>Cache is {(summary.cacheToCapacity * 100).toFixed(1)}% of capacity per node.</li>}
              </ul>
            </div>
          )}
          <div className="max-w-xl">
            <SelectInput
              id="config-mode"
              label="Volumes the deployment creates"
              value={project.storage.configurationMode}
              hint="Express creates the infrastructure volume and at least one workload volume per machine; infrastructure only leaves workload volumes for later; existing data drives is for a single machine that already has a Storage Spaces pool."
              options={[
                { value: 'Express', label: 'Infrastructure and workload volumes (recommended)' },
                { value: 'InfraOnly', label: 'Infrastructure volume only' },
                ...(nodeCount === 1 ? [{ value: 'KeepStorage', label: 'Use existing data drives (single machine)' }] : []),
              ]}
              onChange={(v) => save({ configurationMode: v as Project['storage']['configurationMode'] })}
            />
          </div>
        </div>
      )}
      {usesS2d(project) && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-800">Storage Spaces Direct volumes</h2>
          <ul className="space-y-3">
            {volumes.map((volume, index) => (
              <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-gray-200 p-3">
                <TextInput id={`volume-${index}-name`} label={`Volume ${index + 1} name`} value={volume.name} onChange={(name) => updateVolume(index, { name })} />
                <NumberInput id={`volume-${index}-size`} label={`Volume ${index + 1} size (GiB)`} value={volume.sizeGiB} onChange={(sizeGiB) => updateVolume(index, { sizeGiB })} />
                <SelectInput
                  id={`volume-${index}-resiliency`}
                  label={`Volume ${index + 1} resiliency`}
                  value={volume.resiliency}
                  options={[...allowedResiliency(nodeCount), ...(project.hardware.topology === 'rack-aware' ? (['four-way'] as const) : [])].map((r) => ({ value: r, label: resiliencyLabels[r] }))}
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
          <h2 className="text-lg font-medium text-gray-800">SAN LUNs</h2>
          <ul className="space-y-3">
            {sanLuns.map((lun, index) => (
              <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-gray-200 p-3">
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