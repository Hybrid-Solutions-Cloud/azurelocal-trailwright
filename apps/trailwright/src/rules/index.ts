import type { Project } from '../model/schema';
import type { Finding, Rule } from './types';
import { hardwareRules } from './hardware';
import { identityRules } from './identity';
import { networkingRules } from './networking';
import { releaseRules } from './release';

export const rules: Rule[] = [...hardwareRules, ...identityRules, ...networkingRules, ...releaseRules];

// Only rules written for the project's release run, in id order.
export function runRules(project: Project): Finding[] {
  return rules
    .filter((rule) => rule.release.includes(project.release.version))
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((rule) => rule.check(project));
}