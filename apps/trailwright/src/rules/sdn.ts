import type { Finding, Rule } from './types';
import { isCidr, toNum } from '../network/ip';

const F = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609#decision-11-determine-software-defined-networking-sdn';
const OVERVIEW = 'https://learn.microsoft.com/azure/azure-local/concepts/sdn-overview?view=azloc-2609#supported-networking-patterns-for-sdn-enabled-by-arc';
const ENABLE = 'https://learn.microsoft.com/azure/azure-local/deploy/enable-sdn-integration?view=azloc-2609';

const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });

// The infrastructure IP pool's fifth address: the DNS record <prefix>-NC points to it when DNS records are created by hand.
export const ncAddress = (startIp: string): string | undefined => {
  const n = toNum(startIp);
  return n === undefined ? undefined : [24, 16, 8, 0].map((s) => ((n + 4) >>> s) & 255).join('.');
};

export const sdnRules: Rule[] = [
  {
    id: 'SDN-001',
    learnUrl: OVERVIEW,
    check: (p) => {
      if (!p.sdn.enabled || p.deployment.architecture === 'disaggregated') return [];
      const out: Finding[] = [];
      const intents = p.networking.intents;
      const nodes = p.hardware.nodes.length;
      if (intents.some((i) => i.traffic.includes('compute') && i.traffic.includes('storage'))) out.push(f('SDN-001', 'error', 'sdn.enabled', 'SDN enabled by Arc does not support an intent that combines compute and storage traffic, with or without a management intent. Use all traffic in one intent, or management and compute with a separate storage intent.', OVERVIEW));
      if (intents.length > 3) out.push(f('SDN-001', 'error', 'sdn.enabled', 'SDN enabled by Arc does not support more than three intents.', OVERVIEW));
      if (nodes === 1 && intents.some((i) => i.traffic.includes('compute') && !i.traffic.includes('management'))) out.push(f('SDN-001', 'error', 'sdn.enabled', 'A standalone compute intent on a single-node deployment is not supported with SDN enabled by Arc.', OVERVIEW));
      if (p.networking.storage === 'switchless' && nodes >= 2 && nodes <= 3 && intents.length === 3) out.push(f('SDN-001', 'error', 'sdn.enabled', 'Three-intent configurations on two-node or three-node switchless deployments are not supported with SDN enabled by Arc.', OVERVIEW));
      return out;
    },
  },
  {
    id: 'SDN-002',
    learnUrl: ENABLE,
    check: (p) => {
      if (!p.sdn.enabled || p.deployment.architecture === 'disaggregated') return [];
      const v = p.sdn.prefix;
      const ok = v.length > 0 && v.length <= 8 && /^[A-Za-z0-9-]+$/.test(v) && !v.includes('--') && !v.endsWith('-');
      return ok ? [] : [f('SDN-002', 'error', 'sdn.prefix', 'The SDN prefix must be one to eight characters: letters, numbers and hyphens, with no two hyphens in a row and no hyphen at the end. Without a valid prefix SDN enablement fails.', ENABLE)];
    },
  },
  {
    id: 'SDN-003',
    learnUrl: ENABLE,
    check: (p) => {
      if (!p.sdn.enabled || p.deployment.architecture === 'disaggregated') return [];
      const ip = ncAddress(p.infrastructure.startIp);
      const dns = p.sdn.dnsRecords === 'static' ? ` Create the DNS A record ${p.sdn.prefix || '<prefix>'}-NC before you run the command; it must point to the fifth address of the infrastructure IP range (the start address plus four${ip ? `: ${ip}` : ''}); confirm that against your range.` : ' With Active Directory integrated dynamic DNS the action plan creates the record.';
      return [f('SDN-003', 'info', 'sdn.enabled', `You cannot roll back or disable SDN once it is enabled. Plan a maintenance window: workloads see a short network interruption. Enable it after deployment with Add-EceFeature -Name NC -SDNPrefix ${p.sdn.prefix || '<prefix>'} (Azure Local 2506 or later, OS build 26100).${dns}`, ENABLE)];
    },
  },
  {
    id: 'SDN-004',
    learnUrl: F,
    check: (p) => {
      if (!p.sdn.enabled) return [];
      const out: Finding[] = [];
      const seen = new Set<number>();
      p.sdn.logicalNetworks.forEach((l, k) => {
        const label = l.name || `Logical network ${k + 1}`;
        if (!l.name.trim()) out.push(f('SDN-004', 'error', 'sdn.logicalNetworks', `Logical network ${k + 1} needs a name.`, F));
        if (!isCidr(l.addressPrefix)) out.push(f('SDN-004', 'error', 'sdn.logicalNetworks', `${label}: enter the address prefix in CIDR notation, for example 192.168.1.0/24.`, F));
        if (l.vlan > 0 && seen.has(l.vlan)) out.push(f('SDN-004', 'warning', 'sdn.logicalNetworks', `${label}: VLAN ${l.vlan} is also used by another logical network; confirm that this is intended.`, F));
        seen.add(l.vlan);
      });
      return out;
    },
  },
  {
    id: 'SDN-005',
    learnUrl: F,
    check: (p) =>
      p.sdn.enabled && p.deployment.architecture === 'disaggregated'
        ? [f('SDN-005', 'info', 'sdn.enabled', 'Disaggregated deployments do not use the Microsoft SDN Network Controller. Logical networks are provisioned on the leaf-spine fabric with a VXLAN EVPN overlay: carry each VLAN below in the cluster VRF, and give AKS logical networks Layer 3 reachability to the management network.', F)]
        : [],
  },
];
