import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import { FindingsPanel } from '../components/FindingsPanel';
import { SelectInput, TextInput } from '../components/Field';
import { azureLocalRegions } from '../model/regions';

export const LandingZoneScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const lz = project.landingZone;
  const set = (patch: Partial<typeof lz>) => setSection('landingZone', { ...lz, ...patch });

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Azure landing zone</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <SelectInput id="lz-region" label="Azure region" value={lz.region} hint="Only regions where Azure Local is supported." options={azureLocalRegions.map((x) => ({ value: x.value, label: x.cloud === 'government' ? `${x.label} (Azure Government)` : x.label }))} onChange={(region) => set({ region: region as typeof lz.region })} />
        <TextInput id="lz-subscription" label="Subscription name" value={lz.subscriptionName} onChange={(subscriptionName) => set({ subscriptionName })} />
        <TextInput id="lz-rg" label="Resource group" value={lz.resourceGroup} onChange={(resourceGroup) => set({ resourceGroup })} />
        <TextInput id="lz-kv" label="Landing zone Key Vault name" value={lz.keyVaultName} onChange={(keyVaultName) => set({ keyVaultName })} />
        <TextInput id="lz-witness" label="Witness storage account" value={lz.witnessStorageAccount ?? ''} onChange={(witnessStorageAccount) => set({ witnessStorageAccount })} />
        <TextInput id="lz-custom-location" label="Custom location" value={lz.customLocation ?? ''} onChange={(customLocation) => set({ customLocation })} />
      </div>
      <FindingsPanel prefixes={['landingZone']} />
    </section>
  );
};