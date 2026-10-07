import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { version } from '../package.json';
import { exportKinds } from './exports';
import { downloadFile } from './imports/download';
import { steps, visibleSteps } from './steps/steps';
import { StepNav } from './components/StepNav';
import { useProjectStore } from './model/store';
import { runRules } from './rules';
import { ProjectScreen } from './screens/ProjectScreen';
import { DeploymentScreen } from './screens/DeploymentScreen';
import { HardwareScreen } from './screens/HardwareScreen';
import { IdentityScreen } from './screens/IdentityScreen';
import { NetworkingScreen } from './screens/NetworkingScreen';
import { NetworkDesignScreen } from './screens/NetworkDesignScreen';
import { ConnectivityScreen } from './screens/ConnectivityScreen';
import { LandingZoneScreen } from './screens/LandingZoneScreen';
import { StorageScreen } from './screens/StorageScreen';
import { ProvisioningScreen } from './screens/ProvisioningScreen';
import { InfrastructureScreen } from './screens/InfrastructureScreen';
import { SecurityScreen } from './screens/SecurityScreen';
import { OperationsScreen } from './screens/OperationsScreen';
import { ReviewScreen } from './screens/ReviewScreen';

const built: Record<string, JSX.Element> = {
  project: <ProjectScreen />,
  deployment: <DeploymentScreen />,
  hardware: <HardwareScreen />,
  identity: <IdentityScreen />,
  networking: <NetworkingScreen />,
  'network-design': <NetworkDesignScreen />,
  connectivity: <ConnectivityScreen />,
  'landing-zone': <LandingZoneScreen />,
  storage: <StorageScreen />,
  provisioning: <ProvisioningScreen />,
  infrastructure: <InfrastructureScreen />,
  security: <SecurityScreen />,
  operations: <OperationsScreen />,
  review: <ReviewScreen />,
};
export default function App() {
  const project = useProjectStore((s) => s.project);
  const setSection = useProjectStore((s) => s.setSection);
  const findings = runRules(project);
  const shown = visibleSteps(project);
  const issues = (fields: string[]) => findings.filter((f) => f.severity !== 'info' && fields.some((prefix) => f.field.startsWith(prefix))).length;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    'flex items-center rounded-md px-3 py-2 text-sm transition-colors ' + (isActive ? 'bg-blue-500/30 font-semibold text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white');
  const saveKind = exportKinds.find((k) => k.id === 'project-json');
  let lastGroup = '';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:flex">
      <aside className="no-print shrink-0 overflow-y-auto bg-[#0f3057] text-white lg:sticky lg:top-0 lg:h-screen lg:w-72">
        <div className="border-b border-white/10 p-5">
          <span className="block text-xs uppercase tracking-widest text-blue-200">Azure Local</span>
          <span className="text-xl font-bold">Trailwright</span>
          <span className="mt-1 block text-xs text-blue-200">Design your cluster · v{version}</span>
        </div>
        <nav aria-label="Steps" className="space-y-1 p-3">
          {shown.map((step, index) => {
            const heading = step.group !== lastGroup ? step.group : '';
            lastGroup = step.group;
            const open = issues(step.fields);
            return (
              <div key={step.path}>
                {heading && <p className="px-3 pb-1 pt-3 text-xs uppercase tracking-wide text-blue-300">{heading}</p>}
                <NavLink to={`/${step.path}`} className={navClass}>
                  <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">{index + 1}</span>
                  <span className="flex-1">{step.title}</span>
                  {step.gate && project.confirmed.includes(step.path) && <span aria-label="confirmed" className="ml-2 text-xs text-green-300">✓</span>}
                  {open > 0 && (
                    <span aria-label={`${open} open issues`} className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {open}
                    </span>
                  )}
                </NavLink>
              </div>
            );
          })}
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
              <input aria-label="Active design name" className="input mt-1" value={project.meta.name} onChange={(e) => setSection('meta', { ...project.meta, name: e.target.value })} />
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
            {steps.map((step) => (
              <Route
                key={step.path}
                path={`/${step.path}`}
                element={
                  step.visible(project) ? (
                    <>
                      {built[step.path]}
                      <StepNav path={step.path} gate={step.gate} />
                    </>
                  ) : (
                    <section className="panel space-y-3">
                      <h1 className="text-2xl font-semibold text-gray-900">{step.title}</h1>
                      <p className="text-sm text-gray-700">{step.hiddenBecause ?? 'This step does not apply to your design.'}</p>
                      <Navigate to={`/${shown[0].path}`} replace />
                    </section>
                  )
                }
              />
            ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}