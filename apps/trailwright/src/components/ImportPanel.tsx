import { useState, type ChangeEvent, type FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { readFileText } from '../imports/download';
import { parseProjectFile } from '../imports/projectFile';
import { applyPatch, parseSurveyorPlan, previewConflicts, type ImportPatch } from '../imports/surveyor';

type Pending = { mode: 'project'; project: Project } | { mode: 'surveyor'; patch: ImportPatch };

const button = 'action-secondary';

// Open a Surveyor plan or a saved Trailwright project. Nothing is applied until the person confirms.
export const ImportPanel: FC = () => {
  const { project, replaceProject } = useProjectStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  const conflicts = pending?.mode === 'surveyor' ? previewConflicts(project, pending.patch) : [];

  return (
    <div className="space-y-3">
      <label htmlFor="import-file" className="block text-sm font-medium text-gray-700">
        Open a Surveyor plan or a Trailwright project (JSON)
      </label>
      <input id="import-file" type="file" accept=".json,application/json" onChange={(e) => void onFile(e)} />

      {pending?.mode === 'project' && (
        <div className="space-y-2 rounded-md border border-gray-200 p-4">
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
        <div className="space-y-2 rounded-md border border-gray-200 p-4">
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
  );
};