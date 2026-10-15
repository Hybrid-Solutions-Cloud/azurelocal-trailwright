import { describe, expect, it } from 'vitest';
import { applyPatch, parseSurveyorPlan, previewConflicts } from '../src/imports/surveyor';
import { createEmptyProject } from '../src/model/defaults';
import { project } from './helpers';

// Surveyor files come in older and newer shapes. The importer reads the newer fields defensively and does not depend on them.
const file = (hardware: Record<string, unknown>, volumes: unknown[] = []) =>
  JSON.stringify({
    kind: 'azurelocal-surveyor-project',
    schemaVersion: 1,
    name: 'Plan',
    inputs: { hardware: { nodeCount: 2, capacityDrivesPerNode: 4, cacheDrivesPerNode: 0, coresPerNode: 16, memoryPerNodeGB: 256, ...hardware }, volumes },
  });

describe('Surveyor import: newer shapes', () => {
  it('maps a nested two-way mirror volume, under either spelling', () => {
    for (const resiliency of ['nested-two-way', 'nested-two-way-mirror']) {
      const r = parseSurveyorPlan(file({}, [{ name: 'N', resiliency, plannedSizeTB: 1 }]));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.patch.volumes).toEqual([{ name: 'N', sizeGiB: 1024, resiliency: 'nested-two-way' }]);
    }
  });
  it('still skips a resiliency it does not know, and keeps the rest', () => {
    const r = parseSurveyorPlan(file({}, [{ name: 'X', resiliency: 'nope', plannedSizeTB: 1 }, { name: 'M', resiliency: 'two-way-mirror', plannedSizeTB: 1 }]));
    expect(r.ok && r.patch.volumes.map((v) => v.name)).toEqual(['M']);
  });
  it('reads a rack-aware cluster from several possible fields, and leaves the topology alone when none says so', () => {
    for (const hardware of [{ rackAware: true }, { topology: 'rack-aware' }, { deploymentType: 'rackAware' }, { clusterType: 'Rack aware' }]) {
      const r = parseSurveyorPlan(file(hardware));
      expect(r.ok && r.patch.topology, JSON.stringify(hardware)).toBe('rack-aware');
    }
    for (const hardware of [{}, { rackAware: false }, { topology: 'standard' }]) {
      const r = parseSurveyorPlan(file(hardware));
      expect(r.ok && r.patch.topology, JSON.stringify(hardware)).toBeUndefined();
    }
  });
  it('applies the rack-aware topology, shows it as a conflict for a design that has nodes, and notes a single machine', () => {
    const r = parseSurveyorPlan(file({ rackAware: true, nodeCount: 4 }));
    if (!r.ok) throw new Error(r.error);
    expect(previewConflicts(project(), r.patch).some((c) => c.field === 'hardware.topology')).toBe(true);
    expect(applyPatch(createEmptyProject('x'), r.patch).hardware.topology).toBe('rack-aware');
    const single = parseSurveyorPlan(file({ nodeCount: 1 }));
    expect(single.ok && single.patch.nodes).toHaveLength(1);
    expect(single.ok && single.patch.notes).toContain('single machine');
  });
  it('an old file with none of the new fields imports exactly as before', () => {
    const r = parseSurveyorPlan(file({}));
    expect(r.ok && Object.keys(r.patch).sort()).toEqual(['name', 'nodes', 'notes', 'volumes'].sort());
  });
});
