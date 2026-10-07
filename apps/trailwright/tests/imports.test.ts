import { describe, expect, it } from 'vitest';
import { applyPatch, parseSurveyorPlan, previewConflicts } from '../src/imports/surveyor';
import { parseProjectFile } from '../src/imports/projectFile';
import { createEmptyProject } from '../src/model/defaults';
import { projectSchema } from '../src/model/schema';
import { project } from './helpers';

function manifest(nodeCount: number) {
  return {
    schemaVersion: '1.0',
    provenance: { notes: 'Imported from Surveyor' },
    inputs: {
      hardware: { nodeCount, capacityDrivesPerNode: 4, cacheDrivesPerNode: 2, coresPerNode: 16, memoryPerNodeGB: 256 },
      volumes: [
        { name: 'Fast', resiliency: 'two-way-mirror', plannedSizeTB: 2 },
        { name: 'Unknown', resiliency: 'unknown-resiliency', plannedSizeTB: 1 },
        { name: 'Big', resiliency: 'dual-parity', plannedSizeTB: 5.5 },
      ],
    },
  };
}

describe('Surveyor import', () => {
  it('maps a valid manifest to nodes and volumes and skips a volume it does not know', () => {
    const result = parseSurveyorPlan(JSON.stringify(manifest(3)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch.nodes).toHaveLength(3);
    expect(result.patch.nodes[0]).toEqual({ name: 'node1', cores: 16, memoryGiB: 256, drives: 6 });
    expect(result.patch.volumes).toEqual([
      { name: 'Fast', sizeGiB: 2048, resiliency: 'two-way' },
      { name: 'Big', sizeGiB: Math.round(5.5 * 1024), resiliency: 'parity' },
    ]);
    expect(result.patch.notes).toBe('Imported from Surveyor');
  });

  it('rejects another major version and a node count outside 1 to 64', () => {
    const version = parseSurveyorPlan(JSON.stringify({ ...manifest(1), schemaVersion: '2.0' }));
    expect(version.ok).toBe(false);
    if (!version.ok) expect(version.error).toContain('2.0');
    for (const n of [0, 100]) {
      const r = parseSurveyorPlan(JSON.stringify(manifest(n)));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain('nodeCount');
    }
  });

  it('previews no conflicts for an empty design, and the count differences for one that has data', () => {
    const parsed = parseSurveyorPlan(JSON.stringify(manifest(3)));
    if (!parsed.ok) throw new Error('manifest should parse');
    expect(previewConflicts(createEmptyProject('empty'), parsed.patch)).toEqual([]);
    const current = project({
      hardware: { nodes: [{ name: 'a', cores: 16, memoryGiB: 256, drives: 6 }, { name: 'b', cores: 16, memoryGiB: 256, drives: 6 }] },
      storage: { volumes: [{ name: 'v1', sizeGiB: 100, resiliency: 'two-way' }] },
    });
    const conflicts = previewConflicts(current, parsed.patch);
    expect(conflicts).toContainEqual({ field: 'nodes.count', current: '2', incoming: '3' });
    expect(conflicts).toContainEqual({ field: 'volumes.count', current: '1', incoming: '2' });
  });

  it('applies a patch without changing the original and returns a valid project', () => {
    const parsed = parseSurveyorPlan(JSON.stringify(manifest(3)));
    if (!parsed.ok) throw new Error('manifest should parse');
    const current = createEmptyProject('keep');
    const next = applyPatch(current, parsed.patch);
    expect(next).not.toBe(current);
    expect(current.hardware.nodes).toHaveLength(0);
    expect(next.hardware.nodes).toHaveLength(3);
    expect(next.project.notes).toBe('Imported from Surveyor');
    expect(() => projectSchema.parse(next)).not.toThrow();
  });
});

describe('project file', () => {
  it('accepts a saved project and rejects one that is not', () => {
    const ok = parseProjectFile(JSON.stringify(createEmptyProject('x')));
    expect(ok.ok).toBe(true);
    const bad = parseProjectFile('{}');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.length).toBeGreaterThan(0);
  });
});