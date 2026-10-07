import type { Project } from '../model/schema';
import { SECURE_PARAMETERS, deriveParameters, type Template } from './parameters';

export type { Template } from './parameters';
export { stillNeeded as armParametersStillNeeded } from './parameters';

// An ARM deployment parameters file. A secure parameter is a Key Vault reference object (not wrapped in "value");
// the vault resource id is left as a marker the person fills in.
export function buildArmParameters(p: Project, template: Template): string {
  const parameters: Record<string, unknown> = {};
  for (const d of deriveParameters(p, template)) parameters[d.name] = { value: d.value };
  for (const s of SECURE_PARAMETERS) parameters[s.name] = { reference: { keyVault: { id: '<set-key-vault-resource-id>' }, secretName: s.secret } };
  return JSON.stringify(
    { $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#', contentVersion: '1.0.0.0', parameters },
    null,
    2,
  );
}