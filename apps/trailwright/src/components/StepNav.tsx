import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../model/store';
import { visibleSteps } from '../steps/steps';

// Back and next between the steps that apply to this design, plus the confirm gate where a step has one.
export const StepNav: FC<{ path: string; gate?: boolean }> = ({ path, gate }) => {
  const project = useProjectStore((s) => s.project);
  const setSection = useProjectStore((s) => s.setSection);
  const list = visibleSteps(project);
  const index = list.findIndex((s) => s.path === path);
  const previous = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const confirmed = project.confirmed.includes(path);

  const toggle = () => setSection('confirmed', confirmed ? project.confirmed.filter((p) => p !== path) : [...project.confirmed, path]);

  return (
    <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
      <div>{previous && <Link to={`/${previous.path}`} className="action-secondary">Back: {previous.title}</Link>}</div>
      {gate && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={confirmed} onChange={toggle} />
          I have checked this step
        </label>
      )}
      <div>{next && <Link to={`/${next.path}`} className="action">Next: {next.title}</Link>}</div>
    </div>
  );
};