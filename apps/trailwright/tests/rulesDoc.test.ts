import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rules } from '../src/rules';
import { buildRulesDoc } from './rulesDoc';

describe('docs/RULES.md', () => {
  // npm run docs:rules sets UPDATE_RULES_DOC to rewrite the file from the registry before the checks.
  if (process.env.UPDATE_RULES_DOC) writeFileSync(resolve(__dirname, '..', '..', '..', 'docs', 'RULES.md'), buildRulesDoc());
  const doc = readFileSync(resolve(__dirname, '..', '..', '..', 'docs', 'RULES.md'), 'utf8').replace(/\r\n/g, '\n');

  it('is current: regenerate with npm run docs:rules when a rule changes', () => {
    expect(doc).toBe(buildRulesDoc());
  });
  it('lists every rule with a Learn URL', () => {
    for (const rule of rules) expect(doc).toContain(`| ${rule.id} |`);
    expect(rules.every((r) => r.learnUrl.startsWith('https://learn.microsoft.com/'))).toBe(true);
  });
  it('states the release as 12.2609 (latest) and never names a private build', () => {
    expect(doc).toContain('12.2609 (latest)');
    expect(doc).not.toMatch(/26[9]0/);
  });
});
