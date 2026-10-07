import { describe, expect, it } from 'vitest';
import { createExampleProject } from '../src/examples/exampleLab';
import { runRules } from '../src/rules';
import { exportKinds } from '../src/exports';
import { projectSchema } from '../src/model/schema';

describe('bundled example project', () => {
  const example = createExampleProject();

  it('is a valid saved project', () => {
    expect(projectSchema.safeParse(example).success).toBe(true);
  });

  it('has no error findings and no warnings, so a new user starts from a clean design', () => {
    const findings = runRules(example).filter((f) => f.severity !== 'info');
    expect(findings).toEqual([]);
  });

  it('exports every kind without failing', async () => {
    for (const kind of exportKinds) {
      const data = await Promise.resolve(kind.build(example));
      expect(data.length, kind.id).toBeGreaterThan(0);
    }
  });

  it('uses only documentation address ranges and placeholder names', () => {
    const text = JSON.stringify(example);
    expect(text).not.toMatch(/\b(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./);
    expect(text).not.toMatch(new RegExp(['nic26', 'tier' + 'point', 'iic'].join('|'), 'i'));
  });
});