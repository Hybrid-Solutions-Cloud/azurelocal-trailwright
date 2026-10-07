import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
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
  const findings = runRules(project);
  const issues = (path: string) => findings.filter((f) => f.severity !== 'info' && (screenFields[path] ?? []).some((prefix) => f.field.startsWith(prefix))).length;
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="Steps" className="w-72 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <p className="mb-4 text-lg font-semibold text-slate-900">Azure Local Trailwright</p>
          <ul className="space-y-2">
            {screens.map((screen, index) => (
              <li key={screen.path}>
                <NavLink
                  to={`/${screen.path}`}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`
                  }
                >
                  <span className="mr-2 inline-block w-5 text-xs opacity-70">{index + 1}</span>
                  {screen.title}
                  {issues(screen.path) > 0 && (
                    <span aria-label={` open issues`} className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {issues(screen.path)}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/project" replace />} />
            {screens.map((screen) => (
              <Route
                key={screen.path}
                path={`/${screen.path}`}
                element={built[screen.path]}
              />
            ))}
          </Routes>
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-slate-50 p-2 text-center text-xs text-slate-500">
        Design record only: nothing here deploys anything
      </footer>
    </div>
  );
}