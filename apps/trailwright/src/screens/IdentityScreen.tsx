import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { ChoiceCards } from '../components/ChoiceCards';
import { ListInput, TextInput } from '../components/Field';

const modeOptions = [
  { value: 'active-directory', label: 'Active Directory', description: 'Domain-joined machines. Needs prepared Active Directory (a dedicated OU and a deployment user) and DNS that resolves the domain.' },
  { value: 'local-identity-key-vault', label: 'Local identity with Key Vault', description: 'No Active Directory. Secrets in Azure Key Vault. Windows Admin Center is not supported.' },
];

const dnsOptions = [
  { value: 'UseDnsServer', label: 'Use existing DNS servers', description: 'The infrastructure network uses the DNS servers you provide on the management network step.' },
  { value: 'UseForwarder', label: 'Use Internal DNS with forwarders (preview)', description: 'Azure Local runs an internal DNS service for the cluster zone and forwards other queries. For cluster operations only, not for VMs or applications.' },
];

export const IdentityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const identity = project.identity;
  const set = (patch: Partial<Project['identity']>) => setSection('identity', { ...identity, ...patch });

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Identity</h1>
      <ChoiceCards name="identity-mode" legend="Identity mode" value={identity.mode} onChange={(mode) => set({ mode: mode as Project['identity']['mode'] })} choices={modeOptions} />

      <TextInput id="local-admin-username" label="Local administrator user name" value={identity.localAdminUsername} hint="The same on every machine. The password is a secret: supply it at deployment, it is never stored here." onChange={(localAdminUsername) => set({ localAdminUsername })} />

      {identity.mode === 'active-directory' && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Active Directory</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput id="domain" label="Domain" value={identity.domain ?? ''} hint="The fully qualified domain name used when Active Directory was prepared." onChange={(domain) => set({ domain })} />
            <TextInput id="ou-path" label="Organizational unit (distinguished name)" value={identity.ouPath} hint="A dedicated OU, not at the top level of the domain, for example OU=Local001,DC=contoso,DC=com." onChange={(ouPath) => set({ ouPath })} />
            <TextInput id="lcm-username" label="Deployment (LCM) user name" value={identity.lcmUsername} hint="Name only, no domain. 1 to 20 characters: letters, numbers, hyphens, underscores; not starting with a hyphen or number." onChange={(lcmUsername) => set({ lcmUsername })} />
          </div>
          <p className="text-xs text-gray-600">Prepare Active Directory with New-HciAdObjectsPreCreation (AsHciADArtifactsPreCreationTool module). The deployment user needs interactive logon and the Log on as a batch job right.</p>
        </div>
      )}

      {identity.mode === 'local-identity-key-vault' && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Local identity with Key Vault</h2>
          <TextInput id="key-vault-name" label="Key Vault name" value={identity.keyVaultName ?? ''} onChange={(keyVaultName) => set({ keyVaultName })} />
          <ChoiceCards name="dns-config" legend="DNS" value={identity.dnsServerConfig} onChange={(v) => set({ dnsServerConfig: v as Project['identity']['dnsServerConfig'] })} choices={dnsOptions} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput id="dns-zone" label="DNS zone name" value={identity.dnsZoneName} hint="The zone for the cluster, for example cluster.contoso.com." onChange={(dnsZoneName) => set({ dnsZoneName })} />
            {identity.dnsServerConfig === 'UseForwarder' && <ListInput id="dns-forwarders" label="DNS forwarders" value={identity.dnsForwarders} hint="Comma-separated IP addresses that can resolve external names." onChange={(dnsForwarders) => set({ dnsForwarders })} />}
          </div>
        </div>
      )}

      <FindingsPanel prefixes={['identity']} />
    </section>
  );
};