import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExampleProject } from '../src/examples/exampleLab';
import { buildCompareCsv, buildCompareMarkdown, compareAsBuilt, summarize } from '../src/asbuilt/compare';
import { parseSnapshot, type Snapshot } from '../src/asbuilt/snapshot';

const fixture = (name: string): string => readFileSync(resolve(__dirname, 'fixtures', 'as-built', name), 'utf8');
const load = (text: string): Snapshot => {
  const r = parseSnapshot(text);
  if (!r.ok) throw new Error(r.error);
  return r.snapshot;
};
const find = (rows: ReturnType<typeof compareAsBuilt>, item: string) => rows.find((r) => r.item === item);

describe('as-built snapshot parsing', () => {
  it('accepts the snapshot made from a Ranger manifest by the sample script', () => {
    expect(parseSnapshot(fixture('from-ranger.snapshot.json')).ok).toBe(true);
  });
  it('refuses another schema, bad JSON and bad values, with a reason', () => {
    const wrong = parseSnapshot('{"schema":"as-built-snapshot.v2"}');
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toContain('as-built-snapshot.v1');
    expect(parseSnapshot('nope').ok).toBe(false);
    const bad = parseSnapshot('{"schema":"as-built-snapshot.v1","identity":{"model":"workgroup"}}');
    expect(bad.ok).toBe(false);
  });
});

describe('as-built compare against a Ranger-derived snapshot', () => {
  const rows = compareAsBuilt(createExampleProject(), load(fixture('from-ranger.snapshot.json')));

  it('matches what was built as designed', () => {
    for (const item of ['release', 'model', 'domain or DNS zone', 'witness', 'node count', 'node1', 'node2', 'node1 serial number', 'VLAN 100 (Management)', 'VLAN 711 (Storage 1)', 'DNS servers', 'intent Management_Compute traffic', 'intent Storage adapters', 'infrastructure resiliency', 'infrastructure size (GiB)']) {
      expect(find(rows, item)?.status, item).toBe('match');
    }
  });
  it('reports drift where the build differs, and what was built but not designed', () => {
    expect(find(rows, 'node2 serial number')).toMatchObject({ status: 'drift', design: 'EXAMPLE-0002', asBuilt: 'EXAMPLE-0099' });
    expect(find(rows, 'workloads size (GiB)')).toMatchObject({ status: 'drift', severity: 'warning' });
    expect(find(rows, 'VLAN 300')).toMatchObject({ status: 'drift', design: 'not in the design' });
    expect(find(rows, 'scratch')).toMatchObject({ status: 'drift' });
  });
  it('summarizes and exports to CSV and Markdown', () => {
    const c = summarize(rows);
    expect(c.drift).toBeGreaterThanOrEqual(4);
    expect(c.missing).toBe(0);
    const csv = buildCompareCsv(rows);
    expect(csv.split('\n')[0]).toBe('Area,Item,Design,As-built,Status,Severity');
    expect(csv.split('\n')).toHaveLength(rows.length + 1);
    expect(buildCompareMarkdown(createExampleProject(), rows)).toContain('12.2609 (latest)');
  });
});

describe('as-built compare edge cases', () => {
  const p = createExampleProject();

  it('reports a designed node that was not built as missing, and a release from another train as drift', () => {
    const rows = compareAsBuilt(p, load(JSON.stringify({ schema: 'as-built-snapshot.v1', cluster: { release: '12.2610.1.1' }, nodes: [{ name: 'node1' }] })));
    expect(find(rows, 'node2')).toMatchObject({ status: 'missing', severity: 'error' });
    expect(find(rows, 'release')).toMatchObject({ status: 'drift', severity: 'error' });
    expect(find(rows, 'node count')).toMatchObject({ status: 'drift' });
  });
  it('says "not captured" for areas the snapshot does not have, instead of inventing missing items', () => {
    const rows = compareAsBuilt(p, load('{"schema":"as-built-snapshot.v1"}'));
    expect(rows.every((r) => r.status === 'not-captured')).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(7);
  });
  it('compares a build entered in the design exactly', () => {
    const q = createExampleProject();
    q.release = { ...q.release, build: '12.2609.1003.7' };
    expect(find(compareAsBuilt(q, load('{"schema":"as-built-snapshot.v1","cluster":{"release":"12.2609.1003.7"}}')), 'release')?.status).toBe('match');
    expect(find(compareAsBuilt(q, load('{"schema":"as-built-snapshot.v1","cluster":{"release":"12.2609.9.9"}}')), 'release')?.status).toBe('drift');
  });
  it('flags a missing designed VLAN and a changed intent, and matches an intent by traffic when the name differs', () => {
    const rows = compareAsBuilt(p, load(JSON.stringify({ schema: 'as-built-snapshot.v1', vlans: [{ id: 100 }], intents: [{ name: 'Mgmt', traffic: ['management', 'compute'], adapters: ['pNIC01'] }] })));
    expect(find(rows, 'VLAN 711 (Storage 1)')?.status).toBe('missing');
    expect(find(rows, 'intent Management_Compute adapters')?.status).toBe('drift');
    expect(find(rows, 'intent Storage')).toMatchObject({ status: 'missing' });
  });
  it('protects the CSV from spreadsheet formulas', () => {
    const rows = compareAsBuilt(p, load('{"schema":"as-built-snapshot.v1","nodes":[{"name":"=cmd"}]}'));
    expect(buildCompareCsv(rows)).toContain("'=cmd");
  });
});
