import type { Finding, Rule } from './types';
import { capacitySummary, allowedResiliency } from '../storage/capacity';

const SYSREQ = 'https://learn.microsoft.com/azure/azure-local/concepts/system-requirements-23h2?view=azloc-2609#data-drive-requirements';
const HW = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/storage-spaces-direct-hardware-requirements#drives';
const CACHE = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/cache';
const CHOOSE = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/choose-drives#sizing-considerations';
const PLAN = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/plan-volumes#choosing-the-resiliency-type';
const RESERVE = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/plan-volumes#reserve-capacity';
const FAULT = 'https://learn.microsoft.com/windows-server/storage/storage-spaces/fault-tolerance#summary';
const PORTAL = 'https://learn.microsoft.com/azure/azure-local/deploy/deploy-via-portal?view=azloc-2609#optionally-change-advanced-settings-and-apply-tags';

const f = (id: string, severity: Finding['severity'], field: string, message: string, learnUrl: string): Finding => ({ id, severity, field, message, learnUrl });
const usesS2d = (arch: string): boolean => arch !== 'san';

export const s2dRules: Rule[] = [
  {
    id: 'S2D-001',
    requires: 's2d',
    learnUrl: SYSREQ,
    check: (p) => {
      const { capacity, cache } = p.storage.driveLayout;
      const out: Finding[] = [];
      if (capacity.count === 0) return [f('S2D-001', 'warning', 'storage.driveLayout.capacity', 'Describe the capacity drives in each node: media type, how many, and their size.', SYSREQ)];
      if (p.hardware.nodes.length === 1) {
        if (capacity.media === 'hdd') out.push(f('S2D-001', 'error', 'storage.driveLayout.capacity', 'A single machine uses one drive type, NVMe or SSD, with uniform performance; HDD is not supported on a single machine.', SYSREQ));
        if (cache.count > 0) out.push(f('S2D-001', 'error', 'storage.driveLayout.cache', 'The storage pool cache cannot be used with a single machine; every drive is capacity.', HW));
      }
      return out;
    },
  },
  {
    id: 'S2D-002',
    requires: 's2d',
    learnUrl: CACHE,
    check: (p) => {
      const { capacity, cache } = p.storage.driveLayout;
      if (capacity.count === 0) return [];
      const out: Finding[] = [];
      if (capacity.media === 'hdd' && cache.count === 0) out.push(f('S2D-002', 'error', 'storage.driveLayout.cache', 'HDD capacity needs a flash cache tier (NVMe or SSD); deployments with all HDD are not supported.', CACHE));
      if (cache.count > 0 && cache.media === 'hdd') out.push(f('S2D-002', 'error', 'storage.driveLayout.cache', 'Cache drives must be flash (NVMe or SSD); HDD is capacity only.', SYSREQ));
      return out;
    },
  },
  {
    id: 'S2D-003',
    requires: 's2d',
    learnUrl: HW,
    check: (p) => {
      const { capacity, cache } = p.storage.driveLayout;
      if (capacity.count === 0) return [];
      const out: Finding[] = [];
      if (cache.count > 0 && cache.count < 2) out.push(f('S2D-003', 'error', 'storage.driveLayout.cache', 'Every server needs at least two cache drives, the minimum for redundancy.', CHOOSE));
      if (cache.count > 0 && capacity.count < 4) out.push(f('S2D-003', 'error', 'storage.driveLayout.capacity', 'With a cache tier each server needs at least four capacity drives (two cache plus four capacity).', HW));
      if (cache.count === 0 && capacity.count < 2) out.push(f('S2D-003', 'error', 'storage.driveLayout.capacity', 'Azure Local needs at least two capacity drives per server.', HW));
      return out;
    },
  },
  {
    id: 'S2D-004',
    requires: 's2d',
    learnUrl: SYSREQ,
    check: (p) => {
      const { capacity, cache } = p.storage.driveLayout;
      if (cache.count === 0 || capacity.count === 0) return [];
      const out: Finding[] = [];
      if (cache.sizeTB > 0 && cache.sizeTB < 0.032) out.push(f('S2D-004', 'error', 'storage.driveLayout.cache', 'Cache drives must be 32 GB or larger.', SYSREQ));
      if (capacity.media === 'hdd') {
        const s = capacitySummary(p);
        if (s.cacheToCapacity > 0 && s.cacheToCapacity < 0.15) out.push(f('S2D-004', 'warning', 'storage.driveLayout.cache', `Hybrid deployments need a cache-to-capacity ratio of at least 15%; this design is ${(s.cacheToCapacity * 100).toFixed(1)}%.`, SYSREQ));
      }
      if (capacity.count % cache.count !== 0) out.push(f('S2D-004', 'warning', 'storage.driveLayout.capacity', 'Make the number of capacity drives a whole multiple of the number of cache drives for consistent performance (for example 8 capacity drives for 4 or 2 cache drives).', CHOOSE));
      return out;
    },
  },
  {
    id: 'S2D-005',
    requires: 's2d',
    learnUrl: SYSREQ,
    check: (p) =>
      p.hardware.nodes.length > 1 && p.storage.driveLayout.capacity.count > 0 && p.storage.driveLayout.capacity.media === 'hdd'
        ? [f('S2D-005', 'info', 'storage.driveLayout.capacity', 'For multi-node clusters Microsoft strongly recommends all-flash with a single drive type (NVMe or SSD) and uniform performance. HDD capacity is supported only as a hybrid with a flash cache.', SYSREQ)]
        : [],
  },
  {
    id: 'S2D-006',
    requires: 's2d',
    learnUrl: CHOOSE,
    check: (p) => {
      const s = capacitySummary(p);
      return s.rawPerNodeTB > 400
        ? [f('S2D-006', 'warning', 'storage.driveLayout.capacity', `Microsoft recommends limiting capacity to about 400 TB per server; this design has ${s.rawPerNodeTB.toFixed(1)} TB. More capacity per server means longer resync after downtime or updates.`, CHOOSE)]
        : [];
    },
  },
  {
    id: 'S2D-007',
    requires: 's2d',
    learnUrl: FAULT,
    check: (p) => {
      const nodes = p.hardware.nodes.length;
      const allowed = allowedResiliency(nodes);
      const out: Finding[] = [];
      for (const v of p.storage.volumes) {
        if (v.resiliency === 'four-way') continue; // rack-aware, covered by STO-001 and STO-002
        if (!allowed.includes(v.resiliency)) {
          const need = v.resiliency === 'three-way' ? 'three servers' : 'four servers';
          out.push(f('S2D-007', 'error', 'storage.volumes', `Volume ${v.name || '(unnamed)'}: ${v.resiliency === 'three-way' ? 'three-way mirror' : 'dual parity'} needs at least ${need}; the design has ${nodes}.`, FAULT));
        }
      }
      return out;
    },
  },
  {
    id: 'S2D-008',
    requires: 's2d',
    learnUrl: RESERVE,
    check: (p) => {
      const s = capacitySummary(p);
      if (s.rawTB === 0 || p.storage.volumes.length === 0) return [];
      return s.freeTB < 0
        ? [f('S2D-008', 'error', 'storage.volumes', `The volumes need ${s.footprintTB.toFixed(1)} TB of pool capacity, but only ${s.availableTB.toFixed(1)} TB is available after reserving ${s.reserveTB.toFixed(1)} TB (one capacity drive per server, up to four) for in-place repair.`, RESERVE)]
        : [];
    },
  },
  {
    id: 'S2D-009',
    requires: 's2d',
    learnUrl: PLAN,
    check: (p) => {
      const out: Finding[] = [];
      for (const v of p.storage.volumes) {
        if (v.sizeGiB / 931.3225746154785 > 64) out.push(f('S2D-009', 'warning', 'storage.volumes', `Volume ${v.name}: Microsoft recommends limiting each volume to 64 TB.`, PLAN));
        else if (p.operations.backup && v.sizeGiB / 931.3225746154785 > 10) out.push(f('S2D-009', 'info', 'storage.volumes', `Volume ${v.name}: a backup solution that uses VSS and the Volsnap provider performs better with volumes up to 10 TB; solutions on the Hyper-V RCT API or ReFS block cloning do well up to 32 TB and beyond.`, PLAN));
      }
      return out;
    },
  },
  {
    id: 'S2D-011',
    requires: 's2d',
    learnUrl: SYSREQ,
    check: (p) =>
      p.hardware.nodes.some((n) => n.memoryGiB > 768)
        ? [f('S2D-011', 'info', 'hardware.nodes', 'For machines with more than 768 GB of memory Microsoft recommends OS disks of 400 GB or more, so a kernel memory dump can be written to the OS volume when troubleshooting.', SYSREQ)]
        : [],
  },
  {
    id: 'S2D-012',
    requires: 's2d',
    learnUrl: HW,
    check: (p) => {
      const drives = p.hardware.nodes.map((n) => n.drives);
      return usesS2d(p.storage.architecture) && new Set(drives).size > 1
        ? [f('S2D-012', 'warning', 'hardware.nodes', 'Use the same number and types of drives in every server (drive symmetry); uneven drives strand capacity.', HW)]
        : [];
    },
  },
];