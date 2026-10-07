import type { Project } from '../model/schema';
import { SECURE_PARAMETERS, deriveParameters } from './parameters';

const quote = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// A .bicepparam file for the same values. Secure parameters are comments: Bicep gets them from Key Vault at deployment.
export function buildBicepParam(p: Project): string {
  const template = p.identity.mode === 'local-identity-key-vault' ? 'local-identity' : 'active-directory';
  const lines = ["using './main.bicep'", ''];
  for (const d of deriveParameters(p, template)) lines.push(`param ${d.name} = ${typeof d.value === 'number' ? d.value : quote(d.value)}`);
  for (const s of SECURE_PARAMETERS) lines.push(`// ${s.name}: supply from Key Vault at deployment (secret: ${s.secret})`);
  return `${lines.join('\n')}\n`;
}