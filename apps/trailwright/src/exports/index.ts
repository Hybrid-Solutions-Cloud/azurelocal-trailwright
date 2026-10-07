import type { Project } from '../model/schema';
import { slug, type ExportKind } from './types';
import { buildHandoffMarkdown } from './handoffMarkdown';
import { buildHandoffPdf } from './handoffPdf';
import { buildInfrastructureYml } from './infrastructureYml';
import { buildArmParameters } from './armParameters';
import { buildBicepParam } from './bicepParam';
import { buildSchedulesCsv, buildSchedulesXlsx } from './schedules';
import { buildTopologyDrawio } from './topologyDrawio';
import { buildProjectJson } from './projectJson';

export type { ExportKind } from './types';
export { slug } from './types';
export { buildHandoffMarkdown, buildHandoffPdf, buildInfrastructureYml, buildArmParameters, buildBicepParam, buildSchedulesCsv, buildSchedulesXlsx, buildTopologyDrawio, buildProjectJson };
export { armParametersStillNeeded } from './armParameters';

const named = (suffix: string) => (p: Project) => `${slug(p.meta.name)}${suffix}`;

export const exportKinds: ExportKind[] = [
  { id: 'handoff-md', label: 'Design handoff (Markdown)', filename: named('-handoff.md'), mime: 'text/markdown', build: buildHandoffMarkdown },
  { id: 'handoff-pdf', label: 'Design handoff (PDF)', filename: named('-handoff.pdf'), mime: 'application/pdf', build: buildHandoffPdf },
  { id: 'infrastructure-yml', label: 'infrastructure.yml (Toolkit registry shape)', filename: () => 'infrastructure.yml', mime: 'application/yaml', build: buildInfrastructureYml },
  { id: 'arm-ad', label: 'ARM parameters, Active Directory', filename: named('-arm-active-directory.parameters.json'), mime: 'application/json', build: (p) => buildArmParameters(p, 'active-directory') },
  { id: 'arm-local', label: 'ARM parameters, Local Identity', filename: named('-arm-local-identity.parameters.json'), mime: 'application/json', build: (p) => buildArmParameters(p, 'local-identity') },
  { id: 'bicepparam', label: 'Bicep parameters', filename: named('.bicepparam'), mime: 'text/plain', build: buildBicepParam },
  { id: 'nodes-csv', label: 'Nodes schedule (CSV)', filename: named('-nodes.csv'), mime: 'text/csv', build: (p) => buildSchedulesCsv(p, 'nodes') },
  { id: 'vlans-csv', label: 'VLAN schedule (CSV)', filename: named('-vlans.csv'), mime: 'text/csv', build: (p) => buildSchedulesCsv(p, 'vlans') },
  { id: 'ip-plan-csv', label: 'IP plan schedule (CSV)', filename: named('-ip-plan.csv'), mime: 'text/csv', build: (p) => buildSchedulesCsv(p, 'ip-plan') },
  { id: 'schedules-xlsx', label: 'Schedules (Excel)', filename: named('-schedules.xlsx'), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: buildSchedulesXlsx },
  { id: 'topology-drawio', label: 'Topology (draw.io)', filename: named('-topology.drawio'), mime: 'application/xml', build: buildTopologyDrawio },
  { id: 'project-json', label: 'Project (JSON)', filename: named('.trailwright.json'), mime: 'application/json', build: buildProjectJson },
];