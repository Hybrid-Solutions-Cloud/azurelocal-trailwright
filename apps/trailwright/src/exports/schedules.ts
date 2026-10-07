import * as XLSX from 'xlsx';
import type { Project } from '../model/schema';

export type ScheduleKind = 'nodes' | 'vlans' | 'ip-plan';
type Cell = string | number;

// A spreadsheet runs a cell that starts with = + - @ tab or CR as a formula; a leading quote keeps it text.
export function guard(value: Cell | undefined): Cell {
  if (typeof value !== 'string') return value ?? '';
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

// Every VLAN the design uses and what it is for. A disaggregated fabric also needs the VXLAN network identifier of each VLAN;
// the Learn reference patterns use VNI = 10000 + VLAN (VLAN 7 is 10007, VLAN 1711 is 11711, VLAN 300 is 10300).
export function vlanRows(p: Project): Cell[][] {
  const da = p.deployment.architecture === 'disaggregated';
  const list: { name: string; id: number; purpose: string }[] = p.networking.vlans.map((v) => ({ name: v.name, id: v.id, purpose: 'network' }));
  if (p.infrastructure.managementVlan > 0) list.push({ name: 'Management', id: p.infrastructure.managementVlan, purpose: 'Azure Local infrastructure and management' });
  if (!da && p.deployment.architecture !== 'disaggregated' && p.storage.architecture !== 'san') p.networking.storageVlans.forEach((id, k) => list.push({ name: `Storage ${k + 1}`, id, purpose: 'storage network' }));
  if (da) {
    list.push({ name: 'Cluster network 1', id: 1711, purpose: 'cluster (CSV, live migration, heartbeat)' }, { name: 'Cluster network 2', id: 1712, purpose: 'cluster (CSV, live migration, heartbeat)' });
    if (p.deployment.sanType === 'iscsi') list.push({ name: 'iSCSI path A', id: 300, purpose: 'iSCSI' }, { name: 'iSCSI path B', id: 400, purpose: 'iSCSI' });
    if (p.networking.backupNetwork) list.push({ name: 'Backup', id: 800, purpose: 'in-guest backup (trunk on the management and compute intent)' });
  }
  const seen = new Set<string>();
  const unique = list.filter((v) => (seen.has(`${v.name}|${v.id}`) ? false : (seen.add(`${v.name}|${v.id}`), true)));
  return [da ? ['Name', 'ID', 'Purpose', 'VNI'] : ['Name', 'ID', 'Purpose'], ...unique.map((v) => (da ? [v.name, v.id, v.purpose, 10000 + v.id] : [v.name, v.id, v.purpose]))];
}

function rows(p: Project, kind: ScheduleKind): Cell[][] {
  if (kind === 'nodes') return [['Name', 'Serial', 'Cores', 'Memory (GiB)', 'Drives'], ...p.hardware.nodes.map((n) => [n.name, n.serial ?? '', n.cores, n.memoryGiB, n.drives])];
  if (kind === 'vlans') return vlanRows(p);
  return [['Name', 'CIDR'], ...p.networking.ipPlan.map((r) => [r.name, r.cidr])];
}

function csvCell(value: Cell | undefined): string {
  const s = String(guard(value));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildSchedulesCsv(p: Project, kind: ScheduleKind): string {
  return `${rows(p, kind).map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function buildSchedulesXlsx(p: Project): Uint8Array {
  const book = XLSX.utils.book_new();
  const sheets: [string, ScheduleKind][] = [['Nodes', 'nodes'], ['VLANs', 'vlans'], ['IP plan', 'ip-plan']];
  for (const [name, kind] of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows(p, kind).map((r) => r.map((c) => guard(c)))), name);
  }
  return new Uint8Array(XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer);
}