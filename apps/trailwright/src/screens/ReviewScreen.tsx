import { useState, type FC } from 'react';
import { useProjectStore } from '../model/store';
import { runRules } from '../rules';
import type { Finding } from '../rules/types';
import { exportKinds } from '../exports';
import { downloadFile } from '../imports/download';
import { ImportPanel } from '../components/ImportPanel';

const groups: { severity: Finding['severity']; title: string }[] = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Information' },
];

export const ReviewScreen: FC = () => {
  const { project } = useProjectStore();
  const [exportError, setExportError] = useState<string | null>(null);
  const findings = runRules(project);
  const count = (severity: Finding['severity']) => findings.filter((f) => f.severity === severity).length;

  const runExport = (kind: (typeof exportKinds)[number]) => {
    setExportError(null);
    try {
      void Promise.resolve(kind.build(project)).then(
        (data) => downloadFile(kind.filename(project), kind.mime, data),
        (e: unknown) => setExportError(`${kind.label}: ${e instanceof Error ? e.message : String(e)}`),
      );
    } catch (e) {
      setExportError(`${kind.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const button = 'rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100';

  return (
    <section className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Review and export</h1>
      <p role="status" className="text-sm text-slate-700">
        {count('error')} errors, {count('warning')} warnings, {count('info')} information
      </p>

      <div className="space-y-4">
        {groups.map(({ severity, title }) => {
          const list = findings.filter((f) => f.severity === severity);
          if (list.length === 0) return null;
          return (
            <div key={severity}>
              <h2 className="mb-2 text-lg font-medium text-slate-800">{title}</h2>
              <ul className="space-y-2">
                {list.map((f) => (
                  <li key={`${f.id}-${f.field}`} className="text-sm text-slate-800">
                    <code className="text-xs">{f.field}</code> {f.message}{' '}
                    <a href={f.learnUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                      Microsoft Learn
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800">Export</h2>
        <div className="flex flex-wrap gap-2">
          {exportKinds.map((kind) => (
            <button key={kind.id} type="button" className={button} onClick={() => runExport(kind)}>
              {kind.label}
            </button>
          ))}
        </div>
        {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-slate-800">Import</h2>
        <ImportPanel />
      </div>
    </section>
  );
};