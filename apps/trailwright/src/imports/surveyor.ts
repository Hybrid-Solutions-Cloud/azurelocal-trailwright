import { projectSchema } from '../model/schema';
import type { Project } from '../model/schema';

// Import of a Surveyor plan manifest (schemaVersion 1.x): hardware and volumes become nodes and volumes of the design.

export type ImportPatch = {
  nodes: Project['hardware']['nodes'];
  volumes: Project['storage']['volumes'];
  notes?: string;
};

export type Conflict = { field: string; current: string; incoming: string };

type Resiliency = Project['storage']['volumes'][number]['resiliency'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function mapResiliency(input: string): Resiliency | undefined {
  switch (input) {
    case 'two-way-mirror':
      return 'two-way';
    case 'three-way-mirror':
      return 'three-way';
    case 'dual-parity':
      return 'parity';
    default:
      return undefined;
  }
}

export function parseSurveyorPlan(text: string): { ok: true; patch: ImportPatch } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'Invalid JSON: expected an object' };

  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== 'string' || !schemaVersion.startsWith('1.')) {
    return { ok: false, error: `Unsupported schemaVersion: ${String(schemaVersion)}. Only 1.x manifests are supported.` };
  }
  if (!isRecord(parsed.inputs)) return { ok: false, error: 'Missing inputs' };
  const hardware = parsed.inputs.hardware;
  if (!isRecord(hardware)) return { ok: false, error: 'Missing inputs.hardware' };

  const nodeCount = Number(hardware.nodeCount);
  if (!Number.isInteger(nodeCount) || nodeCount < 1 || nodeCount > 64) {
    return { ok: false, error: `nodeCount must be an integer from 1 to 64 (got ${String(hardware.nodeCount)})` };
  }
  const drives = (Number(hardware.capacityDrivesPerNode) || 0) + (Number(hardware.cacheDrivesPerNode) || 0);
  const nodes: ImportPatch['nodes'] = Array.from({ length: nodeCount }, (_, i) => ({
    name: `node${i + 1}`,
    cores: Number(hardware.coresPerNode) || 0,
    memoryGiB: Number(hardware.memoryPerNodeGB) || 0,
    drives,
  }));

  // A volume with a resiliency this tool does not know is skipped; the rest are still imported.
  const volumes: ImportPatch['volumes'] = [];
  if (Array.isArray(parsed.inputs.volumes)) {
    for (const v of parsed.inputs.volumes) {
      if (!isRecord(v) || typeof v.resiliency !== 'string') continue;
      const resiliency = mapResiliency(v.resiliency);
      if (resiliency) volumes.push({ name: String(v.name ?? ''), sizeGiB: Math.round(Number(v.plannedSizeTB) * 1024), resiliency });
    }
  }

  const notes = isRecord(parsed.provenance) && typeof parsed.provenance.notes === 'string' ? parsed.provenance.notes : undefined;
  return { ok: true, patch: notes === undefined ? { nodes, volumes } : { nodes, volumes, notes } };
}

// Differences that matter, listed only where the design already holds data, so an empty design previews no conflicts.
export function previewConflicts(current: Project, patch: ImportPatch): Conflict[] {
  const conflicts: Conflict[] = [];
  const nodes = current.hardware.nodes;
  if (nodes.length > 0) {
    if (nodes.length !== patch.nodes.length) conflicts.push({ field: 'nodes.count', current: String(nodes.length), incoming: String(patch.nodes.length) });
    const [a, b] = [nodes[0], patch.nodes[0]];
    if (a && b && a.cores !== b.cores) conflicts.push({ field: 'nodes[0].cores', current: String(a.cores), incoming: String(b.cores) });
    if (a && b && a.memoryGiB !== b.memoryGiB) conflicts.push({ field: 'nodes[0].memoryGiB', current: String(a.memoryGiB), incoming: String(b.memoryGiB) });
  }
  const volumes = current.storage.volumes;
  if (volumes.length > 0 && volumes.length !== patch.volumes.length) {
    conflicts.push({ field: 'volumes.count', current: String(volumes.length), incoming: String(patch.volumes.length) });
  }
  const notes = current.project.notes.trim();
  if (notes && patch.notes !== undefined && notes !== patch.notes.trim()) conflicts.push({ field: 'notes', current: notes, incoming: patch.notes.trim() });
  return conflicts;
}

export function applyPatch(current: Project, patch: ImportPatch): Project {
  const existing = current.project.notes.trim();
  const incoming = patch.notes?.trim();
  const notes = incoming ? (existing ? `${existing}\n${incoming}` : incoming) : current.project.notes;
  return projectSchema.parse({
    ...current,
    hardware: { ...current.hardware, nodes: patch.nodes },
    storage: { ...current.storage, volumes: patch.volumes },
    project: { ...current.project, notes },
  });
}