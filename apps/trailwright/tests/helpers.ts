import { createEmptyProject } from '../src/model/defaults';
import type { Project } from '../src/model/schema';

export type DeepPartial<T> = T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export function makeNodes(count: number) {
  return Array.from({ length: count }, (_, i) => ({ name: `n${i + 1}`, cores: 16, memoryGiB: 256, drives: 4 }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key] as Record<string, unknown>, value) : value;
  }
  return result;
}

// A project that satisfies every rule; tests change one thing at a time.
const compliant: DeepPartial<Project> = {
  hardware: { topology: 'standard', witness: 'cloud', nodes: makeNodes(2) },
  identity: { mode: 'active-directory', domain: 'example.com' },
  networking: {
    storage: 'switched',
    vlans: [{ name: 'Storage 1', id: 711 }, { name: 'Storage 2', id: 712 }],
    intents: [
      { name: 'Management', traffic: ['management', 'compute'], adapters: ['p1', 'p2'] },
      { name: 'Storage', traffic: ['storage'], adapters: ['p3', 'p4'] },
    ],
  },
};

export function project(overrides: DeepPartial<Project> = {}): Project {
  const base = createEmptyProject('test') as unknown as Record<string, unknown>;
  return merge(merge(base, compliant as Record<string, unknown>), overrides as Record<string, unknown>) as unknown as Project;
}