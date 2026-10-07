import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Networking } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { CheckInput, NumberInput, SelectInput, TextInput } from '../components/Field';
import { usesS2d } from '../rules/types';
import { makeIntent } from '../model/defaults';


const trafficTypes = ['management', 'compute', 'storage'] as const;
type Traffic = (typeof trafficTypes)[number];

const buttonClass = 'action mt-3';
const removeClass = 'text-sm font-medium text-red-700 hover:underline';

export const NetworkingScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const net = project.networking;
  const update = (patch: Partial<Networking>) => setSection('networking', { ...net, ...patch });

  // The two default storage VLANs of Network ATC are 711 and 712.
  const addVlan = () => update({ vlans: [...net.vlans, { name: `vlan${net.vlans.length + 1}`, id: [711, 712][net.vlans.length] ?? 100 }] });
  const updateVlan = (i: number, patch: Partial<Networking['vlans'][number]>) => update({ vlans: net.vlans.map((v, k) => (k === i ? { ...v, ...patch } : v)) });
  const removeVlan = (i: number) => update({ vlans: net.vlans.filter((_, k) => k !== i) });

  const addIntent = () => update({ intents: [...net.intents, makeIntent({ name: `intent${net.intents.length + 1}`, traffic: [], adapters: [] })] });
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
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Networking</h1>


      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">VLANs</h2>
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

      {usesS2d(project) && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-gray-800">Storage VLANs</h2>
          <p className="mb-3 text-sm text-gray-600">One VLAN per storage network, as the deployment template expects (defaults 711 and 712). Each storage network carries its own VLAN on the storage adapters.</p>
          <div className="flex flex-wrap gap-4">
            {net.storageVlans.map((id, k) => (
              <NumberInput key={k} id={`storage-vlan-${k}`} label={`Storage network ${k + 1} VLAN`} value={id} onChange={(value) => update({ storageVlans: net.storageVlans.map((x, j) => (j === k ? value : x)) })} />
            ))}
          </div>
          <button type="button" onClick={() => update({ storageVlans: [...net.storageVlans, (net.storageVlans[net.storageVlans.length - 1] ?? 711) + 1] })} className={buttonClass}>Add storage VLAN</button>
          {net.storageVlans.length > 2 && (
            <button type="button" onClick={() => update({ storageVlans: net.storageVlans.slice(0, -1) })} className={`${removeClass} ml-4`}>Remove last storage VLAN</button>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">Network ATC intents</h2>        <ul className="space-y-4">
          {net.intents.map((intent, i) => (
            <li key={i} className="rounded-md border border-gray-200 p-4">
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
                <legend className="mb-2 text-sm font-medium text-gray-700">Traffic types of intent {i + 1}</legend>
                <div className="flex gap-6">
                  {trafficTypes.filter((type) => type !== 'storage' || usesS2d(project)).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <input
                        id={`intent-${i}-traffic-${type}`}
                        type="checkbox"
                        checked={intent.traffic.includes(type)}
                        onChange={() => toggleTraffic(i, type)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={`intent-${i}-traffic-${type}`} className="text-sm capitalize text-gray-700">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">Advanced overrides for intent {i + 1} (leave off unless your hardware vendor says otherwise)</summary>
                <div className="mt-3 space-y-4">
                  {intent.traffic.includes('storage') && (
                    <div className="space-y-2">
                      <CheckInput id={`intent-${i}-override-qos`} label={`Override QoS policy for intent ${i + 1}`} checked={intent.overrideQos} onChange={(overrideQos) => updateIntent(i, { overrideQos })} hint="Defaults: cluster priority 7, SMB priority 3, SMB bandwidth 50%. Change only on OEM guidance." />
                      {intent.overrideQos && (
                        <div className="flex flex-wrap gap-4">
                          <TextInput id={`intent-${i}-qos-cluster`} label="Cluster priority" value={intent.qosClusterPriority} onChange={(qosClusterPriority) => updateIntent(i, { qosClusterPriority })} />
                          <TextInput id={`intent-${i}-qos-smb`} label="SMB priority" value={intent.qosSmbPriority} onChange={(qosSmbPriority) => updateIntent(i, { qosSmbPriority })} />
                          <TextInput id={`intent-${i}-qos-bw`} label="SMB bandwidth percentage" value={intent.qosSmbBandwidth} onChange={(qosSmbBandwidth) => updateIntent(i, { qosSmbBandwidth })} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <CheckInput id={`intent-${i}-override-adapter`} label={`Override adapter properties for intent ${i + 1}`} checked={intent.overrideAdapter} onChange={(overrideAdapter) => updateIntent(i, { overrideAdapter })} hint="Jumbo packet size and RDMA (NetworkDirect)." />
                    {intent.overrideAdapter && (
                      <div className="flex flex-wrap gap-4">
                        <SelectInput id={`intent-${i}-jumbo`} label="Jumbo packet" value={intent.jumboPacket} onChange={(jumboPacket) => updateIntent(i, { jumboPacket: jumboPacket as typeof intent.jumboPacket })} options={[{ value: '1514', label: '1514 (standard)' }, { value: '4088', label: '4088' }, { value: '9014', label: '9014 (jumbo)' }]} />
                        <SelectInput id={`intent-${i}-nd`} label="NetworkDirect (RDMA)" value={intent.networkDirect} onChange={(networkDirect) => updateIntent(i, { networkDirect: networkDirect as typeof intent.networkDirect })} options={[{ value: 'Enabled', label: 'Enabled' }, { value: 'Disabled', label: 'Disabled' }]} />
                        {intent.networkDirect === 'Enabled' && (
                          <SelectInput id={`intent-${i}-ndt`} label="RDMA technology" value={intent.networkDirectTechnology} onChange={(networkDirectTechnology) => updateIntent(i, { networkDirectTechnology: networkDirectTechnology as typeof intent.networkDirectTechnology })} options={[{ value: 'iWARP', label: 'iWARP' }, { value: 'RoCE', label: 'RoCE' }, { value: 'RoCEv2', label: 'RoCEv2' }]} />
                        )}
                      </div>
                    )}
                  </div>
                  {intent.traffic.includes('compute') && (
                    <div className="space-y-2">
                      <CheckInput id={`intent-${i}-override-vswitch`} label={`Override virtual switch for intent ${i + 1}`} checked={intent.overrideVSwitch} onChange={(overrideVSwitch) => updateIntent(i, { overrideVSwitch })} hint="SR-IOV and the SET load balancing algorithm." />
                      {intent.overrideVSwitch && (
                        <div className="flex flex-wrap gap-4">
                          <SelectInput id={`intent-${i}-iov`} label="SR-IOV (enableIov)" value={intent.enableIov} onChange={(enableIov) => updateIntent(i, { enableIov: enableIov as typeof intent.enableIov })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
                          <SelectInput id={`intent-${i}-lb`} label="Load balancing algorithm" value={intent.loadBalancingAlgorithm} onChange={(loadBalancingAlgorithm) => updateIntent(i, { loadBalancingAlgorithm: loadBalancingAlgorithm as typeof intent.loadBalancingAlgorithm })} options={[{ value: 'Dynamic', label: 'Dynamic' }, { value: 'HyperVPort', label: 'Hyper-V port' }]} hint="SET supports only these two (switch independent)." />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addIntent} className={buttonClass}>
          Add intent
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">IP plan</h2>
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

      <FindingsPanel prefixes={['networking.intents', 'networking.vlans', 'networking.ipPlan', 'networking.storageVlans']} />
    </section>
  );
};