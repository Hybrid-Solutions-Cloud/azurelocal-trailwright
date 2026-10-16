import { useState, type ChangeEvent, type FC } from 'react';
import { useProjectStore } from '../model/store';
import { readFileText, downloadFile } from '../imports/download';
import { parseSnapshot, type Snapshot } from '../asbuilt/snapshot';
import { buildCompareCsv, buildCompareMarkdown, compareAsBuilt, summarize, type Status } from '../asbuilt/compare';
import { slug } from '../exports/types';

const tone: Record<Status, string> = {
  match: 'bg-green-100 text-green-800',
  drift: 'bg-amber-100 text-amber-900',
  missing: 'bg-red-100 text-red-800',
  'not-captured': 'bg-gray-100 text-gray-700',
};

// Compare the design record with what was built: load an as-built snapshot (as-built-snapshot.v1) and see the differences.
export const AsBuiltScreen: FC = () => {
  const { project } = useProjectStore();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setError(null);
    try {
      // Read the file before the input is reset (clearing it first can leave the File unreadable on some browsers).
      const parsed = parseSnapshot(await readFileText(file));
      if (parsed.ok) setSnapshot(parsed.snapshot);
      else {
        setSnapshot(null);
        setError(parsed.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      input.value = '';
    }
  };

  const rows = snapshot ? compareAsBuilt(project, snapshot) : [];
  const counts = summarize(rows);

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">As-built compare</h1>
      <p className="text-sm text-gray-700">
        Compare this design with the cluster that was built. Load an as-built snapshot (schema <code>as-built-snapshot.v1</code>) produced from an Azure Local Ranger run or by your own script; the file stays in your browser.
        Rows are <strong>match</strong>, <strong>drift</strong> (different, or built but not designed), <strong>missing</strong> (designed but not found) or <strong>not captured</strong> (the snapshot has no data for that area).
      </p>
      <div>
        <label htmlFor="snapshot-file" className="block text-sm font-medium text-gray-700">
          As-built snapshot (JSON)
        </label>
        <input id="snapshot-file" type="file" accept=".json,application/json" onChange={(e) => void onFile(e)} />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      {snapshot && (
        <div className="space-y-4">
          <p role="status" className="text-sm text-gray-800">
            {counts.match} match, {counts.drift} drift, {counts.missing} missing, {counts['not-captured']} not captured
            {snapshot.source.tool ? ` (source: ${snapshot.source.tool}${snapshot.source.version ? ` ${snapshot.source.version}` : ''})` : ''}
          </p>
          <div className="flex gap-2">
            <button type="button" className="action-secondary" onClick={() => downloadFile(`${slug(project.meta.name)}-as-built-compare.csv`, 'text/csv', buildCompareCsv(rows))}>
              Download compare (CSV)
            </button>
            <button type="button" className="action-secondary" onClick={() => downloadFile(`${slug(project.meta.name)}-as-built-compare.md`, 'text/markdown', buildCompareMarkdown(project, rows))}>
              Download compare (Markdown)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <th className="py-2 pr-3">Area</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Design</th>
                  <th className="py-2 pr-3">As-built</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 align-top">
                    <td className="py-1 pr-3">{r.area}</td>
                    <td className="py-1 pr-3">{r.item}</td>
                    <td className="py-1 pr-3">{r.design}</td>
                    <td className="py-1 pr-3">{r.asBuilt}</td>
                    <td className="py-1">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone[r.status]}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
