import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { TextInput } from '../components/Field';
import { ChoiceCards } from '../components/ChoiceCards';

const modeOptions = [
  { value: 'active-directory', label: 'Active Directory', description: 'Domain-joined machines. Needs prepared Active Directory and DNS.' },
  { value: 'local-identity-key-vault', label: 'Local identity with Key Vault', description: 'No Active Directory. Secrets in Azure Key Vault. Windows Admin Center is not supported.' },
];

export const IdentityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const identity = project.identity;

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Identity</h1>
      <ChoiceCards name="identity-mode" legend="Identity mode" value={identity.mode} onChange={(mode) => setSection('identity', { ...identity, mode: mode as Project['identity']['mode'] })} choices={modeOptions} />
      {identity.mode === 'active-directory' && (
        <TextInput id="domain" label="Domain" value={identity.domain ?? ''} onChange={(domain) => setSection('identity', { ...identity, domain })} />
      )}
      {identity.mode === 'local-identity-key-vault' && (
        <TextInput id="key-vault-name" label="Key Vault name" value={identity.keyVaultName ?? ''} onChange={(keyVaultName) => setSection('identity', { ...identity, keyVaultName })} />
      )}
      <FindingsPanel prefixes={['identity']} />
    </section>
  );
};