import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../model/store';
import type { Networking } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { NumberInput, TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';
import { intentsFor, patternFor, portsRequired, storageSubnetsFor } from '../network/patterns';

const storageOptions = [
  { value: 'switched', label: 'Storage switched', description: 'Storage traffic goes through the top-of-rack switches. Nodes can be added later.' },
  { value: 'switchless', label: 'Storage switchless', description: 'Nodes connect directly to each other for storage. 2, 3 or 4 nodes; no scale-out.' },
];

const torOptions = [
  { value: '1', label: 'One TOR switch', description: 'Single switch for north-south traffic. Documented for one and two nodes.' },
  { value: '2', label: 'Two TOR switches', description: 'Two switches in a multi-chassis link aggregation (MLAG) configuration.' },
];

const layoutOptions = [
  { value: 'dedicated', label: 'Dedicated storage ports', description: 'Management and compute on two ports, storage on its own ports (non-converged).' },
  { value: 'converged', label: 'Fully converged', description: 'Management, compute and storage share two teamed ports. Needs QoS tuning.' },
];

const linkOptions = [
  { value: 'single', label: 'Single link', description: 'One link between each pair of nodes. No redundant connection between nodes.' },
  { value: 'dual', label: 'Dual link', description: 'Two links between each pair of nodes, for redundancy.' },
];

export const NetworkDesignScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const net = project.networking;
  const nodes = project.hardware.nodes.length;
  const pattern = patternFor(project);
  const update = (patch: Partial<Networking>) => setSection('networking', { ...net, ...patch });

  const applyReference = () => {
    if (!pattern) return;
    const subnets = storageSubnetsFor(pattern);
    update({
      intents: intentsFor(pattern),
      portsPerNode: Math.max(net.portsPerNode, portsRequired(pattern)),
      storageAutoIp: pattern.storageSubnets === 0,
      storageSubnets: subnets.length ? subnets : net.storageSubnets,
    });
  };

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Network design</h1>
      <p className="text-sm text-gray-600">
        The design has {nodes} node{nodes === 1 ? '' : 's'} (set on <Link className="text-brand-700 underline" to="/hardware">Hardware and topology</Link>). The choices below select one of the Microsoft network reference patterns.
      </p>

      {nodes > 1 && (
        <ChoiceCards name="storage-connectivity" legend="Storage connectivity" value={net.storage} onChange={(v) => update({ storage: v as Networking['storage'] })} choices={storageOptions} />
      )}

      <ChoiceCards name="tor-switches" legend="Top-of-rack switches" value={String(net.torSwitches)} onChange={(v) => update({ torSwitches: v === '1' ? 1 : 2 })} choices={torOptions} />

      {nodes === 2 && net.storage === 'switched' && (
        <ChoiceCards name="storage-layout" legend="Storage ports" value={net.storageLayout} onChange={(v) => update({ storageLayout: v as Networking['storageLayout'] })} choices={layoutOptions} />
      )}

      {nodes === 3 && net.storage === 'switchless' && (
        <ChoiceCards name="switchless-links" legend="Links between nodes" value={net.switchlessLinks} onChange={(v) => update({ switchlessLinks: v as Networking['switchlessLinks'] })} choices={linkOptions} />
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-lg font-medium text-gray-800">Reference pattern</h2>
        {pattern ? (
          <div className="mt-2 space-y-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{pattern.title}</p>
            <p>
              Ports per node: {pattern.ports.management} for management and compute{pattern.ports.storage ? `, ${pattern.ports.storage} for storage` : ', none for storage'} ({portsRequired(pattern)} in total).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {intentsFor(pattern).map((i) => (
                <li key={i.name}>
                  Intent {i.name}: {i.traffic.join(', ')} on {i.adapters.join(', ')}
                </li>
              ))}
              {pattern.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p>
              <a href={pattern.learnUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                Microsoft Learn: {pattern.title}
              </a>
            </p>
            <button type="button" className="action" onClick={applyReference}>
              Use this pattern&rsquo;s intents and ports
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-700">No Microsoft reference pattern describes this combination. See the findings below for what is documented.</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <NumberInput id="ports-per-node" label="Network ports per node" value={net.portsPerNode} hint="Physical Ethernet ports you will use for management, compute and storage." onChange={(portsPerNode) => update({ portsPerNode })} />
      </div>

      {pattern && pattern.storageSubnets > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-800">Storage IP addressing</h2>
          <p className="text-sm text-gray-600">This pattern needs StorageAutoIP off. List one subnet per node-to-node link ({pattern.storageSubnets}). They share a single storage VLAN.</p>
          <TextInput
            id="storage-subnets"
            label="Storage subnets"
            value={net.storageSubnets.join(', ')}
            hint="Comma-separated CIDR ranges, for example 10.0.1.0/24, 10.0.2.0/24."
            onChange={(value) => update({ storageSubnets: value.split(',').map((s) => s.trim()).filter(Boolean), storageAutoIp: false })}
          />
        </div>
      )}

      <FindingsPanel prefixes={['networking.storage', 'networking.portsPerNode', 'networking.storageAutoIp', 'networking.storageSubnets', 'networking.torSwitches']} />
    </section>
  );
};