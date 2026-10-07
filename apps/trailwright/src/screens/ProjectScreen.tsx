import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { FindingsPanel } from '../components/FindingsPanel';
import { Field, SelectInput, TextInput } from '../components/Field';

const releaseOptions = ['2605', '2606', '2607', '2608', '2609'].map((v) => ({ value: v, label: v }));

export const ProjectScreen: FC = () => {
  const { project, setSection } = useProjectStore();

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
      <FindingsPanel prefixes={['release']} />
    </section>
  );
};