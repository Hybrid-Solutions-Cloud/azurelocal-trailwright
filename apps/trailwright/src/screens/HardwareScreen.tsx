import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Hardware } from '../model/schema';
import { usesS2d } from '../rules/types';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, TextInput } from '../components/Field';
import { ChoiceCards } from '../components/ChoiceCards';

const topologyOptions = [
  { value: 'standard', label: 'Single rack', description: 'All nodes and a pair of top-of-rack switches in one rack, up to 16 nodes.' },
  { value: 'rack-aware', label: 'Rack-aware (two rooms)', description: 'An even number of nodes, up to 8, split across two rooms or zones with less than 1 ms between them.' },
];

const uplinkOptions = [
  { value: 'dedicated-storage', label: 'Dedicated storage links', description: 'Two ToR switches per room (four in total). Storage links TOR1 to TOR3 on VLAN 711 and TOR2 to TOR4 on VLAN 712. Lowest latency.' },
  { value: 'aggregated-storage', label: 'Aggregated storage links', description: 'Two ToR switches per room. Storage over LAG or vPC across rooms; possible extra hop and RDMA latency.' },
  { value: 'per-room', label: 'Per-room node connectivity', description: 'One ToR switch per room, both storage networks on it, with a bundled link between rooms.' },
  { value: 'cross-room', label: 'Cross-room node connectivity', description: 'One ToR switch per room, each node cabled to both rooms. Less ToR-to-ToR dependency, more cabling.' },
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
    update({ nodes: [...hardware.nodes, { name: `node${hardware.nodes.length + 1}`, ip: '', serial: '', cores: 32, memoryGiB: 256, drives: 8 }] });

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Hardware and topology</h1>
      <div className="space-y-6">
        {project.deployment.architecture === 'disaggregated' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <NumberInput id="racks" label="Racks (1 to 8)" value={hardware.racks} hint="Up to 16 nodes per rack and 64 per cluster. More than one rack uses a leaf-spine fabric." onChange={(racks) => update({ racks: Math.min(8, Math.max(1, racks)) })} />
          </div>
        ) : (
          <ChoiceCards name="topology" legend="Cluster topology" value={hardware.topology} onChange={(v) => update({ topology: v as Hardware['topology'] })} choices={project.deployment.architecture === 'hybrid' ? topologyOptions.slice(0, 1) : topologyOptions} />
        )}
        {hardware.topology === 'rack-aware' && project.deployment.architecture === 'hyperconverged' && (
          <ChoiceCards name="rack-uplink" legend="Rack-aware uplinks" value={hardware.rackAwareUplink} onChange={(v) => update({ rackAwareUplink: v as Hardware['rackAwareUplink'] })} choices={uplinkOptions} />
        )}
        <ChoiceCards name="witness" legend="Witness" value={hardware.witness} onChange={(v) => update({ witness: v as Hardware['witness'] })} choices={project.deployment.mode === 'disconnected' ? [...witnessOptions.slice(0, 1), fileShareOption, ...witnessOptions.slice(1)] : witnessOptions} />
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