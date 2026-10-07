import type { Rule } from './types';

const RELEASE_INFO_URL = 'https://learn.microsoft.com/azure/azure-local/release-information-23h2?view=azloc-2609';

// Runs for every release so a project on an older release is told which release this tool plans against.
export const releaseRules: Rule[] = [
  {
    id: 'REL-001',
    release: ['2605', '2606', '2607', '2608', '2609'],
    learnUrl: RELEASE_INFO_URL,
    check: (p) =>
      p.release.version !== '2609'
        ? [{ id: 'REL-001', severity: 'info', field: 'release.version', message: 'Release 2609 is the planning baseline of this tool; rules for other releases are limited.', learnUrl: RELEASE_INFO_URL }]
        : [],
  },
];