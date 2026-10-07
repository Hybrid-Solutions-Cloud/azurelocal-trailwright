import type { Project } from '../model/schema';
import { buildTopology } from '../topology/model';
import { slug } from './types';

// Attribute-safe text: markup characters and quotes are escaped, so a label can never become markup or a link.
const attr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '&#xa;');

const style = { switch: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e8f0fe;strokeColor=#5f6368;verticalAlign=top;', node: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f8f9fa;strokeColor=#5f6368;verticalAlign=top;align=left;spacingLeft=6;', san: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f3e8fd;strokeColor=#5f6368;verticalAlign=top;', fc: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f1f3f4;strokeColor=#5f6368;verticalAlign=top;' };

// An uncompressed draw.io file from the same model as the live diagram: switches, SAN, nodes with their ports and a line per cabled port.
export function buildTopologyDrawio(p: Project): string {
  const t = buildTopology(p);
  const cells: string[] = [
    `        <mxCell id="title" value="${attr(`Cluster: ${p.meta.name}`)}" style="text;html=1;align=left;fontStyle=1;" vertex="1" parent="1">\n          <mxGeometry x="20" y="0" width="400" height="20" as="geometry" />\n        </mxCell>`,
  ];
  for (const s of t.shapes) {
    const label = [s.title, ...s.lines].join('\n');
    cells.push(`        <mxCell id="${s.id}" value="${attr(label)}" style="${style[s.kind]}" vertex="1" parent="1">\n          <mxGeometry x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="${Math.round(s.w)}" height="${Math.round(s.h)}" as="geometry" />\n        </mxCell>`);
  }
  for (const e of t.edges) {
    const [first, ...rest] = e.points;
    const last = rest[rest.length - 1] ?? first;
    const via = rest.slice(0, -1);
    const waypoints = via.length ? `\n            <Array as="points">${via.map((pt) => `<mxPoint x="${Math.round(pt[0])}" y="${Math.round(pt[1])}" />`).join('')}</Array>` : '';
    cells.push(`        <mxCell id="${e.id}" value="${attr(e.label ?? '')}" style="endArrow=none;html=1;strokeColor=${e.color};fontColor=${e.color};fontSize=10;${e.dashed ? 'dashed=1;' : ''}" edge="1" parent="1">\n          <mxGeometry relative="1" as="geometry">\n            <mxPoint x="${Math.round(first[0])}" y="${Math.round(first[1])}" as="sourcePoint" />\n            <mxPoint x="${Math.round(last[0])}" y="${Math.round(last[1])}" as="targetPoint" />${waypoints}\n          </mxGeometry>\n        </mxCell>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="trailwright" version="1.0">
  <diagram name="topology" id="${slug(p.meta.name)}">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageWidth="${Math.max(850, Math.round(t.width + 80))}" pageHeight="${Math.max(1100, Math.round(t.height + 80))}">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}
