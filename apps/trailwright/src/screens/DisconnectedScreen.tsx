import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { CheckInput, NumberInput, SelectInput, TextInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';

export const DisconnectedScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const d = project.disconnected;
  const update = (patch: Partial<Project['disconnected']>) => setSection('disconnected', { ...d, ...patch });
  const t = (id: string, label: string, key: keyof Project['disconnected'], hint?: string) => (
    <TextInput id={id} label={label} value={String(d[key])} onChange={(v) => update({ [key]: v } as Partial<Project['disconnected']>)} hint={hint} />
  );

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Disconnected operations</h1>
      <p className="text-sm text-gray-600">A local control plane (an appliance VM on the management cluster) replaces Azure. It exposes endpoints under your own domain, signs people in through Active Directory Federation Services, and secures every endpoint with certificates from your own certificate authority.</p>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">This cluster</h2>
        <SelectInput id="dop-role" label="Role" value={d.role} onChange={(role) => update({ role: role as typeof d.role })} options={[{ value: 'management', label: 'Management cluster (hosts the control plane; deploy first)' }, { value: 'workload', label: 'Workload cluster (uses an existing control plane)' }]} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Ingress and management endpoints</h2>
        <div className="flex flex-wrap gap-4">
          {t('dop-suffix', 'External domain suffix (FQDN)', 'domainSuffix', 'For example autonomous.cloud.private. The portal is portal.<suffix>.')}
          {t('dop-ingress-ip', 'Ingress IP address', 'ingressIp', 'In the management subnet, outside the deployment IP range.')}
          {t('dop-ingress-gw', 'Ingress gateway', 'ingressGateway')}
          <NumberInput id="dop-ingress-prefix" label="Ingress prefix length" value={d.ingressPrefixLength} onChange={(ingressPrefixLength) => update({ ingressPrefixLength })} />
          {t('dop-dns', 'DNS server', 'dnsServer', 'Must resolve the endpoint names to the ingress IP.')}
          {t('dop-mgmt-ip', 'Management endpoint IP address', 'managementIp')}
          <NumberInput id="dop-mgmt-prefix" label="Management prefix length" value={d.managementPrefixLength} onChange={(managementPrefixLength) => update({ managementPrefixLength })} />
          {t('dop-time', 'Time servers', 'timeServers', 'A reliable internal NTP source.')}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Identity (Active Directory and AD FS)</h2>
        <div className="flex flex-wrap gap-4">
          {t('dop-authority', 'AD FS authority', 'authority', 'For example https://adfs.example.local/adfs')}
          {t('dop-client', 'AD FS application (client) ID', 'clientId')}
          {t('dop-operator', 'Root operator UPN', 'rootOperatorUpn')}
          {t('dop-ldap', 'LDAP server', 'ldapServer')}
          {t('dop-sync', 'Sync group identifier', 'syncGroupIdentifier')}
        </div>
        <CheckInput id="dop-ldaps" label="Use LDAPS (port 3269; otherwise 3268)" checked={d.ldaps} onChange={(ldaps) => update({ ldaps })} />
        <p className="text-sm text-gray-600">The LDAP password and the certificate passwords are never stored. The generated script asks for them as secure strings.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Deployment</h2>
        <div className="flex flex-wrap gap-4">
          {t('dop-base', 'Appliance folder on the first machine', 'basePath')}
          {t('dop-sub', 'Operator subscription', 'operatorSubscriptionName')}
          {t('dop-rg', 'Resource group of the instance', 'resourceGroup')}
        </div>
      </div>

      <FindingsPanel prefixes={['disconnected']} />
    </section>
  );
};
