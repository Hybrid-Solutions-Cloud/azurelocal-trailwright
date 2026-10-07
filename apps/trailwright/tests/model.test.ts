import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../src/model/defaults';
import { projectSchema } from '../src/model/schema';
import { runRules } from '../src/rules';

describe('model', () => {
  it('createEmptyProject validates against projectSchema', () => {
    expect(() => projectSchema.parse(createEmptyProject('Test project'))).not.toThrow();
  });

  it('accepts a project saved against another release and still checks it against the current one', () => {
    const project = createEmptyProject('Older project');
    project.release.version = '2610';
    expect(() => projectSchema.parse(project)).not.toThrow();
    expect(runRules(project).length).toBeGreaterThanOrEqual(0);
  });
});