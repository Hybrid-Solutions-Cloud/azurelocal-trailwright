import type { Project } from '../model/schema';
import { usesS2d } from '../rules/types';

export type StepGroup = 'Foundation' | 'Hardware' | 'Network' | 'Connectivity' | 'Identity' | 'Deployment' | 'Operations' | 'Output';

export type Step = {
  path: string;
  title: string;
  group: StepGroup;
  // The step shows only when earlier answers need it.
  visible: (p: Project) => boolean;
  // Why a hidden step is hidden, shown if someone opens it directly.
  hiddenBecause?: string;
  // Fields whose findings count against this step.
  fields: string[];
  // A step the person confirms before moving on.
  gate?: boolean;
};

const always = () => true;

// The order of the guided flow. Add a step here and give it a route in App.
export const steps: Step[] = [
  { path: 'project', title: 'Project', group: 'Foundation', visible: always, fields: [] },
  { path: 'deployment', title: 'Connectivity mode and architecture', group: 'Foundation', visible: always, fields: ['deployment', 'landingZone.region'] },
  { path: 'hardware', title: 'Hardware and topology', group: 'Hardware', visible: always, fields: ['hardware'] },
  { path: 'storage', title: 'Storage', group: 'Hardware', visible: always, fields: ['storage'] },
  {
    path: 'network-design',
    title: 'Network design',
    group: 'Network',
    visible: always,
    fields: ['networking.storage', 'networking.portsPerNode', 'networking.storageAutoIp', 'networking.storageSubnets', 'networking.torSwitches'],
    gate: true,
  },
  {
    path: 'networking',
    title: 'Intents, VLANs and IP plan',
    group: 'Network',
    visible: always,
    fields: ['networking.intents', 'networking.vlans', 'networking.ipPlan'],
    gate: true,
  },
  { path: 'infrastructure', title: 'Management network', group: 'Network', visible: always, fields: ['infrastructure', 'hardware.nodes'], gate: true },
  { path: 'connectivity', title: 'Outbound connectivity', group: 'Connectivity', visible: always, fields: ['connectivity'] },
  { path: 'identity', title: 'Identity', group: 'Identity', visible: always, fields: ['identity'] },
  { path: 'security', title: 'Security', group: 'Deployment', visible: always, fields: ['security'] },
  { path: 'provisioning', title: 'Provisioning and deployment method', group: 'Deployment', visible: always, fields: ['provisioning'] },
  { path: 'landing-zone', title: 'Azure resources', group: 'Identity', visible: always, fields: ['landingZone'] },
  { path: 'operations', title: 'Operations', group: 'Operations', visible: always, fields: ['operations'] },
  { path: 'review', title: 'Review and export', group: 'Output', visible: always, fields: [] },
];

export const visibleSteps = (p: Project): Step[] => steps.filter((s) => s.visible(p));

// Re-exported so step authors can write the same predicates the rules use.
export { usesS2d };