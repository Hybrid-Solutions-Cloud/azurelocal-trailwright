import type { Finding, Rule } from './types';
import { inRange, maskBits, toNum } from '../network/ip';

const OVERVIEW = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-overview?view=azloc-2609';
const DEPLOY = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#checklist-for-deploying-disconnected-operations';
const NETWORK = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-network?view=azloc-2609#network-checklist';
const IDENTITY = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-identity?view=azloc-2609';
const PKI = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-pki?view=azloc-2609#pki-requirements';
const PREPARE = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-prepare?view=azloc-2609#prepare-azure-local-machines';

const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });
const on = (p: Parameters<Rule['check']>[0]): boolean => p.deployment.mode === 'disconnected';

export const disconnectedRules: Rule[] = [
  {
    id: 'DOP-001',
    learnUrl: DEPLOY,
    check: (p) => {
      if (!on(p) || p.disconnected.role !== 'management') return [];
      const out: Finding[] = [];
      const n = p.hardware.nodes.length;
      if (n > 0 && (n < 3 || n > 16)) out.push(f('DOP-001', 'error', 'hardware.nodes', `The disconnected operations management cluster needs at least three physical machines and at most 16; this design has ${n}.`, DEPLOY));
      if (p.identity.mode !== 'active-directory') out.push(f('DOP-001', 'error', 'identity.mode', 'The management cluster does not support AD-less deployments; use Active Directory.', DEPLOY));
      return out;
    },
  },
  {
    id: 'DOP-002',
    learnUrl: NETWORK,
    check: (p) => {
      if (!on(p)) return [];
      const d = p.disconnected;
      const out: Finding[] = [];
      if (!d.domainSuffix.trim()) out.push(f('DOP-002', 'error', 'disconnected.domainSuffix', 'Enter the external domain suffix (FQDN) of the disconnected operations endpoints, for example autonomous.cloud.private. The portal is at portal.<suffix> and Azure Resource Manager at armmanagement.<suffix>.', NETWORK));
      if (toNum(d.ingressIp) === undefined) out.push(f('DOP-002', 'error', 'disconnected.ingressIp', 'Enter the ingress IP address: an address in the management IP pool subnet that does not overlap the range used during deployment.', NETWORK));
      else {
        const start = toNum(p.infrastructure.startIp);
        const end = toNum(p.infrastructure.endIp);
        const ingress = toNum(d.ingressIp)!;
        if (start !== undefined && end !== undefined && ingress >= start && ingress <= end) out.push(f('DOP-002', 'error', 'disconnected.ingressIp', 'The ingress IP address is inside the infrastructure IP range used for the deployment; choose an address outside it, in the same subnet.', NETWORK));
        const bits = maskBits(p.infrastructure.subnetMask);
        if (bits !== undefined && p.infrastructure.startIp && !inRange(d.ingressIp, p.infrastructure.startIp, bits)) out.push(f('DOP-002', 'warning', 'disconnected.ingressIp', 'The ingress IP address is outside the management subnet; Learn asks for an address within the management IP address pool subnet.', NETWORK));
      }
      if (toNum(d.ingressGateway) === undefined) out.push(f('DOP-002', 'error', 'disconnected.ingressGateway', 'Enter the gateway of the ingress network.', NETWORK));
      if (toNum(d.dnsServer) === undefined) out.push(f('DOP-002', 'error', 'disconnected.dnsServer', 'Enter a DNS server that resolves the endpoint names to the ingress IP address and is reachable from the appliance.', NETWORK));
      if (toNum(d.managementIp) === undefined) out.push(f('DOP-002', 'error', 'disconnected.managementIp', 'Enter the management endpoint IP address; it is the subject of the management endpoint certificate and the address used for troubleshooting.', PKI));
      return out;
    },
  },
  {
    id: 'DOP-003',
    learnUrl: IDENTITY,
    check: (p) => {
      if (!on(p)) return [];
      const d = p.disconnected;
      const missing = [
        ['authority', d.authority, 'the AD FS authority URL, for example https://adfs.example.local/adfs'],
        ['clientId', d.clientId, 'the AD FS application (client) ID'],
        ['rootOperatorUpn', d.rootOperatorUpn, 'the user principal name of the root operator'],
        ['ldapServer', d.ldapServer, 'the LDAP server (domain controller)'],
        ['syncGroupIdentifier', d.syncGroupIdentifier, 'the identifier of the group to synchronize from'],
      ].filter(([, v]) => !String(v).trim());
      return missing.map(([k, , what]) => f('DOP-003', 'error', `disconnected.${k}`, `Identity integration needs ${what}. Only Active Directory with AD FS is validated.`, IDENTITY));
    },
  },
  {
    id: 'DOP-004',
    learnUrl: PKI,
    check: (p) =>
      on(p)
        ? [f('DOP-004', 'info', 'disconnected.internalCa', 'You need 23 certificates for the ingress endpoints and two for the management endpoint (server and client), plus the base64 root certificate. Self-signed certificates are not supported. Use an enterprise or private CA that is part of one trust chain, with at least two years of validity from deployment; for a fully disconnected deployment do not use a public CA, and make sure the CRL distribution point is reachable from the infrastructure.', PKI)]
        : [],
  },
  {
    id: 'DOP-005',
    learnUrl: PREPARE,
    check: (p) =>
      on(p)
        ? [f('DOP-005', 'info', 'disconnected.basePath', 'Each node needs 600 GB of free space on the deployment drive (or an initialized data disk), the root certificate imported, the DISCONNECTED_OPS_SUPPORT environment variable set, and, recommended, to be domain joined before deployment. The generated script covers the appliance and the node steps; the machine preparation is yours.', PREPARE)]
        : [],
  },
  {
    id: 'DOP-006',
    learnUrl: 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#tasks-after-deploying-disconnected-operations',
    check: (p) =>
      on(p) && p.disconnected.role === 'management'
        ? [f('DOP-006', 'info', 'disconnected.role', 'After deployment: back up the BitLocker recovery keys (without them the appliance cannot be restored), export and back up the host guardian service certificates, register the management cluster, assign extra operators, lock down the management cluster against workloads, and remove any bootstrap data disks.', 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#tasks-after-deploying-disconnected-operations')]
        : [],
  },
];
