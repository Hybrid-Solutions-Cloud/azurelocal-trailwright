import { useState, type ChangeEvent, type FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { runRules } from '../rules';
import type { Finding } from '../rules/types';
import { exportKinds } from '../exports';
import { downloadFile, readFileText } from '../imports/download';
import { parseProjectFile } from '../imports/projectFile';
import { applyPatch, parseSurveyorPlan, previewConflicts, type ImportPatch } from '../imports/surveyor';

type Pending = { mode: 'project'; project: Project } | { mode: 'surveyor'; patch: ImportPatch };

const groups: { severity: Finding['severity']; title: string }[] = [
  { severity: 'error', title: 'Errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Information' },
];

export const ReviewScreen: FC = () => {
  const { project, replaceProject } = useProjectStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const findings = runRules(project);
  const count = (severity: Finding['severity']) => findings.filter((f) => f.severity === severity).length;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPending(null);
    setImportError(null);
    try {
      const text = await readFileText(file);
      const asProject = parseProjectFile(text);
      if (asProject.ok) return setPending({ mode: 'project', project: asProject.project });
      const asSurveyor = parseSurveyorPlan(text);
      if (asSurveyor.ok) return setPending({ mode: 'surveyor', patch: asSurveyor.patch });
      setImportError(`Not a Trailwright project (${asProject.error}) and not a Surveyor plan (${asSurveyor.error}).`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

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

  const conflicts = pending?.mode === 'surveyor' ? previewConflicts(project, pending.patch) : [];
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
        <label htmlFor="import-file" className="block text-sm font-medium text-slate-700">
          Open a Surveyor plan or a Trailwright project (JSON)
        </label>
        <input id="import-file" type="file" accept=".json,application/json" onChange={(e) => void onFile(e)} />

        {pending?.mode === 'project' && (
          <div className="space-y-2 rounded-md border border-slate-200 p-4">
            <p className="text-sm">Replace the current design with &ldquo;{pending.project.meta.name}&rdquo;?</p>
            <div className="flex gap-2">
              <button type="button" className={button} onClick={() => { replaceProject(pending.project); setPending(null); }}>
                Replace design
              </button>
              <button type="button" className={button} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {pending?.mode === 'surveyor' && (
          <div className="space-y-2 rounded-md border border-slate-200 p-4">
            {conflicts.length === 0 ? (
              <p className="text-sm">No conflicts</p>
            ) : (
              <>
                <p className="text-sm font-medium">Conflicts</p>
                <ul className="list-disc pl-5 text-sm">
                  {conflicts.map((c) => (
                    <li key={c.field}>{`${c.field}: ${c.current} -> ${c.incoming}`}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex gap-2">
              <button type="button" className={button} onClick={() => { replaceProject(applyPatch(project, pending.patch)); setPending(null); }}>
                Apply import
              </button>
              <button type="button" className={button} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {importError && <p role="alert" className="text-sm text-red-700">{importError}</p>}
      </div>
    </section>
  );
};