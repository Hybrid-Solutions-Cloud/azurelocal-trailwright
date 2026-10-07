import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { SelectInput, TextInput } from '../components/Field';
import { ChoiceCards } from '../components/ChoiceCards';

type Path = Project['connectivity']['path'];

const pathOptions = [
  { value: 'direct', label: 'Direct outbound', description: 'Nodes reach Azure over the internet through the firewall.' },
  { value: 'proxy', label: 'Enterprise proxy', description: 'Outbound traffic goes through a non-authenticated proxy.' },
  { value: 'arc-gateway', label: 'Arc gateway', description: 'Fewer endpoints to allow. Chosen before deployment, cannot be added later.' },
  { value: 'proxy-arc-gateway', label: 'Enterprise proxy and Arc gateway', description: 'Arc gateway traffic through the enterprise proxy.' },
  { value: 'private-path', label: 'Private path', description: 'Private network path to Azure. Needs 2608 or later.' },
];

export const ConnectivityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const connectivity = project.connectivity;
  const pp = connectivity.privatePath;
  const usesProxy = connectivity.path === 'proxy' || connectivity.path === 'proxy-arc-gateway';
  const usesGateway = connectivity.path === 'arc-gateway' || connectivity.path === 'proxy-arc-gateway' || connectivity.path === 'private-path';
  const isPrivate = connectivity.path === 'private-path';
  const set = (patch: Partial<typeof connectivity>) => setSection('connectivity', { ...connectivity, ...patch });
  const setPrivate = (patch: Partial<typeof pp>) => set({ privatePath: { ...pp, ...patch } });

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Connectivity</h1>
      <ChoiceCards name="connectivity-path" legend="Outbound path" value={connectivity.path} onChange={(v) => set({ path: v as Path })} choices={pathOptions} />

      {usesProxy && (
        <TextInput id="proxy-url" label="Proxy address" value={connectivity.proxyUrl ?? ''} hint="Non-authenticated proxy, no PAC file, not on a .local domain." onChange={(proxyUrl) => set({ proxyUrl })} />
      )}

      {usesGateway && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Arc gateway</h2>
          <TextInput
            id="arc-gateway-name"
            label="Arc gateway resource name"
            value={connectivity.arcGatewayName}
            hint="Created before registration, in the same subscription as the machines. It cannot be enabled after deployment."
            onChange={(arcGatewayName) => set({ arcGatewayName })}
          />
        </div>
      )}

      {isPrivate && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Private path network</h2>
          <p className="text-sm text-gray-700">
            Machines register through Azure Firewall acting as an explicit proxy in an Azure virtual network, reached over a private connection. Needs Azure Local 2608 or later.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectInput
              id="pp-transport"
              label="Private connection to Azure"
              value={pp.transport}
              hint="Required before registration."
              options={[
                { value: '', label: 'Choose one' },
                { value: 'expressroute', label: 'Azure ExpressRoute' },
                { value: 'site-to-site-vpn', label: 'Site-to-site VPN' },
              ]}
              onChange={(v) => setPrivate({ transport: v as typeof pp.transport })}
            />
            <TextInput id="pp-vnet" label="Azure virtual network" value={pp.virtualNetwork} onChange={(virtualNetwork) => setPrivate({ virtualNetwork })} />
            <TextInput id="pp-workload-subnet" label="Workload subnet" value={pp.workloadSubnet} hint="At least one workload subnet." onChange={(workloadSubnet) => setPrivate({ workloadSubnet })} />
            <TextInput id="pp-firewall-subnet" label="Azure Firewall subnet" value={pp.firewallSubnet} hint="At least one Azure Firewall subnet." onChange={(firewallSubnet) => setPrivate({ firewallSubnet })} />
            <TextInput id="pp-firewall-ip" label="Azure Firewall private IP address" value={pp.firewallPrivateIp} hint="The proxy server address for registration." onChange={(firewallPrivateIp) => setPrivate({ firewallPrivateIp })} />
            <TextInput id="pp-firewall-port" label="Explicit proxy port" value={pp.firewallPort} onChange={(firewallPort) => setPrivate({ firewallPort })} />
          </div>
          <TextInput
            id="pp-bypass"
            label="Proxy bypass list"
            value={pp.proxyBypass}
            hint="Traffic you do not want sent over the proxy. Use localhost, IPs without a mask, * for subnets and domains; no .svc."
            onChange={(proxyBypass) => setPrivate({ proxyBypass })}
          />
          <div className="flex items-start gap-3">
            <input id="pp-pls" type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={pp.arcPrivateLinkScopeOnNetwork} onChange={(e) => setPrivate({ arcPrivateLinkScopeOnNetwork: e.target.checked })} />
            <label htmlFor="pp-pls" className="text-sm text-gray-700">
              An Azure Arc Private Link Scope is configured on this virtual network
              <span className="block text-xs text-gray-500">Not supported where Azure Firewall runs as the explicit proxy.</span>
            </label>
          </div>
        </div>
      )}
      <FindingsPanel prefixes={['connectivity']} />
    </section>
  );
};