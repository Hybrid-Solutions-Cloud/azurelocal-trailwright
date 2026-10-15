import type { jsPDF } from 'jspdf';
import { runRules } from '../rules';
import type { Project } from '../model/schema';

type WithTable = jsPDF & { lastAutoTable?: { finalY: number } };
type AutoTable = (doc: jsPDF, options: object) => void;

const nextY = (doc: WithTable): number => (doc.lastAutoTable?.finalY ?? 40) + 10;

// The PDF libraries are loaded on demand, so the main bundle stays small and they cost nothing until someone exports a PDF.
export async function buildHandoffPdf(p: Project): Promise<Uint8Array> {
  const [{ jsPDF: PDF }, tableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  // jspdf-autotable exports the function as a named export and as the default, depending on the build.
  const candidate = (tableModule as unknown as { autoTable?: unknown; default?: unknown }).autoTable ?? (tableModule as unknown as { default?: unknown }).default;
  const autoTable = (typeof candidate === 'function' ? candidate : (candidate as { default: unknown }).default) as AutoTable;

  const doc: WithTable = new PDF();
  doc.setFontSize(18);
  doc.text(p.meta.name, 14, 22);
  doc.setFontSize(11);
  doc.text(`Azure Local 12.${p.release.version} (latest). Topology ${p.hardware.topology}, witness ${p.hardware.witness}.`, 14, 32);

  autoTable(doc, { startY: 40, head: [['Node', 'Serial', 'Cores', 'Memory (GiB)', 'Drives']], body: p.hardware.nodes.map((n) => [n.name, n.serial ?? '', String(n.cores), String(n.memoryGiB), String(n.drives)]) });
  autoTable(doc, { startY: nextY(doc), head: [['VLAN', 'ID']], body: p.networking.vlans.map((v) => [v.name, String(v.id)]) });
  autoTable(doc, { startY: nextY(doc), head: [['IP plan', 'CIDR']], body: p.networking.ipPlan.map((r) => [r.name, r.cidr]) });
  autoTable(doc, { startY: nextY(doc), head: [['Severity', 'Finding', 'Field', 'Source']], body: runRules(p).map((f) => [f.severity, f.message, f.field, f.learnUrl]) });

  return new Uint8Array(doc.output('arraybuffer'));
}
