import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { SelectInput, TextInput } from '../components/Field';

const modeOptions = [
  { value: 'active-directory', label: 'Active Directory' },
  { value: 'local-identity-key-vault', label: 'Local identity with Key Vault' },
];

export const IdentityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const identity = project.identity;

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Identity</h1>
      <SelectInput
        id="identity-mode"
        label="Identity mode"
        value={identity.mode}
        onChange={(mode) => setSection('identity', { ...identity, mode: mode as Project['identity']['mode'] })}
        options={modeOptions}
      />
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