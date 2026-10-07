import type { Project } from '../model/schema';

// Storage Spaces Direct capacity maths, from Microsoft Learn (Azure Local 2609):
//  - Plan volumes: reserve the equivalent of one capacity drive per server, up to four drives, unallocated for in-place repair.
//  - Fault tolerance and storage efficiency: two-way mirror 50%, three-way mirror 33.3%, dual parity 50% (four servers) up to 80% (sixteen, all-flash; hybrid tops out at 72.7%);
//    nested two-way mirror 25%. The footprint of a volume is its size divided by the efficiency.
//  - Two servers: two-way mirror or nested resiliency; three servers: three-way mirror; four or more: three-way, dual parity or mirror-accelerated.

export type Resiliency = Project['storage']['volumes'][number]['resiliency'];

export const TB_TO_GIB = 1000 / 1.073741824 / 1000 * 1000; // 1 TB (10^12 bytes) in GiB (2^30 bytes) is about 931.32

export const tbToGiB = (tb: number): number => Math.round(tb * 931.3225746154785);
export const gibToTb = (gib: number): number => gib / 931.3225746154785;

// Dual parity efficiency from the Learn summary tables: 4 to 6 servers 50%, 7 or 8 servers 66.7%. Hybrid (HDD capacity): 12 to 16 servers 72.7%, 9 to 11 stay 66.7%.
// All-flash: 9 to 15 servers 75%, 16 servers 80%.
export function parityEfficiency(servers: number, hybrid = false): number {
  if (servers < 7) return 0.5;
  if (hybrid) return servers >= 12 ? 8 / 11 : 2 / 3;
  if (servers >= 16) return 0.8;
  if (servers >= 9) return 0.75;
  return 2 / 3;
}

export function efficiency(resiliency: Resiliency, servers: number, hybrid = false): number {
  switch (resiliency) {
    case 'two-way':
      return 0.5;
    case 'three-way':
      return 1 / 3;
    case 'four-way':
      return 0.25; // rack-aware four-way mirror keeps four copies
    case 'parity':
      return parityEfficiency(servers, hybrid);
  }
}

export type CapacitySummary = {
  nodes: number;
  rawPerNodeTB: number;
  rawTB: number;
  reserveTB: number;
  availableTB: number;
  footprintTB: number;
  freeTB: number;
  cacheToCapacity: number; // fraction, cache TB per capacity TB
  minCapacityDrives: number;
  minCacheDrives: number;
};

export function capacitySummary(p: Project): CapacitySummary {
  const nodes = p.hardware.nodes.length;
  const { capacity, cache } = p.storage.driveLayout;
  const rawPerNodeTB = capacity.count * capacity.sizeTB;
  const rawTB = rawPerNodeTB * nodes;
  // One capacity drive per server, up to four drives.
  const reserveTB = Math.min(nodes, 4) * capacity.sizeTB;
  const availableTB = Math.max(0, rawTB - reserveTB);
  const footprintTB = p.storage.volumes.reduce((sum, v) => sum + gibToTb(v.sizeGiB) / efficiency(v.resiliency, nodes, capacity.media === 'hdd'), 0);
  return {
    nodes,
    rawPerNodeTB,
    rawTB,
    reserveTB,
    availableTB,
    footprintTB,
    freeTB: availableTB - footprintTB,
    cacheToCapacity: rawPerNodeTB > 0 ? (cache.count * cache.sizeTB) / rawPerNodeTB : 0,
    minCapacityDrives: cache.count > 0 ? 4 : 2,
    minCacheDrives: 2,
  };
}

// The resiliency types a node count allows: two-way from two servers, three-way from three, dual parity from four (nested resiliency is for two servers).
export const allowedResiliency = (nodes: number): Resiliency[] => (nodes <= 1 ? ['two-way'] : nodes === 2 ? ['two-way'] : nodes === 3 ? ['two-way', 'three-way'] : ['two-way', 'three-way', 'parity']);

// What the deployment creates by default (Express): one infrastructure volume and at least one workload volume per machine.
export const defaultResiliency = (nodes: number): Resiliency => (nodes >= 3 ? 'three-way' : 'two-way');