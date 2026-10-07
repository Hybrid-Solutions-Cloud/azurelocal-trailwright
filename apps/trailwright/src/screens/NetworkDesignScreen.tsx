import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../model/store';
import type { Networking } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';
import { intentsFor, patternFor, portsRequired, storageSubnetsFor } from '../network/patterns';
import { buildIntents, disaggregatedIntents, groupingLabels, groupingSupported, portChoices, standalonePorts, storageKind, disaggregatedPortsNeeded } from '../network/intents';
import { usesS2d } from '../rules/types';
import { TopologyDiagram } from '../components/TopologyDiagram';
import { PortPlanner } from '../components/PortPlanner';

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

      {usesS2d(project) && nodes > 1 && (
        <ChoiceCards name="storage-connectivity" legend="Storage connectivity" value={net.storage} onChange={(v) => update({ storage: v as Networking['storage'] })} choices={storageOptions} />
      )}

      {usesS2d(project) && <ChoiceCards name="tor-switches" legend="Top-of-rack switches" value={String(net.torSwitches)} onChange={(v) => update({ torSwitches: v === '1' ? 1 : 2 })} choices={torOptions} />}

      {usesS2d(project) && nodes === 2 && net.storage === 'switched' && (
        <ChoiceCards name="storage-layout" legend="Storage ports" value={net.storageLayout} onChange={(v) => update({ storageLayout: v as Networking['storageLayout'] })} choices={layoutOptions} />
      )}

      {usesS2d(project) && nodes === 3 && net.storage === 'switchless' && (
        <ChoiceCards name="switchless-links" legend="Links between nodes" value={net.switchlessLinks} onChange={(v) => update({ switchlessLinks: v as Networking['switchlessLinks'] })} choices={linkOptions} />
      )}

      {usesS2d(project) && (
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
      )}

      <ChoiceCards
        name="ports-per-node"
        legend="Network ports per node"
        value={String(net.portsPerNode)}
        onChange={(v) => update({ portsPerNode: Number(v) })}
        choices={portChoices(project).map((n) => ({ value: String(n), label: `${n} ports`, description: n === 2 ? 'All traffic shares two ports. 10 Gbps minimum, 25 GbE or higher recommended.' : n === 4 ? 'Two intents of two ports each.' : n === 6 ? 'Three intents of two ports each.' : 'Adds a second compute or backup intent.' }))}
      />

      {project.deployment.architecture !== 'disaggregated' && (
        <div className="space-y-4">
          <ChoiceCards
            name="intent-grouping"
            legend="Network ATC intents"
            value={net.intentGrouping}
            onChange={(v) => update({ intentGrouping: v as Networking['intentGrouping'] })}
            choices={(Object.keys(groupingLabels) as Networking['intentGrouping'][]).map((g) => ({
              value: g,
              label: groupingLabels[g].label,
              description: groupingLabels[g].description,
              disabled: !groupingSupported(g, storageKind(project)),
              disabledReason: groupingSupported(g, storageKind(project)) ? undefined : 'Needs a physical switch for storage.',
            }))}
          />
          <button type="button" className="action-secondary" onClick={() => update({ intents: buildIntents(net.intentGrouping, net.portsPerNode) })}>
            Build the intents for this grouping
          </button>
        </div>
      )}

      {project.deployment.architecture === 'disaggregated' && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Ports for a disaggregated node</h2>
          <p className="text-sm text-gray-700">
            Network ATC manages only the management and compute intent. The cluster networks (and for iSCSI the dedicated storage paths) run on standalone ports. A node needs {disaggregatedPortsNeeded(project)} Ethernet ports
            {project.deployment.sanType === 'fibre-channel' ? ', plus dual-port Fibre Channel host bus adapters to the SAN fabrics' : ''}.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {disaggregatedIntents(project).map((i) => (
              <li key={i.name}>
                Network ATC intent {i.name}: {i.traffic.join(', ')} on {i.adapters.join(', ')}
              </li>
            ))}
            {standalonePorts(project).map((s) => (
              <li key={s.name}>
                {s.name}: standalone port, VLAN {s.vlan}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4">
            <TextInput id="cluster-subnet-a" label="Cluster network A subnet" value={net.clusterSubnets[0] ?? ''} onChange={(v) => update({ clusterSubnets: [v, net.clusterSubnets[1] ?? ''] })} hint="CIDR, for example 10.10.100.0/24. No default gateway on this port." />
            <TextInput id="cluster-subnet-b" label="Cluster network B subnet" value={net.clusterSubnets[1] ?? ''} onChange={(v) => update({ clusterSubnets: [net.clusterSubnets[0] ?? '', v] })} hint="CIDR, for example 10.10.101.0/24." />
          </div>
          <div className="flex items-start gap-3">
            <input id="backup-network" type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={net.backupNetwork} onChange={(e) => update({ backupNetwork: e.target.checked })} />
            <label htmlFor="backup-network" className="text-sm text-gray-700">
              Dedicated guest backup network
              <span className="block text-xs text-gray-500">Fibre Channel: the six-port layout adds a guest backup intent. iSCSI: optional, a backup vNIC on the management and compute switch.</span>
            </label>
          </div>
          <button type="button" className="action-secondary" onClick={() => update({ intents: disaggregatedIntents(project), portsPerNode: Math.max(net.portsPerNode, disaggregatedPortsNeeded(project)) })}>
            Use these intents and ports
          </button>
        </div>
      )}
      <PortPlanner />
      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">Cabling diagram</h2>
        <TopologyDiagram />
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

      <FindingsPanel prefixes={['networking.storage', 'networking.portsPerNode', 'networking.storageAutoIp', 'networking.storageSubnets', 'networking.torSwitches', 'networking.cards', 'networking.fcHbaPorts', 'networking.intentGrouping', 'networking.clusterSubnets']} />
    </section>
  );
};