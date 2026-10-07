import * as XLSX from 'xlsx';
import type { Project } from '../model/schema';

export type ScheduleKind = 'nodes' | 'vlans' | 'ip-plan';
type Cell = string | number;

// A spreadsheet runs a cell that starts with = + - @ tab or CR as a formula; a leading quote keeps it text.
export function guard(value: Cell | undefined): Cell {
  if (typeof value !== 'string') return value ?? '';
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function rows(p: Project, kind: ScheduleKind): Cell[][] {
  if (kind === 'nodes') return [['Name', 'Serial', 'Cores', 'Memory (GiB)', 'Drives'], ...p.hardware.nodes.map((n) => [n.name, n.serial ?? '', n.cores, n.memoryGiB, n.drives])];
  if (kind === 'vlans') return [['Name', 'ID'], ...p.networking.vlans.map((v) => [v.name, v.id])];
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