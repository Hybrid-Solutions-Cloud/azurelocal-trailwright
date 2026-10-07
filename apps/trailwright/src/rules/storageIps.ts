import type { Finding, Rule } from './types';
import { usesS2d } from './types';
import { inRange, isCidr, toNum } from '../network/ip';

const CUSTOM_IP = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609#custom-ips-for-storage';

const f = (field: string, message: string): Finding => ({ id: 'SIP-001', severity: 'error', field, message, learnUrl: CUSTOM_IP });

// With Storage Auto IP off (and not the three- and four-node switchless meshes, which have their own subnets), each machine's address on each storage network is declared in the ARM template.
export const storageIpRules: Rule[] = [
  {
    id: 'SIP-001',
    learnUrl: CUSTOM_IP,
    check: (p) => {
      if (p.networking.storageAutoIp || !usesS2d(p) || p.deployment.architecture === 'disaggregated' || p.hardware.nodes.length === 0) return [];
      if (p.networking.storage === 'switchless' && p.hardware.nodes.length >= 3) return [];
      const networks = Math.max(2, p.networking.storageVlans.length);
      const out: Finding[] = [];
      for (let k = 0; k < networks; k++) {
        const cidr = p.networking.storageSubnets[k] ?? '';
        if (!isCidr(cidr)) {
          out.push(f('networking.storageSubnets', `Storage network ${k + 1} needs its subnet in CIDR notation, for example 172.30.71.0/24, because Storage Auto IP is off.`));
          continue;
        }
        const base = cidr.split('/')[0];
        const bits = Number(cidr.split('/')[1]);
        const seen = new Set<string>();
        for (const n of p.hardware.nodes) {
          const ip = n.storageIps?.[k] ?? '';
          if (toNum(ip) === undefined) out.push(f('networking.storageSubnets', `${n.name || 'A machine'} needs an address on storage network ${k + 1}.`));
          else if (!inRange(ip, base, bits)) out.push(f('networking.storageSubnets', `${n.name}: ${ip} is outside the storage network ${k + 1} subnet ${cidr}.`));
          else if (seen.has(ip)) out.push(f('networking.storageSubnets', `${ip} is used twice on storage network ${k + 1}.`));
          seen.add(ip);
        }
      }
      return out;
    },
  },
];
