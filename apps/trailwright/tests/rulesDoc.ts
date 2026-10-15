import { rules, runRules } from '../src/rules';
import { project } from './helpers';
import { fires } from './ruleCases';

// docs/RULES.md is generated from the rule registry and the one-case-per-rule table (tests/ruleCases.ts).
// Regenerate with: npm run docs:rules --workspace apps/trailwright
const sev = (s: string) => ({ error: 'error', warning: 'warning', info: 'information' })[s] ?? s;

export function buildRulesDoc(): string {
  const lines = [
    '# Validation rules',
    '',
    'Generated from the rule registry (`apps/trailwright/src/rules`); do not edit by hand. Regenerate with `npm run docs:rules` and commit the result. A test fails when this file is out of date.',
    '',
    'Every rule follows the current Azure Local release, 12.2609 (latest), and carries the Microsoft Learn page its claim comes from. The example message is the one produced by the rule\'s test case.',
    '',
    `${rules.length} rules.`,
    '',
    '| Rule | Severity | Applies to | Example message | Learn source |',
    '|---|---|---|---|---|',
  ];
  const cell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  for (const rule of [...rules].sort((a, b) => a.id.localeCompare(b.id))) {
    const found = runRules(project(fires[rule.id] ?? {})).filter((f) => f.id === rule.id);
    const first = found[0];
    const severities = [...new Set(found.map((f) => sev(f.severity)))].join(', ');
    const applies = rule.requires === 's2d' ? 'Storage Spaces Direct designs' : rule.requires === 'san' ? 'SAN designs' : 'All designs';
    lines.push(`| ${rule.id} | ${severities || '-'} | ${applies} | ${cell(first?.message ?? '')} | [Learn](${rule.learnUrl}) |`);
  }
  lines.push(
    '',
    '## Retired rules',
    '',
    '| Rule | Why |',
    '|---|---|',
    '| DA-003 | An Active Directory-only check for disaggregated deployments, added with DA-001 and DA-002 and removed again: Learn lists local identity with Key Vault for disaggregated deployments (the create-cluster-adless-san template), so the check was wrong. |',
    '',
  );
  return lines.join('\n');
}
