import { jsPDF } from 'jspdf';
import * as autoTableModule from 'jspdf-autotable';
import { runRules } from '../rules';
import type { Project } from '../model/schema';

type WithTable = jsPDF & { lastAutoTable?: { finalY: number } };
type AutoTable = (doc: jsPDF, options: object) => void;

// jspdf-autotable is a CommonJS package: depending on the bundler the function is the default export or its default.
const candidate = (autoTableModule as unknown as { autoTable?: unknown; default?: unknown }).autoTable ?? (autoTableModule as unknown as { default?: unknown }).default;
const autoTable = (typeof candidate === 'function' ? candidate : (candidate as { default: unknown }).default) as AutoTable;

const nextY = (doc: WithTable): number => (doc.lastAutoTable?.finalY ?? 40) + 10;

export function buildHandoffPdf(p: Project): Uint8Array {
  const doc: WithTable = new jsPDF();
  doc.setFontSize(18);
  doc.text(p.meta.name, 14, 22);
  doc.setFontSize(11);
  doc.text(`Release ${p.release.version}. Topology ${p.hardware.topology}, witness ${p.hardware.witness}.`, 14, 32);

  autoTable(doc, { startY: 40, head: [['Node', 'Serial', 'Cores', 'Memory (GiB)', 'Drives']], body: p.hardware.nodes.map((n) => [n.name, n.serial ?? '', String(n.cores), String(n.memoryGiB), String(n.drives)]) });
  autoTable(doc, { startY: nextY(doc), head: [['VLAN', 'ID']], body: p.networking.vlans.map((v) => [v.name, String(v.id)]) });
  autoTable(doc, { startY: nextY(doc), head: [['IP plan', 'CIDR']], body: p.networking.ipPlan.map((r) => [r.name, r.cidr]) });
  autoTable(doc, { startY: nextY(doc), head: [['Severity', 'Finding', 'Field', 'Source']], body: runRules(p).map((f) => [f.severity, f.message, f.field, f.learnUrl]) });

  return new Uint8Array(doc.output('arraybuffer'));
}