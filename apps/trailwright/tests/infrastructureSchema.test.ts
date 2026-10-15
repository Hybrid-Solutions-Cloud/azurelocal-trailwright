import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildInfrastructureYml } from '../src/exports';
import { azureLocalRegions } from '../src/model/regions';
import { projectSchema } from '../src/model/schema';
import { exportProjects } from './exportProjects';

// The published schema for infrastructure.yml (public/schema/infrastructure.schema.json). The build runs this test, so the exporter and the schema cannot drift apart.
const schema = JSON.parse(readFileSync(resolve(__dirname, '..', 'public', 'schema', 'infrastructure.schema.json'), 'utf8')) as Record<string, any>;
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const validate = ajv.compile(schema);

describe('infrastructure.yml matches public/schema/infrastructure.schema.json', () => {
  for (const [label, make] of exportProjects) {
    it(`validates the export of: ${label}`, () => {
      const doc = parse(buildInfrastructureYml(make()));
      const ok = validate(doc);
      expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
    });
  }

  it('rejects an unknown key and a missing section, so drift in either direction is caught', () => {
    const doc = parse(buildInfrastructureYml(exportProjects[0][1]())) as Record<string, unknown>;
    expect(validate({ ...doc, surprise: true })).toBe(false);
    const { sdn: _sdn, ...without } = doc;
    expect(validate(without)).toBe(false);
  });

  it('lists every top-level section the exporter writes', () => {
    const doc = parse(buildInfrastructureYml(exportProjects[0][1]())) as Record<string, unknown>;
    expect(Object.keys(schema.properties).sort()).toEqual(Object.keys(doc).sort());
  });
});

describe('the schema enums follow the project model', () => {
  const enumOf = (path: string[]): unknown[] => path.reduce((node: any, key) => node[key], schema.properties).enum;
  const shape = (section: 'hardware' | 'storage' | 'identity' | 'operations' | 'networking' | 'deployment', key: string) => ((projectSchema.shape as any)[section]._def.innerType?._def ?? (projectSchema.shape as any)[section]._def).shape()[key];
  const options = (field: any): string[] => {
    let f = field;
    while (f._def && !f.options && f._def.innerType) f = f._def.innerType;
    return [...f.options].map(String);
  };

  it('regions', () => {
    expect(enumOf(['environment', 'properties', 'azure_region']).sort()).toEqual(azureLocalRegions.map((r) => r.value).sort());
  });
  it('volume resiliency', () => {
    const volume = (projectSchema.shape.storage.shape.volumes as any).element.shape.resiliency;
    expect(enumOf(['storage', 'properties', 'volumes', 'items', 'properties', 'resiliency']).sort()).toEqual(options(volume).sort());
  });
  it('identity mode, witness, topology and update method', () => {
    expect(enumOf(['identity', 'properties', 'mode']).sort()).toEqual(options(shape('identity', 'mode')).sort());
    expect(enumOf(['compute', 'properties', 'cluster', 'properties', 'witness_type']).sort()).toEqual(options(shape('hardware', 'witness')).sort());
    expect(enumOf(['compute', 'properties', 'cluster', 'properties', 'topology']).sort()).toEqual(options(shape('hardware', 'topology')).sort());
    expect(enumOf(['operations', 'properties', 'update_method']).sort()).toEqual(options(shape('operations', 'updateMethod')).sort());
    expect(enumOf(['operations', 'properties', 'disaster_recovery']).sort()).toEqual(options(shape('operations', 'drMethod')).sort());
  });
});
