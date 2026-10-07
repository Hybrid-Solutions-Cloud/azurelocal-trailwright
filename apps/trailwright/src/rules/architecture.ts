import type { Rule } from './types';

const F = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609';
const D1 = `${F}#decision-1-determine-connectivity-mode`;
const D2 = `${F}#decision-2-determine-architecture`;
const D3 = `${F}#decision-3-determine-cluster-topology`;
const D4 = `${F}#decision-4-determine-cluster-size`;

export const architectureRules: Rule[] = [
  {
    id: 'ARC-001',
    learnUrl: D2,
    check: (p) =>
      p.deployment.architecture === 'hybrid' && p.hardware.topology === 'rack-aware'
        ? [{ id: 'ARC-001', severity: 'error', field: 'deployment.architecture', message: 'Rack-aware clusters are not supported with an external SAN; use a standard single-rack topology or drop the SAN.', learnUrl: D3 }]
        : [],
  },
  {
    id: 'ARC-002',
    learnUrl: D2,
    check: (p) =>
      p.deployment.architecture === 'hybrid'
        ? [{ id: 'ARC-002', severity: 'info', field: 'deployment.architecture', message: 'The external SAN is attached after the first deployment, as a day-2 operation: deploy a standard hyperconverged cluster first, then attach the SAN. Plan the SAN fabric, HBAs or NICs and ports up front. SAN connectivity is not managed by Network ATC.', learnUrl: D2 }]
        : [],
  },
  {
    id: 'ARC-003',
    learnUrl: D4,
    check: (p) =>
      p.deployment.architecture !== 'disaggregated' && p.hardware.nodes.length > 16
        ? [{ id: 'ARC-003', severity: 'error', field: 'hardware.nodes', message: 'A hyperconverged Azure Local instance supports 1 to 16 nodes; more nodes need the disaggregated architecture with an external SAN (up to 64).', learnUrl: D4 }]
        : [],
  },
  {
    id: 'ARC-004',
    learnUrl: D3,
    check: (p) => {
      if (p.deployment.architecture !== 'disaggregated') return [];
      const found = [];
      const perRack = Math.ceil(p.hardware.nodes.length / p.hardware.racks);
      if (perRack > 16)
        found.push({ id: 'ARC-004', severity: 'error' as const, field: 'hardware.racks', message: `A disaggregated rack holds up to 16 nodes; ${p.hardware.nodes.length} nodes in ${p.hardware.racks} rack(s) is ${perRack} per rack. Use more racks (up to 8).`, learnUrl: D3 });
      return found;
    },
  },
  {
    id: 'ARC-005',
    learnUrl: D1,
    check: (p) =>
      p.deployment.mode === 'disconnected'
        ? [{ id: 'ARC-005', severity: 'info', field: 'deployment.mode', message: 'Disconnected operations use a local Autonomous Cloud endpoint and need a dedicated three-node management cluster plus one or more workload clusters.', learnUrl: D1 }]
        : [],
  },
  {
    id: 'ARC-006',
    learnUrl: D3,
    check: (p) =>
      p.deployment.architecture === 'disaggregated' && p.hardware.topology === 'rack-aware'
        ? [{ id: 'ARC-006', severity: 'error', field: 'hardware.topology', message: 'Rack-aware is a hyperconverged layout; a disaggregated cluster spreads across racks instead.', learnUrl: D3 }]
        : [],
  },
  {
    id: 'ARC-007',
    learnUrl: D3,
    check: (p) =>
      p.hardware.topology === 'rack-aware'
        ? [{ id: 'ARC-007', severity: 'info', field: 'hardware.topology', message: 'Rack-aware needs an even number of nodes (up to 8) split across two rooms, less than 1 ms latency between the rooms, and RDMA storage traffic that stays at the ToR layer.', learnUrl: D3 }]
        : [],
  },
];