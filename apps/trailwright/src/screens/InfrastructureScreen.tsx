import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { CheckInput, ListInput, NumberInput, TextInput } from '../components/Field';

export const InfrastructureScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const infra = project.infrastructure;
  const nodes = project.hardware.nodes;
  const set = (patch: Partial<Project['infrastructure']>) => setSection('infrastructure', { ...infra, ...patch });
  const setNodeIp = (index: number, ip: string) => setSection('hardware', { ...project.hardware, nodes: nodes.map((n, i) => (i === index ? { ...n, ip } : n)) });

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Management network and infrastructure IPs</h1>
      <p className="text-sm text-gray-600">
        Keep every address outside 10.96.0.0/12 and 10.244.0.0/16 (reserved by the platform). The management IP pool is a contiguous range on the same subnet as the nodes, without the node addresses.
      </p>

      <CheckInput id="use-dhcp" label="Nodes and the cluster IP use DHCP" hint="Infrastructure services still use static addresses from the pool, so the pool is required either way. Exclude the pool from the DHCP scope and reserve the node addresses." checked={infra.useDhcp} onChange={(useDhcp) => set({ useDhcp })} />

      <div className="grid gap-6 md:grid-cols-2">
        <TextInput id="infra-mask" label="Subnet mask" value={infra.subnetMask} hint="For example 255.255.255.0." onChange={(subnetMask) => set({ subnetMask })} />
        {!infra.useDhcp && <TextInput id="infra-gateway" label="Default gateway" value={infra.gateway} hint="Must allow ICMP from the pool and give outbound access to Azure." onChange={(gateway) => set({ gateway })} />}
        <TextInput id="infra-start" label="Management IP pool: starting address" value={infra.startIp} hint="At least six consecutive addresses in total." onChange={(startIp) => set({ startIp })} />
        <TextInput id="infra-end" label="Management IP pool: ending address" value={infra.endIp} onChange={(endIp) => set({ endIp })} />
        {!infra.useDhcp && <ListInput id="infra-dns" label="DNS servers" value={infra.dnsServers} hint="Must resolve your domain and public Azure names; not public servers such as 8.8.8.8; at least one outside this cluster." onChange={(dnsServers) => set({ dnsServers })} />}
        <NumberInput id="infra-vlan" label="Management VLAN ID" value={infra.managementVlan} hint="0 is the default (untagged) VLAN. Set on the adapters before Arc registration; cannot be changed after deployment." onChange={(managementVlan) => set({ managementVlan })} />
      </div>

      {nodes.length > 0 && !infra.useDhcp && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-800">Node management addresses</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {nodes.map((node, index) => (
              <TextInput key={index} id={`node-ip-${index}`} label={`${node.name || `Node ${index + 1}`} management IP`} value={node.ip} onChange={(ip) => setNodeIp(index, ip)} />
            ))}
          </div>
        </div>
      )}

      <FindingsPanel prefixes={['infrastructure', 'hardware.nodes']} />
    </section>
  );
};