import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { SelectInput, TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';

type Provisioning = Project['provisioning'];

const osOptions = [
  { value: 'iso', label: 'Install the OS from an ISO', description: 'Step 3A. Install the Azure Stack HCI operating system on each machine locally, then register it with Azure Arc (step 5).' },
  { value: 'simplified', label: 'Simplified machine provisioning (preview)', description: 'Step 3B. Prepare each machine from a USB drive, then install the OS and register it from the Azure portal using the machine ownership voucher. Arc gateway is not supported.' },
];

const deployOptions = [
  { value: 'portal', label: 'Azure portal wizard', description: 'Step 6A. Subscription, instance name, Key Vault, networking, management, security and advanced tabs. No custom storage IPs; 3- and 4-node switchless storage is not offered.' },
  { value: 'arm', label: 'ARM template', description: 'Step 6B. The create-cluster template and a parameters file, validated first and then deployed. For deployments at scale; deploy once from the portal first.' },
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
  const nodes = project.hardware.nodes;
  const set = (patch: Partial<Provisioning>) => setSection('provisioning', { ...prov, ...patch });
  const setNode = (index: number, patch: Partial<Project['hardware']['nodes'][number]>) => setSection('hardware', { ...project.hardware, nodes: nodes.map((n, i) => (i === index ? { ...n, ...patch } : n)) });
  const usesGateway = ['arc-gateway', 'proxy-arc-gateway', 'private-path'].includes(project.connectivity.path);
  const usesProxy = ['proxy', 'proxy-arc-gateway', 'private-path'].includes(project.connectivity.path);

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Provisioning and deployment method</h1>
      <p className="text-sm text-gray-600">
        Two separate decisions in Microsoft&rsquo;s deployment sequence. First, how the machines get their operating system and register with Azure Arc (3A or 3B). Then, how the Azure Local instance is deployed onto those machines (6A or 6B).
      </p>

      <ChoiceCards name="os-install" legend="1. Install the operating system and register the machines" value={prov.osInstall} onChange={(v) => set({ osInstall: v as Provisioning['osInstall'] })} choices={osOptions} />

      {prov.osInstall === 'simplified' && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Simplified machine provisioning</h2>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Hardware</h3>
            <div className="max-w-md">
              <SelectInput id="hardware-sku" label="Machine model" value={prov.hardwareSku} options={skuOptions} hint="The preview lists Microsoft-validated models. A USB port is needed on each machine." onChange={(v) => set({ hardwareSku: v as Provisioning['hardwareSku'] })} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Site (created in the Azure portal)</h3>
            <p className="text-xs text-gray-600">The site configuration applies to every new machine under it. Only the East US region supports the provisioning resource in the preview; the resource group can be in any region.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput id="site-name" label="Site name" value={prov.siteName} onChange={(siteName) => set({ siteName })} />
              <TextInput id="site-rg" label="Site resource group" value={prov.siteResourceGroup} hint="Make a note of it: you provision the machines into this resource group." onChange={(siteResourceGroup) => set({ siteResourceGroup })} />
              <TextInput id="prov-timezone" label="Time zone" value={prov.timeZone} hint="The common time zone for all machines under the site." onChange={(timeZone) => set({ timeZone })} />
              <TextInput id="prov-timeserver" label="Time server" value={prov.timeServer} hint="The common time server for synchronized system time." onChange={(timeServer) => set({ timeServer })} />
              <TextInput id="prov-proxy" label="Proxy server" value={prov.proxyServer} hint="Only a non-authenticated proxy; no PAC file; not on a .local domain. Leave empty for direct outbound." onChange={(proxyServer) => set({ proxyServer })} />
              <TextInput id="prov-keyvault" label="Key Vault for administrator credentials" value={prov.adminKeyVaultName} hint="Part of the site configuration." onChange={(adminKeyVaultName) => set({ adminKeyVaultName })} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Machines</h3>
            <p className="text-xs text-gray-600">
              For each machine you prepare a USB drive, boot the machine from it, and collect its ownership voucher: a small .pem file named after the machine&rsquo;s serial number (in \vouchers\&lt;serial number&gt;\ on the drive, or downloaded from the Configurator app, which connects to &lt;serial number&gt;.local). In the portal you add the vouchers, choose the software version, and set the local administrator credentials (a password of at least 12 characters with upper and lower case, a digit and a special character). The machine name becomes its Azure Arc resource name.
            </p>
            <div className="max-w-md">
              <TextInput id="prov-osversion" label="Software version" value={prov.osVersion} hint="The Azure Stack HCI operating system version the machines are provisioned with." onChange={(osVersion) => set({ osVersion })} />
            </div>
            {nodes.length === 0 ? (
              <p className="text-sm text-gray-600">Add the machines on Hardware and topology first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="py-2 pr-3">Arc resource name</th>
                      <th className="py-2 pr-3">Serial number</th>
                      <th className="py-2 pr-3">Static IP (Configurator app)</th>
                      <th className="py-2">Ownership voucher file</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n, i) => (
                      <tr key={i} className="border-b border-gray-100 align-top">
                        <td className="py-2 pr-3"><input aria-label={`Machine ${i + 1} name`} className="input" value={n.name} onChange={(e) => setNode(i, { name: e.target.value })} /></td>
                        <td className="py-2 pr-3"><input aria-label={`Machine ${i + 1} serial number`} className="input" value={n.serial ?? ''} onChange={(e) => setNode(i, { serial: e.target.value })} /></td>
                        <td className="py-2 pr-3"><input aria-label={`Machine ${i + 1} static IP`} className="input" value={n.ip} onChange={(e) => setNode(i, { ip: e.target.value })} /></td>
                        <td className="py-2 font-mono text-xs text-gray-600">{n.serial ? `vouchers/${n.serial}/${n.serial}.pem` : 'needs the serial number'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <h3 className="font-medium text-gray-800">Before you start</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>A Windows 11 PC with internet access and a USB drive of at least 8 GB; the USB tool erases the drive. Secure Boot and TPM must be enabled on the machines. Disable USB in the BIOS afterwards.</li>
              <li>Download the maintenance environment image, the USB preparation tool and the Configurator app from Azure Arc, Azure Local, Get started, Try provisioning (preview).</li>
              <li>Register the AzureLocalZTP feature (namespace Microsoft.DeviceOnboarding) and the eleven resource providers listed in the manifest on the subscription.</li>
              <li>Owner on the resource group, or Contributor plus Role Based Access Control Administrator.</li>
              <li>Prepare Active Directory and satisfy the deployment prerequisites as for the ISO install.</li>
              <li>Keep every machine powered on and connected; each calls home and is configured from Azure. Wait for the status <em>Ready to cluster</em> under Azure Arc, Operations, Provisioning (preview).</li>
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <h2 className="mb-1 text-lg font-medium text-gray-800">Registration with Azure Arc</h2>
        {prov.osInstall === 'simplified' ? (
          <p>Simplified machine provisioning registers the machines with Azure Arc as part of the provisioning, so there is no separate registration script.</p>
        ) : (
          <p>
            From the outbound connectivity you chose: {usesGateway ? 'register the machines with the Arc gateway (step 5B)' : 'register the machines without the Arc gateway (step 5A)'}
            {usesProxy ? ', passing the proxy and bypass list once during registration.' : ', directly, without a proxy.'}
          </p>
        )}
      </div>

      <ChoiceCards name="deploy-method" legend="2. Deploy the Azure Local instance" value={prov.deployMethod} onChange={(v) => set({ deployMethod: v as Provisioning['deployMethod'] })} choices={deployOptions} />

      <FindingsPanel prefixes={['provisioning']} />
    </section>
  );
};