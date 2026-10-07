import { describe, expect, it } from 'vitest';
import { buildDisconnectedScript, targetSolutionVersions } from '../src/exports/disconnectedScript';
import { exportKinds } from '../src/exports';
import { runRules } from '../src/rules';
import { makeNodes, project } from './helpers';

const dop = () =>
  project({
    deployment: { mode: 'disconnected' },
    hardware: { nodes: makeNodes(3), witness: 'none' },
    identity: { mode: 'active-directory', domain: 'lab.example.com', ouPath: 'OU=azl,DC=lab,DC=example,DC=com', lcmUsername: 'lcm', localAdminUsername: 'admin' },
    infrastructure: { startIp: '192.0.2.50', endIp: '192.0.2.60', subnetMask: '255.255.255.0' },
    disconnected: { domainSuffix: 'autonomous.cloud.private', ingressIp: '192.0.2.115', ingressGateway: '192.0.2.1', dnsServer: '192.0.2.10', managementIp: '192.0.2.100', timeServers: 'ntp.lab.example.com', authority: 'https://adfs.lab.example.com/adfs', clientId: 'client-1', rootOperatorUpn: 'operator@lab.example.com', ldapServer: 'dc01.lab.example.com', syncGroupIdentifier: 'CN=ops,DC=lab,DC=example,DC=com' },
  });

describe('disconnected operations', () => {
  it('a complete design has no disconnected errors', () => {
    expect(runRules(dop()).filter((f) => f.id.startsWith('DOP') && f.severity === 'error')).toEqual([]);
  });
  it('an ingress IP inside the deployment range is an error', () => {
    const p = dop();
    p.disconnected.ingressIp = '192.0.2.55';
    expect(runRules(p).some((f) => f.id === 'DOP-002' && f.severity === 'error')).toBe(true);
  });
  it('the script uses the documented cmdlets and the values of the design, and stores no secret', () => {
    const s = buildDisconnectedScript(dop());
    for (const cmd of ['New-ApplianceManagementNetworkConfiguration', 'New-ApplianceIngressNetworkConfiguration', 'New-ApplianceExternalIdentityConfiguration', 'New-ApplianceCertificatesConfiguration', 'Install-Appliance', 'Add-AzLocalEnvironment', 'Invoke-AzStackHciArcInitialization']) expect(s).toContain(cmd);
    expect(s).toContain("'autonomous.cloud.private'");
    expect(s).toContain("'12.2609.1003.7'");
    expect(s).toContain('LdapPort = 3269');
    expect(s).not.toMatch(/ConvertTo-SecureString|ConvertTo-Securestring/);
  });
  it('the script export is offered only for disconnected designs', () => {
    const kind = exportKinds.find((k) => k.id === 'disconnected-script')!;
    expect(kind.available?.(dop())).toBe(true);
    expect(kind.available?.(project({}))).toBe(false);
    expect(targetSolutionVersions['2609']).toBe('12.2609.1003.7');
  });
});
