import type { Finding, Rule } from './types';
import { zonesOf } from '../exports/createCluster';

const REQ = 'https://learn.microsoft.com/azure/azure-local/concepts/rack-aware-cluster-requirements?view=azloc-2609#general-requirements';
const DEPLOY = 'https://learn.microsoft.com/azure/azure-local/deploy/rack-aware-cluster-deploy-portal?view=azloc-2609#optionally-change-advanced-settings-and-apply-tags';
const DOPS = 'https://learn.microsoft.com/azure/azure-local/manage/disconnected-operations-deploy?view=azloc-2609#deploy-a-rack-aware-cluster';

const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });
const rack = (p: Parameters<Rule['check']>[0]): boolean => p.hardware.topology === 'rack-aware' && p.hardware.nodes.length > 0;

// Rack-aware clusters: two local availability zones (racks), equal machines in each, at most four per zone, all-flash data drives.
export const rackRules: Rule[] = [
  {
    id: 'RAC-001',
    learnUrl: REQ,
    check: (p) => {
      if (!rack(p)) return [];
      const zones = zonesOf(p);
      const sizes = zones.map((z) => z.nodes.length);
      const out: Finding[] = [];
      if (zones.length !== 2) out.push(f('RAC-001', 'error', 'hardware.nodes', `A rack-aware cluster has exactly two local availability zones; this design has ${zones.length}.`, REQ));
      else if (sizes[0] !== sizes[1]) out.push(f('RAC-001', 'error', 'hardware.nodes', `The two zones must contain an equal number of machines; they have ${sizes[0]} and ${sizes[1]}.`, REQ));
      if (sizes.some((s) => s > 4)) out.push(f('RAC-001', 'error', 'hardware.nodes', 'A zone supports at most four machines.', REQ));
      return out;
    },
  },
  {
    id: 'RAC-002',
    learnUrl: REQ,
    check: (p) =>
      rack(p) && p.storage.driveLayout.capacity.media === 'hdd'
        ? [f('RAC-002', 'error', 'storage.driveLayout.capacity', 'Rack-aware clusters need all-flash data drives, NVMe or SSD.', REQ)]
        : [],
  },
  {
    id: 'RAC-003',
    learnUrl: DOPS,
    check: (p) =>
      rack(p) && p.deployment.mode === 'disconnected' && !p.hardware.witnessPath.trim()
        ? [f('RAC-003', 'error', 'hardware.witnessPath', 'A rack-aware cluster in disconnected operations needs the path of a local file share witness, hosted on a Windows server in the same Active Directory forest as the cluster.', DOPS)]
        : [],
  },
  {
    id: 'RAC-004',
    learnUrl: DEPLOY,
    check: (p) =>
      rack(p)
        ? [f('RAC-004', 'info', 'hardware.nodes', 'Machines in the same zone must be physically in the same rack. The deployment does not validate this, and if it is wrong a single rack failure could take down the whole cluster.', DEPLOY)]
        : [],
  },
];
