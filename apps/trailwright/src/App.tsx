import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { version } from '../package.json';
import { exportKinds } from './exports';
import { downloadFile } from './imports/download';
import { screens } from './screens/screens';
import { useProjectStore } from './model/store';
import { runRules } from './rules';
import { ProjectScreen } from './screens/ProjectScreen';
import { HardwareScreen } from './screens/HardwareScreen';
import { IdentityScreen } from './screens/IdentityScreen';
import { NetworkingScreen } from './screens/NetworkingScreen';
import { ConnectivityScreen } from './screens/ConnectivityScreen';
import { LandingZoneScreen } from './screens/LandingZoneScreen';
import { StorageScreen } from './screens/StorageScreen';
import { OperationsScreen } from './screens/OperationsScreen';
import { ReviewScreen } from './screens/ReviewScreen';
const built = {
  project: <ProjectScreen />,
  hardware: <HardwareScreen />,
  identity: <IdentityScreen />,
  networking: <NetworkingScreen />,
  connectivity: <ConnectivityScreen />,
  'landing-zone': <LandingZoneScreen />,
  storage: <StorageScreen />,
  operations: <OperationsScreen />,
  review: <ReviewScreen />,
} as const;

// Which findings belong to which screen, by the start of the field name.
const screenFields: Record<string, string[]> = {
  project: ['release'],
  hardware: ['hardware'],
  identity: ['identity'],
  networking: ['networking'],
  connectivity: ['connectivity'],
  'landing-zone': ['landingZone'],
  storage: ['storage'],
  operations: ['operations'],
  review: [],
};

export default function App() {
  const project = useProjectStore((s) => s.project);
  const setSection = useProjectStore((s) => s.setSection);
  const findings = runRules(project);
  const issues = (path: string) => findings.filter((f) => f.severity !== 'info' && (screenFields[path] ?? []).some((prefix) => f.field.startsWith(prefix))).length;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    'flex items-center rounded-md px-3 py-2 text-sm transition-colors ' + (isActive ? 'bg-blue-500/30 font-semibold text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white');
  const saveKind = exportKinds.find((k) => k.id === 'project-json');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:flex">
      <aside className="no-print shrink-0 overflow-y-auto bg-[#0f3057] text-white lg:sticky lg:top-0 lg:h-screen lg:w-72">
        <div className="border-b border-white/10 p-5">
          <span className="block text-xs uppercase tracking-widest text-blue-200">Azure Local</span>
          <span className="text-xl font-bold">Trailwright</span>
          <span className="mt-1 block text-xs text-blue-200">Design your cluster · v{version}</span>
        </div>
        <nav aria-label="Steps" className="space-y-1 p-3">
          {screens.map((screen, index) => (
            <NavLink key={screen.path} to={`/${screen.path}`} className={navClass}>
              <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">{index + 1}</span>
              <span className="flex-1">{screen.title}</span>
              {issues(screen.path) > 0 && (
                <span aria-label={`${issues(screen.path)} open issues`} className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {issues(screen.path)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <a
            href="https://azurelocal.cloud/azurelocal-surveyor/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded-md border border-blue-300/30 px-3 py-3 text-sm text-blue-200 hover:bg-white/10"
          >
            <strong className="mb-1 block text-xs">Sizing the cluster first?</strong>
            Open Azure Local Surveyor <ExternalLink className="inline h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <p className="mt-4 px-1 text-xs text-blue-300">Design record only: nothing here deploys anything</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print border-b border-gray-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-48 flex-1 text-xs text-gray-500">
              Active design
              <input
                aria-label="Active design name"
                className="input mt-1"
                value={project.meta.name}
                onChange={(e) => setSection('meta', { ...project.meta, name: e.target.value })}
              />
            </label>
            {saveKind && (
              <button type="button" className="action" onClick={() => downloadFile(saveKind.filename(project), saveKind.mime, saveKind.build(project))}>
                Save project
              </button>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Routes>
            <Route path="/" element={<Navigate to="/project" replace />} />
            {screens.map((screen) => (
              <Route key={screen.path} path={`/${screen.path}`} element={built[screen.path]} />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}