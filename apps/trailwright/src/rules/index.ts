import type { Project } from '../model/schema';
import { usesS2d, usesSan, type Finding, type Rule } from './types';
import { connectivityRules } from './connectivity';
import { hardwareRules } from './hardware';
import { identityRules } from './identity';
import { landingZoneRules } from './landingZone';
import { networkingRules } from './networking';
import { storageRules } from './storage';
import { operationsRules } from './operations';
import { patternRules } from './pattern';
import { architectureRules } from './architecture';
import { intentRules } from './intents';
import { provisioningRules } from './provisioning';
import { inputRules } from './inputs';
import { s2dRules } from './s2d';
import { portRules } from './ports';
import { disaggregatedRules } from './disaggregated';
import { sdnRules } from './sdn';
import { storageIpRules } from './storageIps';
import { rackRules } from './rack';
import { disconnectedRules } from './disconnected';

export const rules: Rule[] = [
  ...hardwareRules,
  ...identityRules,
  ...networkingRules,
  ...connectivityRules,
  ...landingZoneRules,
  ...storageRules,
  ...operationsRules,
  ...patternRules,
  ...architectureRules,
  ...intentRules,
  ...provisioningRules,
  ...inputRules,
  ...s2dRules,
  ...portRules,
  ...disaggregatedRules,
  ...sdnRules,
  ...storageIpRules,
  ...rackRules,
  ...disconnectedRules,
];

// Every rule follows the current release (see CURRENT_RELEASE), in id order.
export function runRules(project: Project): Finding[] {
  return rules
    .filter((rule) => (rule.requires === 's2d' ? usesS2d(project) : rule.requires === 'san' ? usesSan(project) : true))
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((rule) => rule.check(project));
}