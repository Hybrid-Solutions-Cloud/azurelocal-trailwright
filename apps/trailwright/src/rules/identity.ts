import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];

const KV_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-local-identity-with-key-vault?view=azloc-2609';
const PREREQ_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-prerequisites?view=azloc-2609';
const OVERVIEW_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-local-identity-with-key-vault-overview?view=azloc-2609#tool-compatibility-in-azure-local-environments-configured-with-azure-key-vault';

export const identityRules: Rule[] = [
  {
    id: 'ID-001',
    release: RELEASES,
    learnUrl: KV_URL,
    check: (p) =>
      p.identity.mode === 'local-identity-key-vault' && !p.identity.keyVaultName?.trim()
        ? [{ id: 'ID-001', severity: 'error', field: 'identity.keyVaultName', message: 'Local identity mode requires a Key Vault name (one Key Vault per cluster).', learnUrl: KV_URL }]
        : [],
  },
  {
    id: 'ID-002',
    release: RELEASES,
    learnUrl: PREREQ_URL,
    check: (p) =>
      p.identity.mode === 'active-directory' && !p.identity.domain?.trim()
        ? [{ id: 'ID-002', severity: 'error', field: 'identity.domain', message: 'Active Directory mode requires a domain name.', learnUrl: PREREQ_URL }]
        : [],
  },
  {
    id: 'ID-003',
    release: RELEASES,
    learnUrl: OVERVIEW_URL,
    check: (p) =>
      p.identity.mode === 'local-identity-key-vault'
        ? [{ id: 'ID-003', severity: 'info', field: 'identity.mode', message: 'With local identity and Key Vault, Windows Admin Center is not supported; use PowerShell, Azure Monitor and the Azure portal.', learnUrl: OVERVIEW_URL }]
        : [],
  },
];