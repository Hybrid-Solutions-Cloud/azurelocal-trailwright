import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import { runRules } from '../rules';
import type { Finding } from '../rules/types';

const severityOrder: Finding['severity'][] = ['error', 'warning', 'info'];

const severityStyles: Record<Finding['severity'], string> = {
  error: 'border-l-red-600 bg-red-50',
  warning: 'border-l-amber-500 bg-amber-50',
  info: 'border-l-blue-500 bg-blue-50',
};

// Findings of the release-aware rules for the fields this screen owns, each with its Microsoft Learn source.
export const FindingsPanel: FC<{ prefixes: string[] }> = ({ prefixes }) => {
  const project = useProjectStore((state) => state.project);
  const findings = runRules(project).filter((f) => prefixes.some((prefix) => f.field.startsWith(prefix)));

  if (findings.length === 0) {
    return (
      <aside aria-label="Findings" className="rounded-md border border-gray-200 p-4">
        <p className="text-sm text-gray-600">No findings for this screen.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Findings" className="space-y-4">
      {severityOrder.map((severity) => {
        const group = findings.filter((f) => f.severity === severity);
        if (group.length === 0) return null;
        return (
          <div key={severity} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{severity}</h3>
            <ul className="space-y-2">
              {group.map((finding) => (
                <li key={finding.id} className={`rounded-r-md border-l-4 p-3 text-sm ${severityStyles[severity]}`}>
                  <p className="font-medium text-gray-800">{finding.message}</p>
                  <a href={finding.learnUrl} target="_blank" rel="noopener noreferrer" className="inline-block pt-1 text-blue-700 hover:underline">
                    Microsoft Learn
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </aside>
  );
};