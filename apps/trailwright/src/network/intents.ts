import type { Project } from '../model/schema';
import { makeIntent, type Intent } from '../model/defaults';

// Network ATC intent groupings and port layouts, from decisions 6 and 7 of the Microsoft network design framework
// (Learn, "Network considerations for cloud deployment for Azure Local", view azloc-2609).

type Grouping = Project['networking']['intentGrouping'];
type Traffic = 'management' | 'compute' | 'storage';

export type StorageKind = 'switchless' | 'switched' | 'san';

// The storage kind that decides which groupings are supported (the "supported intent groupings" table).
export function storageKind(p: Project): StorageKind {
  if (p.deployment.architecture === 'disaggregated') return 'san';
  return p.networking.storage === 'switchless' ? 'switchless' : 'switched';
}

// Which hyperconverged groupings the table marks as supported for each storage kind.
const supported: Record<Grouping, Record<StorageKind, boolean>> = {
  all: { switchless: false, switched: true, san: false },
  'mgmt-compute': { switchless: true, switched: true, san: false },
  'compute-storage': { switchless: false, switched: true, san: false },
  custom: { switchless: true, switched: true, san: false },
};

export const groupingSupported = (grouping: Grouping, kind: StorageKind): boolean => supported[grouping][kind];

export const groupingLabels: Record<Grouping, { label: string; description: string }> = {
  all: { label: 'Group all traffic', description: 'One intent for management, compute and storage. Needs a physical switch for storage. Two ports or more.' },
  'mgmt-compute': { label: 'Group management and compute', description: 'One intent for management and compute, a second for storage. Works with switched and switchless storage. Four ports or more.' },
  'compute-storage': { label: 'Group compute and storage', description: 'Compute and storage share an intent, management has its own. Needs a physical switch for storage. Four ports or more.' },
  custom: { label: 'Custom (up to three intents)', description: 'Your own grouping, with management in at least one intent. Use it for a second compute intent such as VM backup. Two ports per intent.' },
};

// Ethernet port counts the framework gives per node.
export function portChoices(p: Project): number[] {
  if (p.deployment.architecture === 'disaggregated') return p.deployment.sanType === 'iscsi' ? [6] : [4, 6];
  return [2, 4, 6, 8];
}

// Ports a grouping needs (two per intent), for the hyperconverged architectures.
export function portsForGrouping(grouping: Grouping, hasSeparateCompute = false): number {
  switch (grouping) {
    case 'all':
      return 2;
    case 'mgmt-compute':
    case 'compute-storage':
      return 4;
    case 'custom':
      return hasSeparateCompute ? 6 : 4;
  }
}

type Spec = Intent;
type SpecInput = { name: string; traffic: Traffic[]; adapters: string[] };
const full = (specs: SpecInput[]): Spec[] => specs.map((s) => makeIntent(s));

const adapters = (from: number, count: number): string[] => Array.from({ length: count }, (_, i) => `pNIC${String(from + i).padStart(2, '0')}`);

// The intents a grouping gives, with adapters named in order. Extra ports go to the storage intent.
export function buildIntents(grouping: Grouping, ports: number): Spec[] {
  return full(rawIntents(grouping, ports));
}

function rawIntents(grouping: Grouping, ports: number): SpecInput[] {
  switch (grouping) {
    case 'all':
      return [{ name: 'Management_Compute_Storage', traffic: ['management', 'compute', 'storage'], adapters: adapters(1, Math.max(2, ports)) }];
    case 'mgmt-compute':
      return [
        { name: 'Management_Compute', traffic: ['management', 'compute'], adapters: adapters(1, 2) },
        { name: 'Storage', traffic: ['storage'], adapters: adapters(3, Math.max(2, ports - 2)) },
      ];
    case 'compute-storage':
      return [
        { name: 'Management', traffic: ['management'], adapters: adapters(1, 2) },
        { name: 'Compute_Storage', traffic: ['compute', 'storage'], adapters: adapters(3, Math.max(2, ports - 2)) },
      ];
    case 'custom':
      return [
        { name: 'Management', traffic: ['management'], adapters: adapters(1, 2) },
        { name: 'Compute', traffic: ['compute'], adapters: adapters(3, 2) },
        { name: 'Storage', traffic: ['storage'], adapters: adapters(5, Math.max(2, ports - 4)) },
      ];
  }
}

// The intents a disaggregated cluster has: management and compute through Network ATC, plus an optional guest backup compute intent.
export function disaggregatedIntents(p: Project): Spec[] {
  return full(rawDisaggregated(p));
}

function rawDisaggregated(p: Project): SpecInput[] {
  const intents: SpecInput[] = [{ name: 'Management_Compute', traffic: ['management', 'compute'], adapters: adapters(1, 2) }];
  if (p.networking.backupNetwork) intents.push({ name: 'Guest_Backup', traffic: ['compute'], adapters: adapters(5, 2) });
  return intents;
}

// The ports a disaggregated node uses beyond the Network ATC intents: cluster networks (standalone, VLANs 1711 and 1712 by default),
// and for iSCSI two dedicated iSCSI ports (VLANs 300 and 400 in the validated pattern).
export function standalonePorts(p: Project): { name: string; vlan: number }[] {
  if (p.deployment.architecture !== 'disaggregated') return [];
  const ports = [
    { name: 'Cluster network 1', vlan: 1711 },
    { name: 'Cluster network 2', vlan: 1712 },
  ];
  if (p.deployment.sanType === 'iscsi') ports.push({ name: 'iSCSI path A', vlan: 300 }, { name: 'iSCSI path B', vlan: 400 });
  return ports;
}

// Total ports a disaggregated design needs: two for management and compute, two for the cluster networks, two for iSCSI paths,
// and two more for a guest backup intent.
export function disaggregatedPortsNeeded(p: Project): number {
  const base = 4 + (p.deployment.sanType === 'iscsi' ? 2 : 0);
  return base + (p.networking.backupNetwork && p.deployment.sanType === 'fibre-channel' ? 2 : 0);
}