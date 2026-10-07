import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { ChoiceCards } from '../components/ChoiceCards';
import { CheckInput, TextInput } from '../components/Field';

type Security = Project['security'];

const levelOptions = [
  { value: 'Recommended', label: 'Recommended security settings', description: 'The highest security settings. More than 300 settings enabled, with drift control that refreshes them every 90 minutes.' },
  { value: 'Customized', label: 'Customized security settings', description: 'Lets you turn individual settings off.' },
];

const toggles: { key: keyof Security; label: string; hint: string }[] = [
  { key: 'driftControl', label: 'Drift control', hint: 'Reapplies the security defaults regularly.' },
  { key: 'credentialGuard', label: 'Windows Defender Credential Guard', hint: 'Isolates secrets from credential-theft attacks with virtualization-based security.' },
  { key: 'wdac', label: 'Application Control (WDAC)', hint: 'Controls which drivers and apps may run directly on each node.' },
  { key: 'bitlockerBootVolume', label: 'BitLocker for the OS boot volume', hint: 'Encrypts the operating system volume on each node.' },
  { key: 'bitlockerDataVolumes', label: 'BitLocker for data volumes', hint: 'Encrypts the cluster shared volumes created during deployment.' },
  { key: 'smbSigning', label: 'SMB signing for external traffic', hint: 'Signs SMB traffic between this system and others to prevent relay attacks.' },
  { key: 'smbClusterEncryption', label: 'SMB encryption for in-cluster traffic', hint: 'Encrypts traffic between nodes on the storage network.' },
];

export const SecurityScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const sec = project.security;
  const set = (patch: Partial<Security>) => setSection('security', { ...sec, ...patch });
  const setLevel = (level: Security['level']) =>
    level === 'Recommended' ? set({ level, driftControl: true, credentialGuard: true, smbSigning: true, smbClusterEncryption: false, bitlockerBootVolume: true, bitlockerDataVolumes: true, wdac: true }) : set({ level });

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Security</h1>
      <ChoiceCards name="security-level" legend="Security level" value={sec.level} onChange={(v) => setLevel(v as Security['level'])} choices={levelOptions} />

      {sec.level === 'Customized' && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-medium text-gray-800">Settings</h2>
          {toggles.map((t) => (
            <CheckInput key={t.key} id={`sec-${t.key}`} label={t.label} hint={t.hint} checked={sec[t.key] as boolean} onChange={(v) => set({ [t.key]: v } as Partial<Security>)} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Backup of system secrets (preview)</h2>
        <TextInput id="backup-kv" label="Backup Key Vault" value={sec.backupKeyVaultName} hint="Automatically backs up Trusted launch VM keys and BitLocker recovery keys. Use a dedicated vault for each instance." onChange={(backupKeyVaultName) => set({ backupKeyVaultName })} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Diagnostics and telemetry</h2>
        <CheckInput id="sec-streaming" label="Stream metrics data to Microsoft" hint="streamingDataClient" checked={sec.streamingData} onChange={(streamingData) => set({ streamingData })} />
        <CheckInput id="sec-episodic" label="Upload diagnostic data" hint="episodicDataUpload" checked={sec.episodicData} onChange={(episodicData) => set({ episodicData })} />
        <CheckInput id="sec-eu" label="Keep telemetry and diagnostic data in the European Union" hint="euLocation" checked={sec.euLocation} onChange={(euLocation) => set({ euLocation })} />
      </div>

      <FindingsPanel prefixes={['security']} />
    </section>
  );
};