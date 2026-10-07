import { useState, type FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { Field, SelectInput, TextInput } from '../components/Field';
import { createExampleProject } from '../examples/exampleLab';
import { createEmptyProject } from '../model/defaults';
import { ImportPanel } from '../components/ImportPanel';

const releaseOptions = ['2605', '2606', '2607', '2608', '2609'].map((v) => ({ value: v, label: v }));

export const ProjectScreen: FC = () => {
  const { project, setSection, replaceProject } = useProjectStore();
  const [confirmingExample, setConfirmingExample] = useState(false);

  return (
    <section className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Project and release</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <TextInput id="project-name" label="Project name" value={project.meta.name} onChange={(name) => setSection('meta', { ...project.meta, name })} />
        <SelectInput
          id="release-version"
          label="Release"
          value={project.release.version}
          onChange={(version) => setSection('release', { ...project.release, version: version as Project['release']['version'] })}
          options={releaseOptions}
        />
        <TextInput id="customer" label="Customer" value={project.project.customer} onChange={(customer) => setSection('project', { ...project.project, customer })} />
        <TextInput id="owner" label="Owner" value={project.project.owner} onChange={(owner) => setSection('project', { ...project.project, owner })} />
        <div className="md:col-span-2">
          <Field label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              value={project.project.notes}
              onChange={(e) => setSection('project', { ...project.project, notes: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
        </div>
      </div>
      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-lg font-medium text-slate-800">Where do you want to start?</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Start clean</p>
            <p className="text-xs text-slate-600">An empty design with generic defaults.</p>
            <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100" onClick={() => replaceProject(createEmptyProject('Untitled project'))}>
              Start a clean design
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Import from Surveyor or a saved project</p>
            <ImportPanel />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Use the bundled example</p>
            <p className="text-xs text-slate-600">Two nodes, Local Identity with Key Vault, three intents, a cloud witness and direct egress.</p>
            {confirmingExample ? (
              <div className="flex gap-2">
                <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100" onClick={() => { replaceProject(createExampleProject()); setConfirmingExample(false); }}>
                  Replace my design with the example
                </button>
                <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100" onClick={() => setConfirmingExample(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100" onClick={() => setConfirmingExample(true)}>
                Load the example project
              </button>
            )}
          </div>
        </div>
      </div>      <FindingsPanel prefixes={['release']} />
    </section>
  );
};