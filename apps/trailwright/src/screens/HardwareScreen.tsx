import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Hardware } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, SelectInput, TextInput } from '../components/Field';

const topologyOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'rack-aware', label: 'Rack-aware' },
];

const witnessOptions = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'file-share', label: 'File share' },
  { value: 'none', label: 'None' },
];

type Node = Hardware['nodes'][number];

export const HardwareScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const hardware = project.hardware;

  const update = (patch: Partial<Hardware>) => setSection('hardware', { ...hardware, ...patch });
  const updateNode = (index: number, patch: Partial<Node>) => update({ nodes: hardware.nodes.map((n, i) => (i === index ? { ...n, ...patch } : n)) });
  const removeNode = (index: number) => update({ nodes: hardware.nodes.filter((_, i) => i !== index) });
  const addNode = () =>
    update({ nodes: [...hardware.nodes, { name: `node${hardware.nodes.length + 1}`, serial: '', cores: 32, memoryGiB: 256, drives: 8 }] });

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Hardware and topology</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <SelectInput id="topology" label="Topology" value={hardware.topology} onChange={(v) => update({ topology: v as Hardware['topology'] })} options={topologyOptions} />
        <SelectInput id="witness" label="Witness" value={hardware.witness} onChange={(v) => update({ witness: v as Hardware['witness'] })} options={witnessOptions} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-800">Nodes</h2>
        <ul className="space-y-3">
          {hardware.nodes.map((node, index) => (
            <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-slate-200 p-3">
              <TextInput id={`node-${index}-name`} label={`Node ${index + 1} name`} value={node.name} onChange={(name) => updateNode(index, { name })} />
              <TextInput id={`node-${index}-serial`} label={`Node ${index + 1} serial`} value={node.serial ?? ''} onChange={(serial) => updateNode(index, { serial })} />
              <NumberInput id={`node-${index}-cores`} label={`Node ${index + 1} cores`} value={node.cores} onChange={(cores) => updateNode(index, { cores })} />
              <NumberInput id={`node-${index}-memory`} label={`Node ${index + 1} memory (GiB)`} value={node.memoryGiB} onChange={(memoryGiB) => updateNode(index, { memoryGiB })} />
              <NumberInput id={`node-${index}-drives`} label={`Node ${index + 1} drives`} value={node.drives} onChange={(drives) => updateNode(index, { drives })} />
              <button type="button" onClick={() => removeNode(index)} className="text-sm font-medium text-red-700 hover:underline">
                Remove node {index + 1}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addNode} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add node
        </button>
      </div>

      <FindingsPanel prefixes={['hardware']} />
    </section>
  );
};