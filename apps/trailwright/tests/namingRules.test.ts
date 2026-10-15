import { describe, expect, it } from 'vitest';
import { runRules } from '../src/rules';
import { project } from './helpers';

const node = (name: string, i: number) => ({ name, ip: `192.0.2.${11 + i}`, cores: 16, memoryGiB: 256, drives: 4 });
const ids = (over: object, id: string) => runRules(project(over as never)).filter((f) => f.id === id);

describe('AZ-005: deployment prefix', () => {
  it('accepts 1 to 8 letters, numbers and hyphens, and an empty prefix (the export derives one)', () => {
    for (const prefix of ['', 'a', 'Azl-0001', '12345678']) expect(ids({ landingZone: { namingPrefix: prefix } }, 'AZ-005'), prefix).toEqual([]);
  });
  it('rejects nine characters and characters outside the pattern, and points at the deployment settings reference', () => {
    for (const prefix of ['123456789', 'ab_cd', 'ab cd', 'abc.de']) {
      const f = ids({ landingZone: { namingPrefix: prefix } }, 'AZ-005');
      expect(f, prefix).toHaveLength(1);
      expect(f[0].severity).toBe('error');
      expect(f[0].learnUrl).toContain('microsoft.azurestackhci');
    }
  });
});

describe('AZ-002: machine and instance name character set', () => {
  it('rejects underscores, spaces, edge hyphens and all-numeric machine names', () => {
    for (const name of ['node_1', 'node 1', '-node', 'node-', '12345']) {
      expect(ids({ hardware: { nodes: [node(name, 0), node('ok1', 1)] } }, 'AZ-002').some((f) => f.field === 'hardware.nodes'), name).toBe(true);
    }
  });
  it('accepts letters, numbers and inner hyphens, and still reports a name longer than 15 characters once', () => {
    expect(ids({ hardware: { nodes: [node('Node-01', 0), node('n2', 1)] } }, 'AZ-002').filter((f) => f.field === 'hardware.nodes')).toEqual([]);
    expect(ids({ hardware: { nodes: [node('a-very-long-name-here', 0), node('n2', 1)] } }, 'AZ-002').filter((f) => f.field === 'hardware.nodes')).toHaveLength(1);
  });
  it('rejects a machine name used twice, ignoring case', () => {
    expect(ids({ hardware: { nodes: [node('Node1', 0), node('node1', 1)] } }, 'AZ-002').some((f) => f.message.includes('more than once'))).toBe(true);
  });
  it('warns about an instance name with characters that are not valid in a NetBIOS or DNS name', () => {
    expect(ids({ landingZone: { instanceName: 'my_cluster' } }, 'AZ-002').some((f) => f.field === 'landingZone.instanceName' && f.severity === 'warning')).toBe(true);
  });
});

describe('REL-001: release build', () => {
  it('accepts a 12.2609 build and an empty build, and warns for another train or a malformed build', () => {
    expect(ids({ release: { build: '12.2609.1003.7' } }, 'REL-001')).toEqual([]);
    expect(ids({ release: { build: '' } }, 'REL-001')).toEqual([]);
    expect(ids({ release: { build: '12.2610.1.1' } }, 'REL-001')).toHaveLength(1);
    expect(ids({ release: { build: '12.2609' } }, 'REL-001')).toHaveLength(1);
  });
});
