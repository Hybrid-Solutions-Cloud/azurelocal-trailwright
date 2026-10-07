import type { Project } from '../model/schema';
import { usesS2d, usesSan, type Finding, type Rule } from './types';
import { connectivityRules } from './connectivity';
import { hardwareRules } from './hardware';
import { identityRules } from './identity';
import { landingZoneRules } from './landingZone';
import { networkingRules } from './networking';
import { releaseRules } from './release';
import { storageRules } from './storage';

export const rules: Rule[] = [
  ...hardwareRules,
  ...identityRules,
  ...networkingRules,
  ...connectivityRules,
  ...landingZoneRules,
  ...storageRules,
  ...releaseRules,
];

// Only rules written for the project's release run, in id order.
export function runRules(project: Project): Finding[] {
  return rules
    .filter((rule) => rule.release.includes(project.release.version))
    .filter((rule) => (rule.requires === 's2d' ? usesS2d(project) : rule.requires === 'san' ? usesSan(project) : true))
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((rule) => rule.check(project));
}