import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../src/model/defaults';
import { projectSchema } from '../src/model/schema';
import { rules, runRules } from '../src/rules';
import type { Rule } from '../src/rules/types';

describe('model', () => {
  it('createEmptyProject validates against projectSchema', () => {
    expect(() => projectSchema.parse(createEmptyProject('Test project'))).not.toThrow();
  });

  it('rejects an invalid release version', () => {
    const project = createEmptyProject('Bad release');
    project.release.version = '2610' as never;
    expect(() => projectSchema.parse(project)).toThrow();
  });

  it('runRules with no rules returns an empty array', () => {
    expect(runRules(createEmptyProject('Empty rules'))).toEqual([]);
  });

  it('does not run a rule restricted to a different release', () => {
    const rule: Rule = {
      id: 'R1',
      release: ['2608'],
      learnUrl: 'https://example.com',
      check: () => [{ id: 'F1', severity: 'error', field: 'release', message: 'Should not appear', learnUrl: 'https://example.com' }],
    };
    rules.push(rule);
    try {
      expect(runRules(createEmptyProject('2609 project'))).toEqual([]);
    } finally {
      rules.length = 0;
    }
  });
});