import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Networking } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, SelectInput, TextInput } from '../components/Field';

const storageOptions = [
  { value: 'switched', label: 'Switched' },
  { value: 'switchless', label: 'Switchless' },
];

const trafficTypes = ['management', 'compute', 'storage'] as const;
type Traffic = (typeof trafficTypes)[number];

const buttonClass = 'mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700';
const removeClass = 'text-sm font-medium text-red-700 hover:underline';

export const NetworkingScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const net = project.networking;
  const update = (patch: Partial<Networking>) => setSection('networking', { ...net, ...patch });

  // The two default storage VLANs of Network ATC are 711 and 712.
  const addVlan = () => update({ vlans: [...net.vlans, { name: `vlan${net.vlans.length + 1}`, id: [711, 712][net.vlans.length] ?? 100 }] });
  const updateVlan = (i: number, patch: Partial<Networking['vlans'][number]>) => update({ vlans: net.vlans.map((v, k) => (k === i ? { ...v, ...patch } : v)) });
  const removeVlan = (i: number) => update({ vlans: net.vlans.filter((_, k) => k !== i) });

  const addIntent = () => update({ intents: [...net.intents, { name: `intent${net.intents.length + 1}`, traffic: [], adapters: [] }] });
  const updateIntent = (i: number, patch: Partial<Networking['intents'][number]>) => update({ intents: net.intents.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
  const removeIntent = (i: number) => update({ intents: net.intents.filter((_, k) => k !== i) });
  const toggleTraffic = (i: number, type: Traffic) =>
    update({
      intents: net.intents.map((x, k) => (k !== i ? x : { ...x, traffic: x.traffic.includes(type) ? x.traffic.filter((t) => t !== type) : [...x.traffic, type] })),
    });

  const addRange = () => update({ ipPlan: [...net.ipPlan, { name: `range${net.ipPlan.length + 1}`, cidr: '' }] });
  const updateRange = (i: number, patch: Partial<Networking['ipPlan'][number]>) => update({ ipPlan: net.ipPlan.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const removeRange = (i: number) => update({ ipPlan: net.ipPlan.filter((_, k) => k !== i) });

  return (
    <section className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Networking</h1>

      <SelectInput id="storage" label="Storage connectivity" value={net.storage} onChange={(v) => update({ storage: v as Networking['storage'] })} options={storageOptions} />

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-800">VLANs</h2>
        <ul className="space-y-3">
          {net.vlans.map((vlan, i) => (
            <li key={i} className="flex flex-wrap items-end gap-4">
              <TextInput id={`vlan-${i}-name`} label={`VLAN ${i + 1} name`} value={vlan.name} onChange={(name) => updateVlan(i, { name })} />
              <NumberInput id={`vlan-${i}-id`} label={`VLAN ${i + 1} ID`} value={vlan.id} onChange={(id) => updateVlan(i, { id })} />
              <button type="button" onClick={() => removeVlan(i)} className={removeClass}>
                Remove VLAN {i + 1}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addVlan} className={buttonClass}>
          Add VLAN
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-800">Network ATC intents</h2>
        <ul className="space-y-4">
          {net.intents.map((intent, i) => (
            <li key={i} className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-end gap-4">
                <TextInput id={`intent-${i}-name`} label={`Intent ${i + 1} name`} value={intent.name} onChange={(name) => updateIntent(i, { name })} />
                <TextInput
                  id={`intent-${i}-adapters`}
                  label={`Intent ${i + 1} adapters`}
                  value={intent.adapters.join(', ')}
                  hint="Comma-separated list"
                  onChange={(value) => updateIntent(i, { adapters: value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
                <button type="button" onClick={() => removeIntent(i)} className={removeClass}>
                  Remove intent {i + 1}
                </button>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Traffic types of intent {i + 1}</legend>
                <div className="flex gap-6">
                  {trafficTypes.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        id={`intent-${i}-traffic-${type}`}
                        type="checkbox"
                        checked={intent.traffic.includes(type)}
                        onChange={() => toggleTraffic(i, type)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label htmlFor={`intent-${i}-traffic-${type}`} className="text-sm capitalize text-slate-700">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addIntent} className={buttonClass}>
          Add intent
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-800">IP plan</h2>
        <ul className="space-y-3">
          {net.ipPlan.map((range, i) => (
            <li key={i} className="flex flex-wrap items-end gap-4">
              <TextInput id={`ip-${i}-name`} label={`Range ${i + 1} name`} value={range.name} onChange={(name) => updateRange(i, { name })} />
              <TextInput id={`ip-${i}-cidr`} label={`Range ${i + 1} CIDR`} value={range.cidr} onChange={(cidr) => updateRange(i, { cidr })} />
              <button type="button" onClick={() => removeRange(i)} className={removeClass}>
                Remove range {i + 1}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addRange} className={buttonClass}>
          Add IP range
        </button>
      </div>

      <FindingsPanel prefixes={['networking']} />
    </section>
  );
};