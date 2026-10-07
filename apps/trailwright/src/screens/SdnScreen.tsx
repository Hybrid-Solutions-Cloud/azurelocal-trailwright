import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { CheckInput, NumberInput, SelectInput, TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';
import { ncAddress } from '../rules/sdn';

type Lnet = Project['sdn']['logicalNetworks'][number];

export const SdnScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const sdn = project.sdn;
  const da = project.deployment.architecture === 'disaggregated';
  const update = (patch: Partial<Project['sdn']>) => setSection('sdn', { ...sdn, ...patch });
  const updateLnet = (i: number, patch: Partial<Lnet>) => update({ logicalNetworks: sdn.logicalNetworks.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const nc = ncAddress(project.infrastructure.startIp);

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Software defined networking</h1>
      <p className="text-sm text-gray-600">
        {da
          ? 'Disaggregated deployments do not use the Microsoft SDN Network Controller. Logical networks are provisioned on the leaf-spine fabric with a VXLAN EVPN overlay.'
          : 'SDN is optional and applies after deployment. On Azure Local it is enabled by Azure Arc and covers logical networks and network security groups only; virtual networks, software load balancers and gateways are not supported. You cannot disable it once it is enabled.'}
      </p>
      <CheckInput id="sdn-enabled" label={da ? 'My workloads need logical networks on the fabric' : 'Enable SDN (logical networks and network security groups)'} checked={sdn.enabled} onChange={(enabled) => update({ enabled })} />
      {sdn.enabled && !da && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <TextInput id="sdn-prefix" label="SDN prefix" value={sdn.prefix} onChange={(prefix) => update({ prefix })} hint="One to eight characters; letters, numbers and single hyphens. The Network Controller REST name is <prefix>-NC." />
            <SelectInput id="sdn-dns" label="DNS records" value={sdn.dnsRecords} onChange={(dnsRecords) => update({ dnsRecords: dnsRecords as typeof sdn.dnsRecords })} options={[{ value: 'dynamic', label: 'Active Directory integrated dynamic DNS (created for me)' }, { value: 'static', label: 'Static: I create the A record first' }]} />
          </div>
          {sdn.dnsRecords === 'static' && <p className="text-sm text-gray-700">Create the A record <code>{sdn.prefix || '<prefix>'}-NC</code>{nc ? <> pointing to <code>{nc}</code>, the fifth address of the infrastructure range</> : null} before enabling SDN.</p>}
          <CheckInput id="sdn-policy" label="Attach a default network access policy to new VMs" checked={sdn.defaultAccessPolicy} onChange={(defaultAccessPolicy) => update({ defaultAccessPolicy })} hint="Blocks all inbound traffic to the VM except the management ports you allow, and allows all outbound traffic." />
        </div>
      )}
      {sdn.enabled && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-800">Logical networks</h2>
          <p className="text-sm text-gray-600">Each logical network is backed by a VLAN. The VLANs are added to the switch port plan and the VLAN schedule{da ? ' (with their VNIs)' : ''}.</p>
          <ul className="space-y-3">
            {sdn.logicalNetworks.map((l, i) => (
              <li key={i} className="space-y-3 rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap items-end gap-4">
                  <TextInput id={`lnet-${i}-name`} label={`Logical network ${i + 1} name`} value={l.name} onChange={(name) => updateLnet(i, { name })} />
                  <NumberInput id={`lnet-${i}-vlan`} label="VLAN" value={l.vlan} onChange={(vlan) => updateLnet(i, { vlan })} />
                  <TextInput id={`lnet-${i}-prefix`} label="Address prefix (CIDR)" value={l.addressPrefix} onChange={(addressPrefix) => updateLnet(i, { addressPrefix })} />
                  <TextInput id={`lnet-${i}-gw`} label="Default gateway" value={l.gateway} onChange={(gateway) => updateLnet(i, { gateway })} />
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <TextInput id={`lnet-${i}-dns`} label="DNS servers" value={l.dnsServers.join(', ')} onChange={(v) => updateLnet(i, { dnsServers: v.split(',').map((s) => s.trim()).filter(Boolean) })} hint="Comma-separated" />
                  <TextInput id={`lnet-${i}-pool-start`} label="IP pool start" value={l.poolStart} onChange={(poolStart) => updateLnet(i, { poolStart })} />
                  <TextInput id={`lnet-${i}-pool-end`} label="IP pool end" value={l.poolEnd} onChange={(poolEnd) => updateLnet(i, { poolEnd })} />
                  <button type="button" className="text-sm font-medium text-red-700 hover:underline" onClick={() => update({ logicalNetworks: sdn.logicalNetworks.filter((_, k) => k !== i) })}>Remove logical network {i + 1}</button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="action mt-3" onClick={() => update({ logicalNetworks: [...sdn.logicalNetworks, { name: `lnet${sdn.logicalNetworks.length + 1}`, vlan: 0, addressPrefix: '', gateway: '', dnsServers: [], poolStart: '', poolEnd: '' }] })}>Add logical network</button>
        </div>
      )}
      <FindingsPanel prefixes={['sdn']} />
    </section>
  );
};
