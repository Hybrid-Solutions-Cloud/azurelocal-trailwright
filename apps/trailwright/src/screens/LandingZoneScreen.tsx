import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import { FindingsPanel } from '../components/FindingsPanel';
import { NumberInput, TextInput } from '../components/Field';

export const LandingZoneScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const lz = project.landingZone;
  const set = (patch: Partial<typeof lz>) => setSection('landingZone', { ...lz, ...patch });

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Azure resources</h1>
      <p className="text-sm text-gray-600">These values go straight into the deployment template. Nothing here is a secret.</p>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Subscription and instance</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput id="lz-subscription" label="Subscription name" value={lz.subscriptionName} onChange={(subscriptionName) => set({ subscriptionName })} />
          <TextInput id="lz-subscription-id" label="Subscription ID" value={lz.subscriptionId} hint="A GUID. Used to build the Arc machine resource IDs." onChange={(subscriptionId) => set({ subscriptionId })} />
          <TextInput id="lz-tenant" label="Tenant ID" value={lz.tenantId} hint="The Microsoft Entra tenant GUID of the subscription." onChange={(tenantId) => set({ tenantId })} />
          <TextInput id="lz-rg" label="Resource group" value={lz.resourceGroup} onChange={(resourceGroup) => set({ resourceGroup })} />
          <TextInput id="lz-instance" label="Instance (cluster) name" value={lz.instanceName} hint="Must be different from every machine name." onChange={(instanceName) => set({ instanceName })} />
          <TextInput id="lz-prefix" label="Naming prefix" value={lz.namingPrefix} hint="Prefix for the objects created for the deployment (namingPrefix)." onChange={(namingPrefix) => set({ namingPrefix })} />
          <TextInput id="lz-custom-location" label="Custom location name" value={lz.customLocation ?? ''} hint="Helps people identify the system when they create resources such as VMs on it." onChange={(customLocation) => set({ customLocation })} />
          <TextInput
            id="lz-hci-rp"
            label="Azure Local resource provider object ID"
            value={lz.hciResourceProviderObjectId}
            hint='Unique per tenant: (Get-AzADServicePrincipal -ApplicationId "1412d89f-b8a8-4111-b4fd-e82905cbd85d").Id'
            onChange={(hciResourceProviderObjectId) => set({ hciResourceProviderObjectId })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Key Vault and storage accounts</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <TextInput id="lz-kv" label="Key Vault name" value={lz.keyVaultName} hint="Created for the deployment's secrets. Keep public access on until deployment completes; not an existing vault with private endpoints." onChange={(keyVaultName) => set({ keyVaultName })} />
          <NumberInput id="lz-kv-retention" label="Key Vault soft-delete retention (days)" value={lz.keyVaultRetentionDays} hint="7 to 90. Cannot be changed later." onChange={(keyVaultRetentionDays) => set({ keyVaultRetentionDays })} />
          <TextInput id="lz-diag-sa" label="Key Vault audit log storage account" value={lz.diagnosticStorageAccountName} hint="Storage account for the Key Vault audit logs." onChange={(diagnosticStorageAccountName) => set({ diagnosticStorageAccountName })} />
          <NumberInput id="lz-logs-retention" label="Audit log retention (days)" value={lz.logsRetentionDays} hint="0 keeps the logs forever." onChange={(logsRetentionDays) => set({ logsRetentionDays })} />
          {project.hardware.witness === 'cloud' || project.hardware.nodes.length === 2 ? (
            <TextInput id="lz-witness" label="Witness storage account" value={lz.witnessStorageAccount ?? ''} hint="Created for the cloud witness. One storage account per Azure Local system; keep public access on until deployment completes." onChange={(witnessStorageAccount) => set({ witnessStorageAccount })} />
          ) : null}
        </div>
      </div>

      <FindingsPanel prefixes={['landingZone']} />
    </section>
  );
};