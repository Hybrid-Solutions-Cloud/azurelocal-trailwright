import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Hardware } from '../model/schema';
import { usesS2d } from '../rules/types';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, TextInput } from '../components/Field';
import { ChoiceCards } from '../components/ChoiceCards';

const topologyOptions = [
  { value: 'standard', label: 'Standard', description: 'One cluster in one location.' },
  { value: 'rack-aware', label: 'Rack-aware', description: 'Two zones, 2, 4, 6 or 8 nodes, dedicated storage intent.' },
];

const witnessOptions = [
  { value: 'cloud', label: 'Cloud witness', description: 'An Azure storage account holds the vote. Required for two nodes and for rack-aware.' },
  { value: 'none', label: 'No witness', description: 'Not needed from five nodes. Required for two nodes, strongly recommended for three and four.' },
];

const fileShareOption = { value: 'file-share', label: 'File share witness', description: 'An SMB share on a server outside the cluster. Required for rack-aware disconnected operations.' };

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
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Hardware and topology</h1>
      <div className="space-y-6">
        <ChoiceCards name="topology" legend="Topology" value={hardware.topology} onChange={(v) => update({ topology: v as Hardware['topology'] })} choices={topologyOptions} />
        <ChoiceCards name="witness" legend="Witness" value={hardware.witness} onChange={(v) => update({ witness: v as Hardware['witness'] })} choices={project.deployment.type === 'disconnected' ? [...witnessOptions.slice(0, 1), fileShareOption, ...witnessOptions.slice(1)] : witnessOptions} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">Nodes</h2>
        <ul className="space-y-3">
          {hardware.nodes.map((node, index) => (
            <li key={index} className="flex flex-wrap items-end gap-4 rounded-md border border-gray-200 p-3">
              <TextInput id={`node-${index}-name`} label={`Node ${index + 1} name`} value={node.name} onChange={(name) => updateNode(index, { name })} />
              <TextInput id={`node-${index}-serial`} label={`Node ${index + 1} serial`} value={node.serial ?? ''} onChange={(serial) => updateNode(index, { serial })} />
              <NumberInput id={`node-${index}-cores`} label={`Node ${index + 1} cores`} value={node.cores} onChange={(cores) => updateNode(index, { cores })} />
              <NumberInput id={`node-${index}-memory`} label={`Node ${index + 1} memory (GiB)`} value={node.memoryGiB} onChange={(memoryGiB) => updateNode(index, { memoryGiB })} />
              {usesS2d(project) && <NumberInput id={`node-${index}-drives`} label={`Node ${index + 1} drives`} value={node.drives} onChange={(drives) => updateNode(index, { drives })} />}
              <button type="button" onClick={() => removeNode(index)} className="text-sm font-medium text-red-700 hover:underline">
                Remove node {index + 1}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addNode} className="action mt-4">
          Add node
        </button>
      </div>

      <FindingsPanel prefixes={['hardware']} />
    </section>
  );
};