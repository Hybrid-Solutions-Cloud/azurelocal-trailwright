import type { Finding, Rule } from './types';
import type { Project } from '../model/schema';

export const rules: Rule[] = [];

// Only rules written for the project's release run, in id order.
export function runRules(p: Project): Finding[] {
  return rules
    .filter((rule) => rule.release.includes(p.release.version))
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((rule) => rule.check(p));
}