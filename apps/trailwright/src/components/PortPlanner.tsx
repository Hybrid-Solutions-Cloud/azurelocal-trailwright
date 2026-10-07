import { useState, type FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { allPorts, assignedCount, intentsFromRoles, neededGroups, presetCards, proposeRoles, speeds, type Card, type Port } from '../network/ports';

const rdmaOptions: Port['rdma'][] = ['none', 'iWARP', 'RoCE', 'RoCEv2'];

const roleLabel = (role: string): string => {
  const [kind, rest] = role.split(':');
  if (kind === 'unused') return 'Not used';
  if (kind === 'intent') return `Intent ${rest}`;
  if (kind === 'cluster') return `Cluster network ${rest}`;
  if (kind === 'iscsi') return `iSCSI path ${rest?.toUpperCase()}`;
  return role;
};

// Step one: name the physical cards and ports exactly as the operating system shows them. Step two: give every port a role.
export const PortPlanner: FC = () => {
  const { project, setSection } = useProjectStore();
  const net = project.networking;
  const [dragging, setDragging] = useState<string | null>(null);

  // Every change to the cards also rebuilds the intents and the port count from the roles.
  const commit = (cards: Card[]) => {
    const next: Project = { ...project, networking: { ...net, cards } };
    const intents = cards.some((c) => c.ports.some((p) => p.role.startsWith('intent:'))) ? intentsFromRoles(next) : net.intents;
    setSection('networking', { ...net, cards, intents, portsPerNode: Math.max(1, assignedCount(next)) || net.portsPerNode });
  };
  const setCard = (ci: number, patch: Partial<Card>) => commit(net.cards.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  const setPort = (ci: number, pi: number, patch: Partial<Port>) => setCard(ci, { ports: net.cards[ci].ports.map((p, i) => (i === pi ? { ...p, ...patch } : p)) });

  const groups = neededGroups(project);
  const roles = ['unused', ...Array.from(new Set(groups.flatMap((g) => g.roles)))];
  const ports = allPorts(project);

  const drop = (role: string, key: string | null) => {
    if (!key) return;
    const [ci, pi] = key.split(':').map(Number);
    setPort(ci, pi, { role });
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">1. Network adapters in each node</h2>
        <p className="text-sm text-gray-600">
          Describe the physical cards as the operating system names them. Use the same names on every node: the deployment template refers to adapters by name. Ports of one team must be identical (same make, model and speed).
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ['1 card, 2 ports', 1, 2],
            ['2 cards, 2 ports each', 2, 2],
            ['3 cards, 2 ports each', 3, 2],
            ['2 cards, 4 ports each', 2, 4],
            ['1 card, 4 ports', 1, 4],
          ].map(([label, c, p]) => (
            <button key={label as string} type="button" className="action-secondary" onClick={() => commit(presetCards(c as number, p as number, 25, 'RoCEv2'))}>
              {label as string}
            </button>
          ))}
          <button type="button" className="action-secondary" onClick={() => commit([...net.cards, ...presetCards(1, 2, 25, 'RoCEv2').map((c) => ({ ...c, label: `NIC ${net.cards.length + 1}`, ports: c.ports.map((pt, i) => ({ ...pt, osName: `NIC${net.cards.length + 1}-P${i + 1}` })) }))])}>
            Add a card
          </button>
        </div>
        {net.cards.map((card, ci) => (
          <div key={ci} className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-xs text-gray-500">
                Card {ci + 1} label
                <input aria-label={`Card ${ci + 1} label`} className="input mt-1" value={card.label} onChange={(e) => setCard(ci, { label: e.target.value })} />
              </label>
              <label className="text-xs text-gray-500">
                Card {ci + 1} make
                <input aria-label={`Card ${ci + 1} make`} className="input mt-1" value={card.make} onChange={(e) => setCard(ci, { make: e.target.value })} />
              </label>
              <label className="text-xs text-gray-500">
                Card {ci + 1} model
                <input aria-label={`Card ${ci + 1} model`} className="input mt-1" value={card.model} onChange={(e) => setCard(ci, { model: e.target.value })} />
              </label>
              <div className="flex items-end gap-2">
                <button type="button" className="action-secondary" onClick={() => setCard(ci, { ports: [...card.ports, { osName: `${card.label.replace(/\s+/g, '')}-P${card.ports.length + 1}`, speedGbps: card.ports[0]?.speedGbps ?? 25, rdma: card.ports[0]?.rdma ?? 'none', role: 'unused' }] })}>
                  Add port
                </button>
                <button type="button" className="text-sm font-medium text-red-700 hover:underline" onClick={() => commit(net.cards.filter((_, i) => i !== ci))}>
                  Remove card {ci + 1}
                </button>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="py-1 pr-3">Port</th>
                  <th className="py-1 pr-3">Name in the operating system</th>
                  <th className="py-1 pr-3">Speed</th>
                  <th className="py-1">RDMA</th>
                </tr>
              </thead>
              <tbody>
                {card.ports.map((pt, pi) => (
                  <tr key={pi} className="border-b border-gray-100">
                    <td className="py-1 pr-3">{pi + 1}</td>
                    <td className="py-1 pr-3">
                      <input aria-label={`Card ${ci + 1} port ${pi + 1} name`} className="input" value={pt.osName} onChange={(e) => setPort(ci, pi, { osName: e.target.value })} />
                    </td>
                    <td className="py-1 pr-3">
                      <select aria-label={`Card ${ci + 1} port ${pi + 1} speed`} className="input" value={pt.speedGbps} onChange={(e) => setPort(ci, pi, { speedGbps: Number(e.target.value) })}>
                        {speeds.map((s) => (
                          <option key={s} value={s}>
                            {s} Gbps
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <select aria-label={`Card ${ci + 1} port ${pi + 1} RDMA`} className="input" value={pt.rdma} onChange={(e) => setPort(ci, pi, { rdma: e.target.value as Port['rdma'] })}>
                        {rdmaOptions.map((r) => (
                          <option key={r} value={r}>
                            {r === 'none' ? 'No RDMA' : r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {ports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-800">2. Give each port a role</h2>
          <p className="text-sm text-gray-600">Drag a port to a role, or choose the role from its list. The intents below follow the roles.</p>
          <button type="button" className="action" onClick={() => commit(proposeRoles(project))}>
            Propose an assignment (pairs spread across cards)
          </button>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role}
                role="group"
                aria-label={`Role ${roleLabel(role)}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(role, e.dataTransfer.getData('text/plain') || dragging);
                }}
                className={`min-h-24 rounded-lg border p-3 ${role === 'unused' ? 'border-dashed border-gray-300 bg-gray-50' : 'border-brand-200 bg-brand-50'}`}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{roleLabel(role)}</p>
                <div className="flex flex-wrap gap-2">
                  {ports
                    .filter((x) => x.ref.role === role)
                    .map((x) => (
                      <span
                        key={`${x.card}:${x.port}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', `${x.card}:${x.port}`);
                          setDragging(`${x.card}:${x.port}`);
                        }}
                        className="cursor-grab rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm"
                      >
                        {x.ref.osName}
                        <span className="ml-1 text-gray-400">{x.ref.speedGbps}G</span>
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {ports.map((x) => (
              <label key={`${x.card}:${x.port}`} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                <span>{x.ref.osName || `Card ${x.card + 1} port ${x.port + 1}`}</span>
                <select aria-label={`Role of ${x.ref.osName}`} className="input max-w-xs" value={roles.includes(x.ref.role) ? x.ref.role : 'unused'} onChange={(e) => setPort(x.card, x.port, { role: e.target.value })}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};