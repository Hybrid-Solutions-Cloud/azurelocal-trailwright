import type { Project } from '../model/schema';
import { slug } from './types';

// Attribute-safe text: markup characters and quotes are escaped, so a label can never become markup or a link.
const attr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '&#xa;');

// An uncompressed draw.io file: one container for the cluster, a box per node and a box per Network ATC intent.
export function buildTopologyDrawio(p: Project): string {
  const w = 220;
  const gap = 20;
  const nodeH = 40;
  const intentH = 70;
  const cells: string[] = [];
  let y = 50;

  const box = (id: string, label: string, style: string, h: number): void => {
    cells.push(
      `        <mxCell id="${id}" value="${attr(label)}" style="${style}" vertex="1" parent="cluster">\n          <mxGeometry x="40" y="${y}" width="${w}" height="${h}" as="geometry" />\n        </mxCell>`,
    );
    y += h + gap;
  };

  p.hardware.nodes.forEach((n, i) => box(`node-${i}`, n.name, 'rounded=1;whiteSpace=wrap;html=1;', nodeH));
  p.networking.intents.forEach((it, i) =>
    box(`intent-${i}`, `${it.name}\nTraffic: ${it.traffic.join(', ')}\nAdapters: ${it.adapters.join(', ')}`, 'rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;', intentH),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="trailwright" version="1.0">
  <diagram name="topology" id="${slug(p.meta.name)}">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="cluster" value="${attr(`Cluster: ${p.meta.name}`)}" style="swimlane;" vertex="1" parent="1">
          <mxGeometry x="20" y="20" width="${w + 80}" height="${y + 10}" as="geometry" />
        </mxCell>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}