// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parse } from 'yaml';
import { exportKinds, buildArmParameters, buildBicepParam, buildInfrastructureYml, buildSchedulesCsv, buildSchedulesXlsx, buildTopologyDrawio, buildHandoffMarkdown, buildProjectJson } from '../src/exports';
import { projectSchema } from '../src/model/schema';
import { makeNodes, project } from './helpers';

const SECRET = 'P@ssw0rd!Typed';

// A design whose free text and names try to do harm: a typed secret, a spreadsheet formula, script and link text, markup.
function hostile() {
  return project({
    meta: { name: 'Edge <b>site</b> & "co"' },
    project: { customer: "=cmd|' /C calc'!A0", owner: 'Owner', notes: `${SECRET} <script>alert(1)</script> javascript:alert(1)` },
    hardware: { nodes: [{ name: '=node1', serial: '<script>x</script>', cores: 16, memoryGiB: 256, drives: 4 }, ...makeNodes(1)], witness: 'cloud' },
    identity: { mode: 'local-identity-key-vault', keyVaultName: 'kv-example' },
    networking: { vlans: [{ name: '@mgmt', id: 711 }, { name: 'ok', id: 712 }] },
    landingZone: { subscriptionName: 'sub-example', resourceGroup: 'rg-example', keyVaultName: 'kv-example', witnessStorageAccount: 'stwitness01' },
  });
}

describe('every export', () => {
  const p = hostile();
  for (const kind of exportKinds) {
    it(`${kind.id} builds non-empty output with a sensible file name`, () => {
      const out = kind.build(p);
      expect(out.length).toBeGreaterThan(0);
      expect(kind.filename(p)).toMatch(/^[a-z0-9.-]+$/);
    });
  }
});

describe('no secrets and no executable content', () => {
  const p = hostile();
  const machine = {
    'infrastructure.yml': buildInfrastructureYml(p),
    'ARM (Active Directory)': buildArmParameters(p, 'active-directory'),
    'ARM (Local Identity)': buildArmParameters(p, 'local-identity'),
    bicepparam: buildBicepParam(p),
    'nodes csv': buildSchedulesCsv(p, 'nodes'),
    'vlans csv': buildSchedulesCsv(p, 'vlans'),
    'ip plan csv': buildSchedulesCsv(p, 'ip-plan'),
    drawio: buildTopologyDrawio(p),
  };

  for (const [name, text] of Object.entries(machine)) {
    it(`${name} never contains the typed secret or script text from the notes`, () => {
      expect(text).not.toContain(SECRET);
      expect(text).not.toContain('javascript:');
    });
  }

  it('ARM files hold secure parameters only as Key Vault references', () => {
    for (const template of ['active-directory', 'local-identity'] as const) {
      const doc = JSON.parse(buildArmParameters(p, template)) as { parameters: Record<string, { value?: unknown; reference?: { secretName: string } }> };
      expect(doc.parameters.localAdminPassword.value).toBeUndefined();
      expect(doc.parameters.localAdminPassword.reference?.secretName).toBe('local-admin-password');
      expect(doc.parameters.AzureStackLCMAdminPassword.reference?.secretName).toBe('lcm-password');
    }
  });

  it('Bicep parameters carry no password value', () => {
    expect(buildBicepParam(p)).not.toMatch(/param\s+\w*password\w*\s*=/i);
  });

  it('infrastructure.yml references secrets as keyvault:// paths', () => {
    const doc = parse(buildInfrastructureYml(p)) as { identity: { secrets: { name: string; value: string }[] } };
    for (const s of doc.identity.secrets) expect(s.value).toBe(`keyvault://kv-example/${s.name}`);
  });

  it('a spreadsheet cell that starts with a formula character is stored as text', () => {
    expect(buildSchedulesCsv(p, 'nodes')).toContain("'=node1");
    expect(buildSchedulesCsv(p, 'vlans')).toContain("'@mgmt");
    const book = XLSX.read(buildSchedulesXlsx(p), { type: 'array' });
    const csv = XLSX.utils.sheet_to_csv(book.Sheets['Nodes']);
    expect(csv).toContain("'=node1");
    expect(Object.values(book.Sheets['Nodes']).some((c) => typeof c === 'object' && c !== null && 'f' in c)).toBe(false);
  });

  it('the draw.io file is well-formed XML with escaped labels and no scripts or links', () => {
    const xml = buildTopologyDrawio(p);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
    expect(xml).not.toMatch(/<script|href=|javascript:/i);
    expect(xml).toContain('Edge &lt;b&gt;site&lt;/b&gt; &amp; &quot;co&quot;');
  });

  it('the design handoff and the project file do carry the free text (they are the record), and say secrets are references', () => {
    expect(buildHandoffMarkdown(p)).toContain(SECRET);
    expect(buildHandoffMarkdown(p)).toContain('Secrets are held as Key Vault references only.');
    expect(projectSchema.parse(JSON.parse(buildProjectJson(p)))).toBeTruthy();
  });

  it('the Excel file is a zip', () => {
    const bytes = buildSchedulesXlsx(p);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
  });
});

describe('derived values', () => {
  it('a two-node cluster gets the Cloud witness type whatever the project says', () => {
    const p = project({ hardware: { nodes: makeNodes(2), witness: 'file-share' } });
    expect((JSON.parse(buildArmParameters(p, 'active-directory')) as { parameters: { witnessType: { value: string } } }).parameters.witnessType.value).toBe('Cloud');
  });

  it('infrastructure.yml parses back with the registry schema version', () => {
    const doc = parse(buildInfrastructureYml(hostile())) as { _metadata: { schema_version: string } };
    expect(doc._metadata.schema_version).toBe('4.0.0');
  });

  it('a PDF is produced', () => {
    const pdf = exportKinds.find((k) => k.id === 'handoff-pdf')!.build(hostile()) as Uint8Array;
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
  });
});