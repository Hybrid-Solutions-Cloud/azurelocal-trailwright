import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { screens } from './screens/screens';
import { ScreenPlaceholder } from './screens/ScreenPlaceholder';
import { ProjectScreen } from './screens/ProjectScreen';
import { HardwareScreen } from './screens/HardwareScreen';
import { IdentityScreen } from './screens/IdentityScreen';
import { NetworkingScreen } from './screens/NetworkingScreen';
import type { Project } from './model/schema';

// Screens that are not built yet show their section of the project as JSON.
const placeholderSection: Record<string, keyof Project> = {
  connectivity: 'connectivity',
  'landing-zone': 'landingZone',
  storage: 'storage',
  operations: 'operations',
  review: 'findings',
};

const built = {
  project: <ProjectScreen />,
  hardware: <HardwareScreen />,
  identity: <IdentityScreen />,
  networking: <NetworkingScreen />,
} as const;

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="Steps" className="w-64 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <ul className="space-y-2">
            {screens.map((screen) => (
              <li key={screen.path}>
                <NavLink
                  to={`/${screen.path}`}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`
                  }
                >
                  {screen.title}
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
                element={
                  screen.path in built ? (
                    built[screen.path as keyof typeof built]
                  ) : (
                    <ScreenPlaceholder title={screen.title} section={placeholderSection[screen.path]} />
                  )
                }
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