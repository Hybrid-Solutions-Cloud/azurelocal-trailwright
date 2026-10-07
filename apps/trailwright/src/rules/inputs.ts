import type { Finding, Rule } from './types';
import { reservedRangeOf, sameSubnet, toNum } from '../network/ip';

const AD_PREP = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-prep-active-directory?view=azloc-2609';
const PORTAL = 'https://learn.microsoft.com/azure/azure-local/deploy/deploy-via-portal?view=azloc-2609';
const FRAMEWORK = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609';
const D8 = `${FRAMEWORK}#decision-8-determine-management-ips-and-infrastructure-network`;
const WITNESS = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-prerequisites?view=azloc-2609#complete-deployment-checklist';
const SECURITY = 'https://learn.microsoft.com/azure/azure-local/manage/manage-secure-baseline?view=azloc-2609#configure-security-settings-during-deployment';
const ARM = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-resource-manager-template?view=azloc-2609#arm-template-parameters-reference';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_DNS = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '9.9.9.9', '149.112.112.112'];
const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });

export const inputRules: Rule[] = [
  {
    id: 'AD-001',
    learnUrl: AD_PREP,
    check: (p) => {
      if (p.identity.mode !== 'active-directory') return [];
      const ou = p.identity.ouPath.trim();
      if (!ou) return [f('AD-001', 'error', 'identity.ouPath', 'Active Directory needs a dedicated organizational unit, given as a distinguished name, for example OU=Local001,DC=contoso,DC=com.', AD_PREP)];
      const out: Finding[] = [];
      if (/[&"'<>]/.test(ou)) out.push(f('AD-001', 'error', 'identity.ouPath', 'The OU path cannot contain the characters & " \' < >.', AD_PREP));
      if (!/^OU=/i.test(ou)) out.push(f('AD-001', 'error', 'identity.ouPath', 'The OU cannot be at the top level of the domain: start the distinguished name with OU=.', PORTAL));
      return out;
    },
  },
  {
    id: 'AD-002',
    learnUrl: AD_PREP,
    check: (p) => {
      if (p.identity.mode !== 'active-directory') return [];
      const user = p.identity.lcmUsername.trim();
      if (!user) return [f('AD-002', 'error', 'identity.lcmUsername', 'The deployment (LCM) user name is needed: the account created when Active Directory was prepared.', AD_PREP)];
      const out: Finding[] = [];
      if (!/^[A-Za-z_][A-Za-z0-9_-]{0,19}$/.test(user)) out.push(f('AD-002', 'error', 'identity.lcmUsername', 'The deployment user name is 1 to 20 characters of letters, numbers, hyphens and underscores, and cannot start with a hyphen or a number. Give the name only, without the domain.', AD_PREP));
      if (user.toLowerCase() === 'admin') out.push(f('AD-002', 'error', 'identity.lcmUsername', 'The deployment user name cannot be admin.', AD_PREP));
      if (user.toLowerCase() === p.identity.localAdminUsername.trim().toLowerCase()) out.push(f('AD-002', 'error', 'identity.lcmUsername', 'The deployment user name cannot be the same as the local administrator name.', AD_PREP));
      return out;
    },
  },
  {
    id: 'AD-003',
    learnUrl: AD_PREP,
    check: (p) => {
      if (p.identity.mode !== 'active-directory') return [];
      const domain = (p.identity.domain ?? '').trim();
      if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) return [f('AD-003', 'error', 'identity.domain', 'The domain must be the fully qualified domain name used when Active Directory was prepared, for example contoso.com.', AD_PREP)];
      const dcs = [...p.identity.ouPath.matchAll(/DC=([^,]+)/gi)].map((m) => m[1].toLowerCase()).join('.');
      return dcs && dcs !== domain.toLowerCase()
        ? [f('AD-003', 'warning', 'identity.ouPath', `The DC components of the OU path (${dcs}) do not match the domain (${domain}).`, AD_PREP)]
        : [];
    },
  },
  {
    id: 'ID-004',
    learnUrl: ARM,
    check: (p) =>
      !p.identity.localAdminUsername.trim()
        ? [f('ID-004', 'error', 'identity.localAdminUsername', 'The local administrator user name is needed (localAdminUserName). Its password is supplied at deployment.', ARM)]
        : [],
  },
  {
    id: 'ID-005',
    learnUrl: ARM,
    check: (p) => {
      if (p.identity.mode !== 'local-identity-key-vault') return [];
      const out: Finding[] = [];
      if (!p.identity.dnsZoneName.trim()) out.push(f('ID-005', 'error', 'identity.dnsZoneName', 'Local identity needs the DNS zone name for the cluster.', ARM));
      if (p.identity.dnsServerConfig === 'UseForwarder' && p.identity.dnsForwarders.length === 0) out.push(f('ID-005', 'error', 'identity.dnsForwarders', 'Internal DNS needs at least one forwarder that can resolve external names.', ARM));
      return out;
    },
  },
  {
    id: 'INF-001',
    learnUrl: D8,
    check: (p) => {
      const i = p.infrastructure;
      const s = toNum(i.startIp);
      const e = toNum(i.endIp);
      if (s === undefined || e === undefined) return [f('INF-001', 'error', 'infrastructure.startIp', 'The management IP pool needs a starting and an ending IPv4 address.', D8)];
      if (e < s) return [f('INF-001', 'error', 'infrastructure.endIp', 'The ending address is before the starting address.', D8)];
      return e - s + 1 < 6 ? [f('INF-001', 'error', 'infrastructure.endIp', `The management IP pool needs at least six consecutive addresses; this one has ${e - s + 1}. It cannot be changed after deployment.`, D8)] : [];
    },
  },
  {
    id: 'INF-002',
    learnUrl: D8,
    check: (p) => {
      const i = p.infrastructure;
      const out: Finding[] = [];
      if (!i.subnetMask.trim() || toNum(i.subnetMask) === undefined) out.push(f('INF-002', 'error', 'infrastructure.subnetMask', 'Give the subnet mask, for example 255.255.255.0.', D8));
      if (i.useDhcp) return out;
      if (toNum(i.gateway) === undefined) out.push(f('INF-002', 'error', 'infrastructure.gateway', 'A static design needs the default gateway.', D8));
      else if (toNum(i.startIp) !== undefined && toNum(i.subnetMask) !== undefined && !sameSubnet(i.gateway, i.startIp, i.subnetMask)) out.push(f('INF-002', 'warning', 'infrastructure.gateway', 'The default gateway is not on the same subnet as the management IP pool.', D8));
      return out;
    },
  },
  {
    id: 'INF-003',
    learnUrl: D8,
    check: (p) => {
      const i = p.infrastructure;
      const out: Finding[] = [];
      const check = (what: string, ip: string, field: string) => {
        const range = reservedRangeOf(ip);
        if (range) out.push(f('INF-003', 'error', field, `${what} (${ip}) falls inside ${range}, which the platform reserves for Kubernetes services and pods; use another range.`, D8));
      };
      check('The pool start', i.startIp, 'infrastructure.startIp');
      check('The pool end', i.endIp, 'infrastructure.endIp');
      check('The default gateway', i.gateway, 'infrastructure.gateway');
      i.dnsServers.forEach((d) => check('A DNS server', d, 'infrastructure.dnsServers'));
      p.hardware.nodes.forEach((n) => n.ip && check(`The IP of ${n.name}`, n.ip, 'hardware.nodes'));
      if (p.connectivity.proxyUrl) {
        const host = /\/\/([^:/]+)/.exec(p.connectivity.proxyUrl)?.[1] ?? '';
        if (host) check('The proxy server', host, 'connectivity.proxyUrl');
      }
      return out;
    },
  },
  {
    id: 'INF-004',
    learnUrl: D8,
    check: (p) => {
      const i = p.infrastructure;
      if (i.useDhcp) return [];
      const out: Finding[] = [];
      if (i.dnsServers.length === 0) out.push(f('INF-004', 'error', 'infrastructure.dnsServers', 'At least one DNS server is needed; it must resolve your domain and public Azure names.', D8));
      i.dnsServers.filter((d) => PUBLIC_DNS.includes(d)).forEach((d) => out.push(f('INF-004', 'error', 'infrastructure.dnsServers', `Public DNS servers such as ${d} are not supported; the DNS servers must resolve the on-premises domain.`, D8)));
      return out;
    },
  },
  {
    id: 'INF-005',
    learnUrl: D8,
    check: (p) => {
      const i = p.infrastructure;
      if (i.useDhcp) return [];
      const s = toNum(i.startIp);
      const e = toNum(i.endIp);
      const out: Finding[] = [];
      p.hardware.nodes.forEach((n) => {
        const ip = toNum(n.ip);
        if (ip === undefined) {
          out.push(f('INF-005', 'error', 'hardware.nodes', `${n.name || 'A node'} needs a management IP address.`, D8));
          return;
        }
        if (s !== undefined && e !== undefined && ip >= s && ip <= e) out.push(f('INF-005', 'error', 'hardware.nodes', `The IP of ${n.name} is inside the management IP pool; node addresses must be outside it.`, D8));
        if (toNum(i.startIp) !== undefined && toNum(i.subnetMask) !== undefined && !sameSubnet(n.ip, i.startIp, i.subnetMask)) out.push(f('INF-005', 'warning', 'hardware.nodes', `The IP of ${n.name} is not on the same subnet as the management IP pool.`, D8));
      });
      return out;
    },
  },
  {
    id: 'INF-006',
    learnUrl: D8,
    check: (p) =>
      p.infrastructure.managementVlan !== 0
        ? [f('INF-006', 'info', 'infrastructure.managementVlan', `Set VLAN ${p.infrastructure.managementVlan} on every management adapter before the machines are registered with Azure Arc. It is inherited by the infrastructure VMs and cannot be changed after deployment.`, D8)]
        : [],
  },
  {
    id: 'AZ-001',
    learnUrl: ARM,
    check: (p) => {
      const lz = p.landingZone;
      const out: Finding[] = [];
      const guid = (v: string, field: string, what: string) => {
        if (!v.trim()) out.push(f('AZ-001', 'warning', field, `${what} is needed for the deployment parameters.`, ARM));
        else if (!GUID.test(v.trim())) out.push(f('AZ-001', 'error', field, `${what} must be a GUID.`, ARM));
      };
      guid(lz.subscriptionId, 'landingZone.subscriptionId', 'The subscription ID');
      guid(lz.tenantId, 'landingZone.tenantId', 'The tenant ID');
      guid(lz.hciResourceProviderObjectId, 'landingZone.hciResourceProviderObjectId', 'The Azure Local resource provider object ID');
      return out;
    },
  },
  {
    id: 'AZ-002',
    learnUrl: ARM,
    check: (p) => {
      const out: Finding[] = [];
      const name = (p.landingZone.instanceName || '').trim();
      if (!name) out.push(f('AZ-002', 'warning', 'landingZone.instanceName', 'Name the Azure Local instance (clusterName).', ARM));
      else if (p.hardware.nodes.some((n) => n.name.trim().toLowerCase() === name.toLowerCase())) out.push(f('AZ-002', 'error', 'landingZone.instanceName', 'The instance name must be different from every machine name.', ARM));
      p.hardware.nodes.forEach((n) => n.name.length > 15 && out.push(f('AZ-002', 'error', 'hardware.nodes', `${n.name} is longer than 15 characters, the NetBIOS limit for a machine name.`, D8)));
      return out;
    },
  },
  {
    id: 'AZ-003',
    learnUrl: PORTAL,
    check: (p) => {
      const days = p.landingZone.keyVaultRetentionDays;
      return days < 7 || days > 90
        ? [f('AZ-003', 'error', 'landingZone.keyVaultRetentionDays', 'Key Vault soft-delete retention is between 7 and 90 days, and cannot be changed later.', PORTAL)]
        : [];
    },
  },
  {
    id: 'AZ-004',
    learnUrl: WITNESS,
    check: (p) => {
      const out: Finding[] = [];
      const sa = /^[a-z0-9]{3,24}$/;
      const lz = p.landingZone;
      if (lz.witnessStorageAccount && !sa.test(lz.witnessStorageAccount)) out.push(f('AZ-004', 'error', 'landingZone.witnessStorageAccount', 'A storage account name is 3 to 24 characters of lowercase letters and numbers.', WITNESS));
      if (lz.diagnosticStorageAccountName && !sa.test(lz.diagnosticStorageAccountName)) out.push(f('AZ-004', 'error', 'landingZone.diagnosticStorageAccountName', 'A storage account name is 3 to 24 characters of lowercase letters and numbers.', WITNESS));
      if (!lz.diagnosticStorageAccountName.trim()) out.push(f('AZ-004', 'warning', 'landingZone.diagnosticStorageAccountName', 'The template needs a storage account for the Key Vault audit logs (diagnosticStorageAccountName).', ARM));
      return out;
    },
  },
  {
    id: 'SEC-001',
    learnUrl: PORTAL,
    check: (p) =>
      !p.security.backupKeyVaultName.trim()
        ? [f('SEC-001', 'warning', 'security.backupKeyVaultName', 'Without a backup Key Vault the system does not back up its secrets (Trusted launch VM keys, BitLocker recovery keys); you might not be able to recover the instance if data is lost. Use a dedicated vault for each instance. The feature is in preview.', PORTAL)]
        : [],
  },
  {
    id: 'SEC-002',
    learnUrl: SECURITY,
    check: (p) => {
      const s = p.security;
      if (s.level !== 'Customized') return [];
      const off = [
        !s.driftControl && 'drift control',
        !s.credentialGuard && 'Credential Guard',
        !s.wdac && 'Application Control',
        !s.bitlockerBootVolume && 'BitLocker for the boot volume',
        !s.bitlockerDataVolumes && 'BitLocker for data volumes',
        !s.smbSigning && 'SMB signing',
      ].filter(Boolean);
      return off.length ? [f('SEC-002', 'info', 'security.level', `Customized security turns off: ${off.join(', ')}. The recommended level keeps the secure baseline and refreshes it every 90 minutes.`, SECURITY)] : [];
    },
  },
  {
    id: 'STO-006',
    learnUrl: PORTAL,
    check: (p) =>
      p.storage.configurationMode === 'KeepStorage' && p.hardware.nodes.length > 1
        ? [f('STO-006', 'error', 'storage.configurationMode', 'Using existing data drives is for a single machine only.', PORTAL)]
        : [],
  },
];