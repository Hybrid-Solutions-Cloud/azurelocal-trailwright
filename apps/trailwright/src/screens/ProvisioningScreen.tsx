import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { SelectInput, TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';

type Provisioning = Project['provisioning'];

const osOptions = [
  { value: 'iso', label: 'Install the OS from an ISO', description: 'Install the Azure Stack HCI operating system on each machine locally (step 3A), then register it with Azure Arc.' },
  { value: 'simplified', label: 'Simplified machine provisioning (preview)', description: 'Prepare each machine from a USB drive, then install the OS and register it from Azure (step 3B). Built for many sites. Arc gateway is not supported.' },
];

const deployOptions = [
  { value: 'portal', label: 'Azure portal', description: 'The deployment wizard. No custom storage IPs; 3- and 4-node switchless storage is not offered.' },
  { value: 'arm', label: 'ARM template', description: 'Parameter file and the create-cluster template. For deployments at scale; deploy once from the portal first.' },
];

const skuOptions = [
  { value: '', label: 'Choose the hardware' },
  { value: 'lenovo-mx650-v3', label: 'Lenovo ThinkAgile MX650 V3' },
  { value: 'lenovo-mx650-v4', label: 'Lenovo ThinkAgile MX650 V4' },
  { value: 'hpe-dl360-gen11', label: 'HPE ProLiant DL360 Gen11' },
  { value: 'dell-ax-750', label: 'Dell AX-750' },
  { value: 'dell-ax-650', label: 'Dell AX-650' },
  { value: 'other', label: 'Other hardware' },
];

export const ProvisioningScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const prov = project.provisioning;
  const set = (patch: Partial<Provisioning>) => setSection('provisioning', { ...prov, ...patch });
  const usesGateway = ['arc-gateway', 'proxy-arc-gateway', 'private-path'].includes(project.connectivity.path);
  const usesProxy = ['proxy', 'proxy-arc-gateway', 'private-path'].includes(project.connectivity.path);

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Provisioning and deployment method</h1>
      <p className="text-sm text-gray-600">Microsoft&rsquo;s deployment sequence: prepare Active Directory, download the OS, install it (3A or 3B), set permissions, register the machines with Azure Arc (5A or 5B), then deploy (6A or 6B).</p>

      <ChoiceCards name="os-install" legend="Install the operating system and register the machines" value={prov.osInstall} onChange={(v) => set({ osInstall: v as Provisioning['osInstall'] })} choices={osOptions} />

      {prov.osInstall === 'simplified' && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Simplified machine provisioning</h2>
          <SelectInput id="hardware-sku" label="Hardware" value={prov.hardwareSku} options={skuOptions} hint="The preview lists Microsoft-validated SKUs." onChange={(v) => set({ hardwareSku: v as Provisioning['hardwareSku'] })} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput id="prov-timezone" label="Site time zone" value={prov.timeZone} hint="Applies to every new machine in the site." onChange={(timeZone) => set({ timeZone })} />
            <TextInput id="prov-timeserver" label="Site time server" value={prov.timeServer} hint="Applies to every new machine in the site." onChange={(timeServer) => set({ timeServer })} />
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Prepare each machine from a USB drive of at least 8 GB using a Windows 11 PC; Secure Boot and TPM must be enabled. Collect each machine&rsquo;s ownership voucher.</li>
            <li>Register the AzureLocalZTP feature (Microsoft.DeviceOnboarding) and the resource providers listed in the preview article on the subscription.</li>
            <li>You need Owner on the resource group, or Contributor plus Role Based Access Control Administrator.</li>
            <li>The local administrator password for provisioning needs at least 12 characters with upper and lower case, a digit and a special character.</li>
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <h2 className="mb-1 text-lg font-medium text-gray-800">Registration with Azure Arc</h2>
        <p>
          From the outbound connectivity you chose: {usesGateway ? 'register the machines with the Arc gateway (step 5B)' : 'register the machines without the Arc gateway (step 5A)'}
          {usesProxy ? ', passing the proxy and bypass list once during registration.' : ', directly, without a proxy.'}
        </p>
      </div>

      <ChoiceCards name="deploy-method" legend="Deploy the instance" value={prov.deployMethod} onChange={(v) => set({ deployMethod: v as Provisioning['deployMethod'] })} choices={deployOptions} />

      <FindingsPanel prefixes={['provisioning']} />
    </section>
  );
};