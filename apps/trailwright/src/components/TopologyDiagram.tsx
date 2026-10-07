import type { FC } from 'react';
import { useMemo } from 'react';
import { useProjectStore } from '../model/store';
import { buildTopology, type Shape } from '../topology/model';

const fill: Record<Shape['kind'], string> = { switch: '#e8f0fe', node: '#f8f9fa', san: '#f3e8fd', fc: '#f1f3f4' };

// The cabling as designed: switches on top, each node below with a line for every cabled port.
export const TopologyDiagram: FC = () => {
  const { project } = useProjectStore();
  const t = useMemo(() => buildTopology(project), [project]);
  if (project.hardware.nodes.length === 0) return null;
  return (
    <figure className="overflow-x-auto" aria-label="Topology diagram">
      <svg role="img" aria-label="Cabling diagram of the design" viewBox={`0 0 ${t.width} ${t.height}`} width={t.width} height={t.height} className="max-w-none">
        {t.edges.map((e) => (
          <g key={e.id}>
            <polyline points={e.points.map((pt) => pt.join(',')).join(' ')} fill="none" stroke={e.color} strokeWidth={1.5} strokeDasharray={e.dashed ? '5 4' : undefined} />
            {e.label && <text x={e.points[0][0] + (e.points[e.points.length - 1][0] - e.points[0][0]) * 0.3 + 3} y={e.points[0][1] + (e.points[e.points.length - 1][1] - e.points[0][1]) * 0.3} fontSize={9} fill={e.color} stroke="white" strokeWidth={3} paintOrder="stroke">{e.label}</text>}
          </g>
        ))}
        {t.shapes.map((s) => (
          <g key={s.id}>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={6} fill={fill[s.kind]} stroke="#5f6368" />
            <text x={s.x + s.w / 2} y={s.y + 16} fontSize={12} fontWeight={600} textAnchor="middle" fill="#202124">{s.title}</text>
            {s.lines.map((l, i) => <text key={i} x={s.x + 8} y={s.y + 32 + i * 15} fontSize={10} fill="#3c4043" textAnchor={s.kind === 'node' ? 'start' : 'middle'} dx={s.kind === 'node' ? 0 : s.w / 2 - 8}>{l}</text>)}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
        {t.legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1"><span style={{ background: l.color }} className="inline-block h-2 w-4 rounded" />{l.label}</span>
        ))}
      </figcaption>
    </figure>
  );
};
