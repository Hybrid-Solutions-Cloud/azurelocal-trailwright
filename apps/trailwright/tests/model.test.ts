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

  it('does not run a rule restricted to a different release', () => {
    const rule: Rule = {
      id: 'ZZ-TEST',
      release: ['2608'],
      learnUrl: 'https://learn.microsoft.com/',
      check: () => [{ id: 'ZZ-TEST', severity: 'error', field: 'release', message: 'Should not appear', learnUrl: 'https://learn.microsoft.com/' }],
    };
    rules.push(rule);
    try {
      expect(runRules(createEmptyProject('2609 project')).map((f) => f.id)).not.toContain('ZZ-TEST');
    } finally {
      rules.splice(rules.indexOf(rule), 1);
    }
  });
});