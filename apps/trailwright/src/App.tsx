import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { screens } from './screens/screens';
import { ScreenPlaceholder } from './screens/ScreenPlaceholder';
import type { Project } from './model/schema';

const sectionByPath: Record<string, keyof Project> = {
  project: 'project',
  hardware: 'hardware',
  identity: 'identity',
  networking: 'networking',
  connectivity: 'connectivity',
  'landing-zone': 'landingZone',
  storage: 'storage',
  operations: 'operations',
  review: 'findings',
};

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <ul className="space-y-2">
            {screens.map((screen) => (
              <li key={screen.path}>
                <NavLink
                  to={`/${screen.path}`}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'
                    }`
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
                element={<ScreenPlaceholder title={screen.title} section={sectionByPath[screen.path]} />}
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